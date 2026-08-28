import asyncio
import html as html_lib
import os
import json
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, '.env'))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("apexquant")

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'gemini')
LLM_MODEL = os.environ.get('LLM_MODEL', 'gemini-2.5-flash')

TWELVEDATA_API_KEY = os.environ.get('TWELVEDATA_API_KEY', 'e05d2f88dfe9497fa9babf09926b4bb0')
SOSO_API_KEY = os.environ.get('SOSO_API_KEY', 'SOSO-228e1006991f4fc18252223a26f4f9db')
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', 'sk-19318b9ea0d341e4b7eadeae124b2737')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="ApexQuant Elite API")
api = APIRouter(prefix="/api")


# ----------------------------------------------------------------------------
# Generic Firestore-like document store backed by MongoDB
# ----------------------------------------------------------------------------
STORE = 'fsdocs'


class DocPayload(BaseModel):
    path: str
    data: Dict[str, Any] = Field(default_factory=dict)


def _clean(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    doc.pop('_id', None)
    return doc


def _parent(path: str) -> str:
    return '/'.join(path.split('/')[:-1])


@api.put('/store/doc')
async def set_doc(payload: DocPayload):
    now = datetime.now(timezone.utc).isoformat()
    await db[STORE].update_one(
        {'path': payload.path},
        {'$set': {
            'path': payload.path,
            'parent': _parent(payload.path),
            'docId': payload.path.split('/')[-1],
            'data': payload.data,
            'updatedAt': now,
        }},
        upsert=True,
    )
    return {'ok': True, 'path': payload.path}


@api.patch('/store/doc')
async def update_doc(payload: DocPayload):
    now = datetime.now(timezone.utc).isoformat()
    sets = {f'data.{k}': v for k, v in payload.data.items()}
    sets['updatedAt'] = now
    sets['path'] = payload.path
    sets['parent'] = _parent(payload.path)
    sets['docId'] = payload.path.split('/')[-1]
    await db[STORE].update_one({'path': payload.path}, {'$set': sets}, upsert=True)
    return {'ok': True, 'path': payload.path}


@api.delete('/store/doc')
async def delete_doc(path: str = Query(...)):
    await db[STORE].delete_one({'path': path})
    return {'ok': True, 'path': path}


@api.get('/store/doc')
async def get_doc(path: str = Query(...)):
    doc = await db[STORE].find_one({'path': path})
    doc = _clean(doc)
    if not doc:
        return {'exists': False, 'data': None, 'updatedAt': None}
    return {'exists': True, 'data': doc.get('data', {}), 'updatedAt': doc.get('updatedAt')}


@api.get('/store/collection')
async def get_collection(path: str = Query(...)):
    cursor = db[STORE].find({'parent': path})
    docs: List[dict] = []
    async for d in cursor:
        d = _clean(d)
        docs.append({'id': d.get('docId'), 'data': d.get('data', {}), 'updatedAt': d.get('updatedAt')})
    return {'docs': docs, 'count': len(docs)}


# ----------------------------------------------------------------------------
# LLM proxy - accepts Google Generative Language native payload shape
# and returns a Gemini-native shaped response.
# ----------------------------------------------------------------------------
class LlmRequest(BaseModel):
    contents: List[Dict[str, Any]] = Field(default_factory=list)
    generationConfig: Optional[Dict[str, Any]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    systemInstruction: Optional[Dict[str, Any]] = None


def _extract(payload: LlmRequest):
    texts: List[str] = []
    images: List[str] = []
    for content in payload.contents or []:
        for part in content.get('parts', []) or []:
            if not isinstance(part, dict):
                continue
            if 'text' in part and part['text']:
                texts.append(str(part['text']))
            inline = part.get('inlineData') or part.get('inline_data')
            if inline and inline.get('data'):
                images.append(inline['data'])
    return '\n\n'.join(texts), images


GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-3.6-flash')
# Each Gemini model carries its own free-tier quota bucket. When one is exhausted
# (HTTP 429) we transparently roll over to the next so the app keeps working.
GEMINI_MODELS = [
    m.strip() for m in os.environ.get(
        'GEMINI_MODELS',
        'gemini-3.6-flash,gemini-3.5-flash,gemini-3-flash-preview,'
        'gemini-3.1-flash-lite,gemini-flash-lite-latest'
    ).split(',') if m.strip()
]
if GEMINI_MODEL not in GEMINI_MODELS:
    GEMINI_MODELS.insert(0, GEMINI_MODEL)
GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
# How many models to also attempt WITH google_search grounding before giving up on it.
GROUNDING_ATTEMPTS = int(os.environ.get('GROUNDING_ATTEMPTS', '2'))


def _normalize_gemini(data: dict) -> dict:
    """Merge every text part of the first candidate into parts[0].text so the
    frontend's `candidates[0].content.parts[0].text` access always works even
    with thinking models that emit multiple parts."""
    try:
        cands = data.get('candidates') or []
        if not cands:
            return data
        cand = cands[0]
        parts = (cand.get('content') or {}).get('parts') or []
        texts = [p['text'] for p in parts if isinstance(p, dict) and p.get('text')]
        if texts:
            cand['content']['parts'] = [{'text': '\n'.join(texts)}]
    except Exception:
        pass
    return data


async def _call_gemini(body: dict, model: str) -> dict:
    url = f'{GEMINI_BASE}/{model}:generateContent?key={GEMINI_API_KEY}'
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(url, headers={'Content-Type': 'application/json'}, json=body)
    try:
        data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail=f'Gemini tidak merespon ({r.status_code}).')
    return {'status': r.status_code, 'data': data}


async def _gemini_with_fallback(body: Dict[str, Any], tools: Optional[list]) -> dict:
    """Try (model x grounding) combinations until one returns candidates."""
    attempts = []
    if tools:
        for m in GEMINI_MODELS[:GROUNDING_ATTEMPTS]:
            attempts.append((m, dict(body, tools=tools)))
    for m in GEMINI_MODELS:
        attempts.append((m, body))

    last_err = 'unknown'
    for model, attempt_body in attempts:
        try:
            res = await _call_gemini(attempt_body, model)
        except HTTPException as e:
            last_err = str(e.detail)
            continue
        if res['status'] == 200 and res['data'].get('candidates'):
            data = _normalize_gemini(res['data'])
            data['_model'] = model
            data['_grounded'] = bool(attempt_body.get('tools'))
            return data
        err = (res['data'].get('error') or {})
        last_err = err.get('message') or json.dumps(res['data'])[:400]
        logger.warning(
            f'Gemini {model} (grounded={bool(attempt_body.get("tools"))}) '
            f'failed {res["status"]}: {last_err[:160]}'
        )
    raise HTTPException(status_code=502, detail=f'AI gagal merespon: {last_err}')


# ----------------------------------------------------------------------------
# Real-time news grounding (free, keyless): Google News RSS headlines +
# ForexFactory economic calendar. Used to genuinely ground the AI in today's
# macro releases when Google Search grounding is unavailable on the API tier.
# ----------------------------------------------------------------------------
NEWS_RSS = 'https://news.google.com/rss/search'
FF_CALENDAR = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
_ground_cache: Dict[str, Any] = {}
GROUND_TTL = 600  # seconds

ASSET_QUERIES = {
    'BTC': 'bitcoin OR crypto market', 'ETH': 'ethereum OR crypto market',
    'SOL': 'solana OR crypto market', 'XRP': 'xrp ripple',
    'XAU': 'gold price OR XAUUSD', 'XAG': 'silver price',
    'EUR': 'euro ECB', 'GBP': 'british pound BoE', 'JPY': 'japanese yen BoJ',
    'AUD': 'australian dollar RBA', 'CAD': 'canadian dollar BoC',
    'CHF': 'swiss franc SNB', 'NZD': 'new zealand dollar RBNZ',
    'USD': 'US dollar federal reserve',
}


def _asset_hint(text: str) -> str:
    up = (text or '').upper()
    hits = [q for k, q in ASSET_QUERIES.items() if k in up]
    seen, out = set(), []
    for h in hits:
        if h not in seen:
            seen.add(h)
            out.append(h)
    return ' OR '.join(out[:3]) if out else 'forex market OR federal reserve'


def _strip_tags(s: str) -> str:
    s = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '', s)
    return html_lib.unescape(s).strip()


async def _fetch_headlines(query: str, limit: int = 12) -> List[str]:
    params = {'q': f'{query} when:2d', 'hl': 'en-US', 'gl': 'US', 'ceid': 'US:en'}
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(NEWS_RSS, params=params, headers=UA)
        if r.status_code != 200:
            return []
        items = re.findall(r'<item>(.*?)</item>', r.text, flags=re.S)
        out = []
        for it in items[:limit]:
            t = re.search(r'<title>(.*?)</title>', it, flags=re.S)
            d = re.search(r'<pubDate>(.*?)</pubDate>', it, flags=re.S)
            if t:
                title = _strip_tags(t.group(1))
                when = _strip_tags(d.group(1))[:16] if d else ''
                out.append(f'- [{when}] {title}')
        return out
    except Exception as e:
        logger.warning(f'headlines failed: {e}')
        return []


async def _fetch_calendar(limit: int = 14) -> List[str]:
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(FF_CALENDAR, headers=UA)
        if r.status_code != 200:
            return []
        events = r.json()
        now = datetime.now(timezone.utc)
        rows = []
        for ev in events:
            impact = (ev.get('impact') or '').lower()
            if impact not in ('high', 'medium'):
                continue
            try:
                when = datetime.fromisoformat(ev['date'])
            except Exception:
                continue
            delta = (when - now).total_seconds() / 3600.0
            if not (-36 <= delta <= 96):
                continue
            rows.append((
                when,
                f"- {when.strftime('%a %d %b %H:%M UTC%z')} | {ev.get('country', '')} | "
                f"{ev.get('title', '')} | impact={ev.get('impact')} | "
                f"forecast={ev.get('forecast') or '-'} | previous={ev.get('previous') or '-'}"
            ))
        rows.sort(key=lambda x: x[0])
        return [r for _, r in rows[:limit]]
    except Exception as e:
        logger.warning(f'calendar failed: {e}')
        return []


async def build_grounding_context(prompt_text: str) -> str:
    hint = _asset_hint(prompt_text)
    cached = _ground_cache.get(hint)
    now = datetime.now(timezone.utc).timestamp()
    if cached and now - cached['ts'] < GROUND_TTL:
        return cached['text']

    headlines, calendar = await asyncio.gather(
        _fetch_headlines(hint), _fetch_calendar()
    )
    if not headlines and not calendar:
        return ''

    stamp = datetime.now(timezone.utc).strftime('%A, %d %B %Y %H:%M UTC')
    parts = [
        '===== DATA GROUNDING REAL-TIME (WAJIB DIPAKAI) =====',
        f'Waktu server saat ini: {stamp}',
        '',
        'KALENDER EKONOMI (impact High/Medium, -36 jam s/d +96 jam):',
    ]
    parts += calendar or ['- (tidak ada rilis high/medium pada jendela ini)']
    parts += ['', 'HEADLINE BERITA TERBARU (48 jam terakhir):']
    parts += headlines or ['- (headline tidak tersedia)']
    parts += [
        '',
        'INSTRUKSI: Gunakan HANYA data di atas sebagai sumber fakta berita/kalender. '
        'Jangan mengarang rilis data atau tanggal. Jika sebuah event high-impact jatuh '
        'dalam <12 jam, sebutkan secara eksplisit sebagai risiko utama pada bagian '
        'katalis/fundamental.',
        '===== AKHIR DATA GROUNDING =====',
        '',
    ]
    text = '\n'.join(parts)
    _ground_cache[hint] = {'ts': now, 'text': text}
    return text


def _inject_context(contents: List[Dict[str, Any]], context: str) -> List[Dict[str, Any]]:
    """Prepend the grounding block to the first text part of the last user turn."""
    out = json.loads(json.dumps(contents))
    for content in reversed(out):
        for part in content.get('parts', []) or []:
            if isinstance(part, dict) and part.get('text'):
                part['text'] = context + part['text']
                return out
    out.insert(0, {'role': 'user', 'parts': [{'text': context}]})
    return out


@api.get('/news/context')
async def news_context(hint: str = 'forex'):
    text = await build_grounding_context(hint)
    return {'ok': bool(text), 'context': text}


# Cached probe: is native Google Search grounding usable on this API tier?
_grounding_probe: Dict[str, Any] = {'ts': 0.0, 'value': None}
GROUNDING_PROBE_TTL = 3600


async def _grounding_available(tools: list) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    if _grounding_probe['value'] is not None and now - _grounding_probe['ts'] < GROUNDING_PROBE_TTL:
        return bool(_grounding_probe['value'])
    ok = False
    try:
        res = await _call_gemini({
            'contents': [{'role': 'user', 'parts': [{'text': 'ok'}]}],
            'tools': tools,
            'generationConfig': {'temperature': 0},
        }, GEMINI_MODELS[0])
        ok = res['status'] == 200 and bool(res['data'].get('candidates'))
    except Exception as e:
        logger.warning(f'grounding probe failed: {e}')
        ok = False
    _grounding_probe.update({'ts': now, 'value': ok})
    logger.info(f'Native Google Search grounding available: {ok}')
    return ok


@api.post('/llm/generate')
async def llm_generate(payload: LlmRequest):
    """Pure passthrough proxy to Google Generative Language API.

    Keeps the frontend payload/response 100% native. Google Search grounding is
    forwarded as-is; if the project has no grounding quota (or a model's quota is
    exhausted) the request automatically rolls over to the next model/plain call
    so the app keeps working."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail='GEMINI_API_KEY tidak tersedia di server.')

    body: Dict[str, Any] = {'contents': payload.contents}
    if payload.generationConfig:
        body['generationConfig'] = payload.generationConfig
    if payload.systemInstruction:
        body['systemInstruction'] = payload.systemInstruction

    # When the caller asked for Google Search grounding we first check (cheaply,
    # cached for an hour) whether the API tier actually has grounding quota. If
    # not, we fall back to our own real-time grounding (economic calendar + fresh
    # headlines) so the analysis is still genuinely synced with today's releases.
    if payload.tools:
        if await _grounding_available(payload.tools):
            return await _gemini_with_fallback(body, payload.tools)
        context = await build_grounding_context(json.dumps(payload.contents)[:4000])
        if context:
            body['contents'] = _inject_context(payload.contents, context)
            result = await _gemini_with_fallback(body, None)
            result['_grounded'] = True
            result['_grounding_source'] = 'apexquant-realtime-feed'
            return result

    return await _gemini_with_fallback(body, payload.tools)


# ----------------------------------------------------------------------------
# Third party proxies (CORS-safe passthrough)
# ----------------------------------------------------------------------------
UA = {'User-Agent': 'Mozilla/5.0 (ApexQuantElite)'}


@api.get('/proxy/binance/klines')
async def binance_klines(symbol: str, interval: str, limit: int = 100):
    url = f'https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}'
    async with httpx.AsyncClient(timeout=25) as c:
        r = await c.get(url, headers=UA)
    if r.status_code != 200:
        raise HTTPException(status_code=404, detail='BINANCE_NOT_FOUND')
    return r.json()


@api.get('/proxy/binance/ticker')
async def binance_ticker(symbol: str):
    url = f'https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}'
    async with httpx.AsyncClient(timeout=25) as c:
        r = await c.get(url, headers=UA)
    if r.status_code != 200:
        raise HTTPException(status_code=404, detail='BINANCE_NOT_FOUND')
    return r.json()


@api.get('/proxy/binance/prices')
async def binance_prices():
    async with httpx.AsyncClient(timeout=25) as c:
        r = await c.get('https://api.binance.com/api/v3/ticker/price', headers=UA)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail='BINANCE_PRICES_FAILED')
    return r.json()


@api.get('/proxy/bitget/candles')
async def bitget_candles(symbol: str, granularity: str, limit: int = 100):
    url = (f'https://api.bitget.com/api/v2/spot/market/candles?symbol={symbol}'
           f'&granularity={granularity}&limit={limit}')
    async with httpx.AsyncClient(timeout=25) as c:
        r = await c.get(url, headers=UA)
    try:
        return r.json()
    except Exception:
        return {'data': []}


@api.get('/proxy/twelvedata/price')
async def td_price(symbol: str):
    url = f'https://api.twelvedata.com/price?symbol={symbol}&apikey={TWELVEDATA_API_KEY}'
    async with httpx.AsyncClient(timeout=25) as c:
        r = await c.get(url, headers=UA)
    try:
        return r.json()
    except Exception:
        return {'status': 'error', 'message': 'TwelveData tidak merespon.'}


@api.get('/proxy/twelvedata/time_series')
async def td_series(symbol: str, interval: str, outputsize: int = 100):
    url = (f'https://api.twelvedata.com/time_series?symbol={symbol}&interval={interval}'
           f'&outputsize={outputsize}&apikey={TWELVEDATA_API_KEY}')
    async with httpx.AsyncClient(timeout=25) as c:
        r = await c.get(url, headers=UA)
    try:
        return r.json()
    except Exception:
        return {'status': 'error', 'message': 'TwelveData tidak merespon.'}


@api.get('/proxy/sosovalue')
async def sosovalue(symbol: str):
    url = f'https://api.sosovalue.com/v1/market/data?symbol={symbol}'
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(url, headers={'Authorization': f'Bearer {SOSO_API_KEY}', **UA})
        if r.status_code != 200:
            raise Exception('blocked')
        data = r.json()
        return {'ok': True, 'text': json.dumps(data.get('data', data))}
    except Exception:
        return {'ok': False, 'text': ('Data Sosovalue API saat ini tidak tersedia untuk pair ini '
                                     'atau terhalang proteksi CORS/Limit. Analisis mengandalkan '
                                     'Google Search.')}


class DeepSeekRequest(BaseModel):
    prompt: str


@api.post('/proxy/deepseek')
async def deepseek(payload: DeepSeekRequest):
    body = {
        'model': 'deepseek-chat',
        'messages': [{'role': 'user', 'content': payload.prompt}],
        'temperature': 0.1,
        'response_format': {'type': 'json_object'},
    }
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(
                'https://api.deepseek.com/v1/chat/completions',
                headers={'Content-Type': 'application/json',
                         'Authorization': f'Bearer {DEEPSEEK_API_KEY}'},
                json=body,
            )
        if r.status_code != 200:
            raise Exception(f'DeepSeek failed {r.status_code}')
        return r.json()
    except Exception as e:
        logger.warning(f'DeepSeek primary failed: {e}; falling back to Gemini verifier')
        # Fallback verifier so dual-verification remains functional
        try:
            data = await _gemini_with_fallback({
                'contents': [{'role': 'user', 'parts': [{'text': payload.prompt}]}],
                'generationConfig': {'temperature': 0.1, 'responseMimeType': 'application/json'},
            }, None)
            text = data['candidates'][0]['content']['parts'][0]['text']
            text = text.replace('```json', '').replace('```', '').strip()
            return {'choices': [{'message': {'content': text}}]}
        except Exception as e2:
            raise HTTPException(status_code=502, detail=f'Verifikasi gagal: {e2}')


@api.get('/health')
async def health():
    return {'status': 'ok', 'llm': bool(GEMINI_API_KEY), 'model': GEMINI_MODEL}


@api.get('/')
async def root():
    return {'message': 'ApexQuant Elite API'}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def startup():
    await db[STORE].create_index('path', unique=True)
    await db[STORE].create_index('parent')
    logger.info('ApexQuant backend ready')


@app.on_event('shutdown')
async def shutdown():
    client.close()
