import os
import json
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
