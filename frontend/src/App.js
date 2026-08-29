import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import {
Settings as SettingsIcon, Upload, Image as ImageIcon, X, Play, CheckCircle,
AlertCircle, ShieldAlert, TrendingUp, Loader2, Target, ArrowLeft, History as HistoryIcon,
Clock, ChevronRight, Search, Activity, Database, Check, ScanLine, BarChart3,
Copy, Lock, Wallet, Lightbulb, ToggleLeft, ToggleRight, Newspaper, Globe,
CalendarDays, Trash2, Save, LayoutDashboard, Zap, RefreshCw, UserCheck,
Flame, Crown, Radio, ArrowRight, Shield, ListOrdered, ImageDown, Ban, Sunrise, Bell
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { initializeApp, getApps, getApp } from './lib/fbshim';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from './lib/fbshim';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc } from './lib/fbshim';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
// Runtime globals injected by public/index.html (mirrors the AI Studio canvas env).
const RUNTIME = typeof window !== 'undefined' ? window : {};
const appId = RUNTIME.__app_id || 'apexquant-unified-v88';
let app = null;
let auth = null;
let db = null;
try {
let firebaseConfig = {};
if (RUNTIME.__firebase_config) {
firebaseConfig = typeof RUNTIME.__firebase_config === 'string' ? JSON.parse(RUNTIME.__firebase_config) :
RUNTIME.__firebase_config;
}
if (Object.keys(firebaseConfig).length > 0) {
app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
auth = getAuth(app);
db = getFirestore(app);
}
} catch (error) {
console.warn("Firebase Init Error (Offline Mode):", error);
}
class ErrorBoundary extends React.Component {
constructor(props) { super(props); this.state = { hasError: false, error: null }; }
static getDerivedStateFromError(error) { return { hasError: true, error }; }
componentDidCatch(error, errorInfo) { console.error("Fatal Crash Terlindungi:", error,
errorInfo); }
render() {
if (this.state.hasError) {
return (
<div className="min-h-screen bg-[#070a10] text-red-400 p-8 font-mono text-sm flex flex-col items-center justify-center text-center">
<ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
<h1 className="text-xl font-bold text-white mb-2">Sistem Melakukan
Pemulihan</h1>
<p>Terjadi kesalahan sinkronisasi UI. Memuat ulang sistem aman...</p>
<button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600/20 border border-red-500 rounded-lg text-red-400 font-bold hover:bg-red-500 hover:text-white transition-all">Muat Ulang Aplikasi</button>
</div>
);
}
return this.props.children;
}
}
const TWELVEDATA_API_KEY = 'e05d2f88dfe9497fa9babf09926b4bb0';
const SOSO_API_KEY = 'SOSO-228e1006991f4fc18252223a26f4f9db';
const DEEPSEEK_API_KEY = 'sk-19318b9ea0d341e4b7eadeae124b2737';
const computeIndicators = (candles) => {
if (!candles || candles.length < 50) return null;
const closes = candles.map(c => c.close);
const highs = candles.map(c => c.high);
const lows = candles.map(c => c.low);
const calcEMA = (data, period) => {
const k = 2 / (period + 1);
let ema = [data[0]];
for (let i = 1; i < data.length; i++) ema.push(data[i] * k + ema[i - 1] * (1 - k));
return ema;
};
const calcRSI = (data, period) => {
let gains = 0, losses = 0;
for (let i = 1; i <= period; i++) {
const diff = data[i] - data[i - 1];
if (diff >= 0) gains += diff; else losses -= diff;
}
let avgGain = gains / period; let avgLoss = losses / period;
let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
let rsi = [100 - (100 / (1 + rs))];
for (let i = period + 1; i < data.length; i++) {
const diff = data[i] - data[i - 1];
let gain = diff >= 0 ? diff : 0; let loss = diff < 0 ? -diff : 0;
avgGain = (avgGain * (period - 1) + gain) / period;
avgLoss = (avgLoss * (period - 1) + loss) / period;
rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
rsi.push(100 - (100 / (1 + rs)));
}
return rsi[rsi.length - 1];
};
const calcATR = (highs, lows, closes, period) => {
let trs = [highs[0] - lows[0]];
for (let i = 1; i < highs.length; i++) {
const hl = highs[i] - lows[i];
const hc = Math.abs(highs[i] - closes[i - 1]);
const lc = Math.abs(lows[i] - closes[i - 1]);
trs.push(Math.max(hl, hc, lc));
}
let atr = [trs.slice(0, period).reduce((a, b) => a + b) / period];
for (let i = period; i < trs.length; i++) atr.push((atr[atr.length - 1] * (period - 1) + trs[i]) /
period);
return atr[atr.length - 1];
};
const ema20 = calcEMA(closes, 20);
const ema50 = calcEMA(closes, 50);
const rsi14 = calcRSI(closes, 14);
const atr14 = calcATR(highs, lows, closes, 14);
const ema12 = calcEMA(closes, 12);
const ema26 = calcEMA(closes, 26);
const macdLine = ema12.map((val, i) => val - ema26[i]);
const signalLine = calcEMA(macdLine.slice(25), 9);
const currentMacd = macdLine[macdLine.length - 1];
const currentSignal = signalLine[signalLine.length - 1];
return {
rsi: isNaN(rsi14) ? 0 : rsi14.toFixed(2),
ema20: isNaN(ema20[ema20.length - 1]) ? 0 : ema20[ema20.length - 1].toFixed(5),
ema50: isNaN(ema50[ema50.length - 1]) ? 0 : ema50[ema50.length - 1].toFixed(5),
macd: {
macd: isNaN(currentMacd) ? 0 : currentMacd.toFixed(5),
signal: isNaN(currentSignal) ? 0 : currentSignal.toFixed(5),
histogram: isNaN(currentMacd - currentSignal) ? 0 : (currentMacd -
currentSignal).toFixed(5)
},
atr: isNaN(atr14) ? 0 : atr14.toFixed(5)
};
};
const fetchSosovalueData = async (symbol) => {
try {
const res = await fetch(`${API_BASE}/api/proxy/sosovalue?symbol=${symbol}`, {
headers: { 'Authorization': `Bearer ${SOSO_API_KEY}` }
});
if (!res.ok) throw new Error('API Sosovalue diblokir atau limit');
const data = await res.json();
return data.text || JSON.stringify(data.data || data);
} catch (e) {
return "Data Sosovalue API saat ini tidak tersedia untuk pair ini atau terhalang proteksi CORS/Limit. Analisis mengandalkan Google Search.";
}
};
const verifyWithDeepSeek = async (report, indicators, pair) => {
try {
const summaryMatch =
report.match(/(🧭\s*Arah:[\s\S]*?)(?:════════|🌍\s*Intermarket)/i);
const summaryText = summaryMatch ? summaryMatch[1].trim() : report.substring(0,
1000);
const prompt = `Anda adalah Verifikator AI (DeepSeek). Evaluasi ringkasan setup
trading dari Gemini berikut untuk pair ${pair}.
[Data Indikator Live Aktual (Matematis)]
RSI(14): ${indicators?.rsi}
EMA(20): ${indicators?.ema20} | EMA(50): ${indicators?.ema50}
ATR: ${indicators?.atr}
[Ringkasan Setup Gemini]
${summaryText}
Tugas Anda: Periksa arah (LONG/SHORT) dan level SL/TP. Apakah konsisten secara logis
dengan Indikator nyata di atas?
Balas HANYA dengan JSON format:
{"verified": true atau false, "reason": "Maksimal 2 kalimat penjelasan singkat kenapa Anda
setuju (terverifikasi) atau tidak setuju (perbedaan analisis)."}`;
const res = await fetch(`${API_BASE}/api/proxy/deepseek`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
},
body: JSON.stringify({ prompt })
});
if (!res.ok) throw new Error('DeepSeek failed');
const json = await res.json();
const result = JSON.parse(json.choices[0].message.content);
return { verified: result.verified, reason: result.reason };
} catch(e) {
console.error("Gagal melakukan verifikasi DeepSeek:", e);
return null;
}
};
// Laporan singkat ketika terjadi perbedaan analisis antar AI (setup dibatalkan total).
const buildNoTradeReport = (pairName, reason, biasAwal, confidence) => {
const alasan = (reason || 'Terjadi perbedaan hasil analisis antar AI pada struktur dan momentum harga.').trim();
return [
'NO TRADE 🚫',
`ALASANNYA: ${alasan}`,
'',
`📊 Status: Perbedaan Analisis AI (Dual-AI Mismatch)${biasAwal ? ` — bias awal ${biasAwal} dibatalkan` : ''}`,
`📊 Pair: ${pairName}${confidence ? ` | Confidence awal: ${confidence}%` : ''}`,
'📊 Saran: Tunggu struktur & momentum baru yang lebih selaras sebelum eksekusi.'
].join('\n');
};

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
const TF_MAP = {
Binance: { M1:'1m', M5:'5m', M15:'15m', M30:'30m', H1:'1h', H4:'4h', D1:'1d' },
Bitget: { M1:'1min', M5:'5min', M15:'15min', M30:'30min', H1:'1h', H4:'4h', D1:'1day' },
TwelveData: { M1:'1min', M5:'5min', M15:'15min', M30:'30min', H1:'1h', H4:'4h', D1:'1day' }
};
const MODES = {
'Scalping': ['M5', 'M15', 'M30'],
'Intraday': ['M15', 'H1', 'H4'],
'Swing': ['H1', 'H4', 'D1']
};
const ANALYSIS_TYPES = ['Agresif', 'Balance', 'Standar'];
const RR_RATIOS = ['1:1.2', '1:1.5', '1:2', '1:2.5', '1:3', '1:4', '1:5'];
const TP_LEVELS = ['TP1', 'TP2', 'TP3'];
const PIPS_RANGE = { 'Scalping': '40-100', 'Intraday': '100-400', 'Swing': '400-1000' };
const TRADING_FIGURES = [
{ name: 'Standar (Elite Quant AI)', desc: 'Sistem analisis teknikal & kuantitatif bawaan murni tanpa bias persona.' },
{ name: 'Sulianto Indria Putra', desc: 'Trader kripto pendiri Trade With Suli. Menekankan kejujuran, disiplin, manajemen risiko ketat, dan belajar dari kegagalan. Pengalaman di saham & desain.' },
{ name: 'Timothy Ronald', desc: 'Fokus pada sentimen kripto, investasi agresif, psikologi market, dan narasi makro.' },
{ name: 'Kalimasada', desc: 'Analisis teknikal kripto mendalam, rotasi likuiditas, on-chain data, dan price action.' },
{ name: 'Rizky Aditama', desc: 'Spesialis momentum candle forex dengan kepekaan price action ber-win rate tinggi.' },
{ name: 'Warren Buffett', desc: 'Value investing, sangat sabar, menghindari spekulasi liar, fokus fundamental.' },
{ name: 'George Soros', desc: 'Spekulasi makroekonomi global, teori refleksivitas, dan insting krisis moneter.' },
{ name: 'Gabriel Rey', desc: 'CEO Triv, spesialis siklus market kripto jangka panjang, analisis on-chain, fundamental, dan sentimen makroekonomi.' },
{ name: 'Andry Hakim', desc: 'Trader profesional, fokus pada teknikal analisis murni, manajemen risiko ketat, disiplin, dan probabilitas statistik.' },
{ name: 'Yayin', desc: 'Adik Gabriel Rey, trader kripto agresif, sangat peka terhadap sentimen market instan, altcoin momentum, dan pergerakan whale.' },
{ name: 'Jesse Livermore', desc: 'Membaca tren pasar secara presisi, price action murni, dan psikologi kerumunan.' },
{ name: 'Paul Tudor Jones', desc: 'Contrarian trading yang tajam, manajemen risiko sangat ketat, dan prediksi titik balik makro.' },
{ name: 'Goldwin Halim', desc: 'Fokus pada analisis teknikal presisi, market structure yang ketat, dan pemetaan likuiditas di market kripto.' },
{ name: 'Andy Senjaya', desc: 'Spesialis teknikal analisis dan swing trading, sangat disiplin pada trading plan serta money management yang objektif.' },
{ name: 'Andre Rizky', desc: 'Fokus pada Smart Money Concept (SMC), price action murni, dan eksekusi trading dengan probabilitas tinggi.' },
{ name: 'Felicia Putri Tjiasaka', desc: 'Fokus pada investasi fundamental jangka panjang, analisis makro yang terstruktur, dan edukasi manajemen risiko yang aman.' },
{ name: 'Gema Goeyardi', desc: 'Spesialis Astrologi Finansial (Astronacci), analisis siklus waktu (Time Cycle), Fibonacci, dan pergerakan harga berbasis makro.' },
{ name: 'Sigit Purnomo', desc: 'Spesialis forex trading, fokus pada price action murni, supply & demand, serta psikologi trading yang tenang dan disiplin.' }
];
const RECOMMENDATIONS = {
'Scalping': {
rr: '1:1.5 atau 1:2', tp: 'Maksimal TP2', profil: 'Agresif Sniper',
persona: 'Yayin / Paul Tudor Jones',
methods: [
{ name: 'Smart Money Concept (SMC)', desc: 'Mengikuti jejak dan arah uang institusi besar.' },
{ name: 'Order Flow Analysis', desc: 'Membaca antrean order dan tape reading.' },
{ name: 'Liquidity Grab', desc: 'Eksploitasi volatilitas instan saat likuiditas diambil.' },
{ name: 'Market Structure Shift (MSS)', desc: 'Deteksi dini perubahan arah tren presisi.' },
{ name: 'Bid Ask Imbalance', desc: 'Ketidakseimbangan ekstrem antara Bid & Ask di mikro.' },
{ name: 'Session Killzone', desc: 'Trading eksklusif pada lonjakan volume awal sesi.' },
{ name: 'News Impact Pre-Positioning', desc: 'Posisi cepat merespons sentimen data instan.' },
{ name: 'Real-Time Economic Calendar Correlation', desc: 'Korelasi langsung dengan rilis data.' },
{ name: 'Footprint Logic', desc: 'Melihat distribusi volume di dalam tiap candle.' },
{ name: 'Stop Hunt', desc: 'Mendeteksi manuver market maker menjebak ritel.' },
{ name: 'Fair Value Gap (FVG)', desc: 'Mencari celah harga (imbalance) untuk area entri presisi.' },
{ name: 'Delta Volume', desc: 'Analisis perbedaan volume buy vs sell riil.' },
{ name: 'London Breakout', desc: 'Eksploitasi volatilitas saat London open.' },
{ name: 'Algorithmic Order Imbalance', desc: 'Deteksi jejak bot algoritma HFT (High Frequency Trading).' },
{ name: 'Retail Sentiment Contrarian', desc: 'Trading berlawanan dengan rasio likuidasi ritel massal.' }
]
},
'Intraday': {
rr: '1:2 atau 1:2.5', tp: 'TP2 atau TP3', profil: 'Balance Presisi',
persona: 'Standar (Elite Quant AI) / Andry Hakim',
methods: [
{ name: 'Volume Profile', desc: 'Analisis ketebalan volume pada level harga (Value Area).' },
{ name: 'ICT Concept', desc: 'Konsep pemetaan eksekusi harian institusi.' },
{ name: 'VWAP', desc: 'Harga rata-rata tertimbang volume batas wajar harian.' },
{ name: 'Liquidity Mapping', desc: 'Pemetaan target likuiditas harian utama.' },
{ name: 'NFP/CPI Volatility Matrix', desc: 'Pemetaan level volatilitas ekstrim saat news AS rilis.' },
{ name: 'Open Interest Analysis', desc: 'Mendeteksi uang baru yang masuk ke pasar.' },
{ name: 'Funding Rate Analysis', desc: 'Membaca sentimen perpetual futures harian.' },
{ name: 'Macro Liquidity Flow', desc: 'Pemantauan injeksi likuiditas bank sentral harian.'
},
{ name: 'Central Bank Speech Sentiment Analysis', desc: 'Analisis hawkish/dovish dari pidato pejabat bank.' },
{ name: 'Multi Time Frame Analysis (MTF)', desc: 'Penyelarasan sinyal dari berbagai timeframe.' },
{ name: 'Session Flow Analysis', desc: 'Analisis aliran likuiditas Asia ke London ke NY.' },
{ name: 'Cross-Asset Fundamental Divergence', desc: 'Divergensi fundamental lintas aset (misal: DXY vs Yield).' },
{ name: 'Premium Discount Zone', desc: 'Pembelian logis di zona diskon harian.' },
{ name: 'Whale Activity Tracking', desc: 'Melacak akumulasi token harian dari paus.' },
{ name: 'Accumulation Distribution', desc: 'Analisis volume beli vs distribusi jual harian institusi.' }
]
},
'Swing': {
rr: '1:3 hingga 1:5', tp: 'Harus TP3', profil: 'Makro Standar',
persona: 'George Soros / Gabriel Rey',
methods: [
{ name: 'Wyckoff Method', desc: 'Mendeteksi fase makro Akumulasi & Distribusi pasar.' },
{ name: 'Supply & Demand', desc: 'Menandai zona beli/jual raksasa historis HTF.' },
{ name: 'Macroeconomic Flow Analysis', desc: 'Analisis perputaran uang global lintas aset besar.' },
{ name: 'Central Bank Policy Divergence', desc: 'Trading selisih arah kebijakan moneter lintas negara.' },
{ name: 'Interest Rate Cycle Forecasting', desc: 'Memproyeksi puncak atau dasar siklus suku bunga.' },
{ name: 'Yield Curve Analysis', desc: 'Menganalisis inversi kurva imbal hasil obligasi AS.'
},
{ name: 'Geopolitical Risk Scoring', desc: 'Kuantifikasi risiko geopolitik terhadap aset Safe Haven.' },
{ name: 'Real-time ETF Flow Tracking', desc: 'Melacak akumulasi ETF institusional bulanan.' },
{ name: 'Dark Pool Block Trade Tracking', desc: 'Pelacakan transaksi gelap blok besar institusi.' },
{ name: 'FOMC Dot Plot Projection', desc: 'Proyeksi arah The Fed berdasarkan data historis Dot Plot.' },
{ name: 'Order Block', desc: 'Area pijakan institusi D1/W1.' },
{ name: 'Volume Spread Analysis (VSA)', desc: 'Validasi dorongan harga dengan volume makro sejati.' },
{ name: 'Internal External Liquidity Analysis', desc: 'Analisis kolam likuiditas target harga jangka panjang.' },
{ name: 'Trend Exhaustion Model', desc: 'Model kejenuhan tren multi-bulan.' },
{ name: 'Institutional Range Sweep', desc: 'Sapu bersih order di rentang makro kuartalan.' }
]
}
};
const ANALYSIS_METHODS = [
'Price Action', 'Smart Money Concept (SMC)', 'ICT Concept', 'Wyckoff Method', 'Supply & Demand', 'Order Block',
'Breaker Block', 'Mitigation Block', 'Fair Value Gap (FVG)', 'Inverse Fair Value Gap (IFVG)',
'Liquidity Sweep',
'Liquidity Grab', 'Stop Hunt', 'Inducement', 'Breakout Retest', 'Trend Following', 'Counter Trend', 'Scalping Momentum',
'Fibonacci Retracement', 'Fibonacci Extension', 'Fibonacci OTE', 'EMA Trend System',
'EMA Ribbon', 'RSI Momentum',
'RSI Divergence', 'Hidden Divergence', 'MACD Momentum', 'Bollinger Bands', 'ATR Volatility', 'VWAP', 'Volume Profile',
'Market Structure Shift (MSS)', 'Break of Structure (BOS)', 'Change of Character (CHoCH)',
'Equal High Equal Low (EQH/EQL)',
'Premium Discount Zone', 'Session Killzone', 'London Breakout', 'New York Reversal',
'Asian Range Setup', 'Mean Reversion',
'Compression Breakout', 'Expansion Candle', 'Volume Spread Analysis (VSA)', 'Delta Volume', 'Order Flow Analysis',
'Footprint Logic', 'Bid Ask Imbalance', 'DOM / Orderbook Reading', 'Liquidity Mapping',
'Funding Rate Analysis',
'Open Interest Analysis', 'Long Short Ratio Analysis', 'Liquidation Cluster Mapping', 'Whale Activity Tracking',
'Multi Time Frame Analysis (MTF)', 'Session Volume Analysis', 'Breakout Confirmation',
'Fake Breakout Filter',
'Sideways Range Specialist', 'Micro Scalping Structure', 'Sniper Entry Confirmation',
'Volatility Compression',
'Expansion Range Theory', 'Trendline Liquidity', 'Dynamic Support Resistance', 'Wolfe Wave', 'Elliott Wave',
'Accumulation Distribution', 'Institutional Candle Reading', 'Trap Detection System', 'Smart Liquidity Mapping',
'Momentum Exhaustion Detection', 'Exhaustion Candle Pattern', 'Multi Confirmation Probability Engine',
'Composite Market Validation System', 'AI Probability Scoring System', 'Real-Time Volatility Mapping',
'Adaptive RR Validation', 'Spread & Slippage Validation', 'Session Flow Analysis', 'Intraday Rotation Model',
'Precision Scalping Framework', 'AI Composite Trading Engine', 'High Probability Execution Model',
'Market Manipulation Detection', 'Synthetic Liquidity Trap Filter', 'Fractal Market Structure',
'Candle Rejection Mapping',
'Institutional Footprint Analysis', 'Dynamic Range Projection', 'Liquidity Voids Analysis',
'Volatility Expansion Detection',
'Compression Box Analysis', 'Range Manipulation Detection', 'Session Trap Mapping',
'Rejection Block Analysis',
'Premium Liquidity Trap System', 'HTF Bias Confirmation', 'LTF Entry Precision', 'Scalping Reversal Engine',
'Trend Exhaustion Model', 'Internal External Liquidity Analysis', 'Precision Pullback Model',
'Scalping Continuation Model',
'BOS Retest Confirmation', 'CHoCH Confirmation Model', 'Institutional Sweep Detection',
'Smart Range Breakout System',
'False Breakout Detector', 'Precision Wick Analysis', 'Advanced Candle Psychology', 'EMA Dynamic Flow', 'RSI Compression Analysis',
'Volume Spike Validation', 'Liquidity Pressure Analysis', 'Orderflow Momentum Engine',
'Adaptive Scalping Model',
'Precision Timing Entry Model', 'Multi Layer Confirmation System', 'AI Sniper Entry System',
'Advanced Sideways Detection',
'Institutional Trap Avoidance', 'Precision Trend Engine', 'Dynamic Momentum Tracking',
'Adaptive Liquidity Reading',
'Structural Failure Detection', 'Continuation Failure Detection', 'Reversal Failure Detection',
'Volatility Trap Detection',
'Smart Scalping Matrix', 'High Accuracy Range Mapping', 'Institutional Range Sweep',
'Precision Expansion Mapping',
'AI Scalping Intelligence System',
'Macroeconomic Flow Analysis', 'Central Bank Policy Divergence', 'Interest Rate Cycle Forecasting',
'NFP/CPI Volatility Matrix', 'Institutional News Order Routing', 'Sentiment Algorithmic Scoring',
'Real-time ETF Flow Tracking', 'Geopolitical Risk Premium Analysis', 'Bond Yield Spread Correlation',
'FOMC Dot Plot Projection', 'Real-Time Economic Calendar Correlation', 'Central Bank Speech Sentiment Analysis',
'Cross-Asset Fundamental Divergence', 'News Impact Pre-Positioning', 'Yield Curve Analysis',
'Macro Liquidity Flow', 'Geopolitical Risk Scoring', 'Retail Sentiment Contrarian',
'Dark Pool Block Trade Tracking', 'Algorithmic Order Imbalance',
'Harmonic Patterns (Gartley, Bat, Butterfly)', 'Ichimoku Cloud', 'Gann Fan & Square of 9',
'Pivot Points & Camarilla',
'Supertrend Indicator', 'Parabolic SAR', 'Average Directional Index (ADX)', 'Stochastic Oscillator',
'On-Balance Volume (OBV)', 'Chaikin Money Flow (CMF)', 'Heikin Ashi Trend Analysis',
'Renko Brick Size Logic',
'Keltner Channels', 'Donchian Channels', 'Astrologi Finansial (Financial Astrology)', 'Moon Phase & Planetary Cycles',
'Mercury Retrograde Cycle'
];
const DEFAULT_SETTINGS = {
mode: 'Scalping', analysisType: 'Balance', rr: '1:2', tpLevel: 'TP3', risk: '2%',
methods: ['Smart Money Concept (SMC)', 'Order Flow Analysis', 'Market Structure Shift (MSS)', 'Liquidity Sweep'],
leverage: 20, lotSize: '0.01', showPips: true, predictNews: false, aiPersona: 'Standar (Elite Quant AI)',
confidenceThreshold: 70, requireDualVerification: false,
useHistoryCalibration: false
};
const LABELS_TO_BADGE = [
"EARLY CALL BY AI AGENT", "Called on:", "Time:", "🕑 Time:", "Chart Pattern:",
"Potensial set up:",
"Alasan:", "Akurasi Target 1:", "Akurasi Target 2:", "Akurasi Target 3:", "Akurasi Target:",
"Akurasi SL:", "🛡 Akurasi SL:", "🎯 Akurasi TP:",
"🎯 Akurasi TP1:", "⚡ Akurasi TP2:", "🔥 Akurasi TP3:", "Mode:",
"Market Condition:", "Metode Analisa:", "Money Management:", "Gaya Pemikiran AI:",
"Eksekusi Trading:", "Area Buyer:", "Area Seller:", "Smart Money Concept:", "Invalidasi Setup:",
"Sideways Filter:", "Jenis sideways:", "Range:", "Posisi harga:", "Validasi sweep:",
"Risiko fake signal:", "Keputusan:", "Sideways Range Specialist:", "Range utama:",
"Setup terbaik:", "Validitas:", "Catatan risiko:", "Fake Signal Protection:",
"Area rawan trap:", "Validitas Entry:", "Scenario Chart:",
"🌍 Intermarket Correlation:", "🕰 Session Impact:", "🔍 POST-MORTEM (EVALUASI LOSS):"
];
const fetchBinanceData = async (symbol, tf) => {
const interval = TF_MAP.Binance[tf];
let [klineRes, tickerRes] = await Promise.all([
fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`).catch(() => ({ ok: false })),
fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).catch(() => ({ ok: false }))
]);
if (!klineRes.ok || !tickerRes.ok) {
[klineRes, tickerRes] = await Promise.all([
fetch(`${API_BASE}/api/proxy/binance/klines?symbol=${symbol}&interval=${interval}&limit=100`).catch(() => ({ ok: false })),
fetch(`${API_BASE}/api/proxy/binance/ticker?symbol=${symbol}`).catch(() => ({ ok: false }))
]);
}
if (!klineRes.ok || !tickerRes.ok) throw new Error('BINANCE_NOT_FOUND');
const klines = await klineRes.json();
const ticker = await tickerRes.json();
if (!Array.isArray(klines) || klines.length === 0) throw new Error('BINANCE_NOT_FOUND');
return {
source: 'Binance', currentPrice: parseFloat(ticker.lastPrice),
high24h: parseFloat(ticker.highPrice), low24h: parseFloat(ticker.lowPrice),
change24h: parseFloat(ticker.priceChangePercent),
candles: klines.map(k => ({ time: k[0], open:+k[1], high:+k[2], low:+k[3], close:+k[4],
volume:+k[5] }))
};
};
const fetchBitgetData = async (symbol, tf) => {
const interval = TF_MAP.Bitget[tf];
let res = await
fetch(`https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}&granularity=${interval}&limit=100`).catch(() => ({ ok: false }));
if (!res.ok) res = await fetch(`${API_BASE}/api/proxy/bitget/candles?symbol=${symbol}&granularity=${interval}&limit=100`);
const json = await res.json();
if (!json.data || json.data.length === 0) throw new Error('Pair tidak ditemukan (Binance & Bitget).');
const candles = json.data.map(c => ({ time:+c[0], open:+c[1], high:+c[2], low:+c[3],
close:+c[4], volume:+c[5] }));
const last = candles[candles.length - 1];
return { source: 'Bitget', currentPrice: last.close, candles };
};
const fetchFuturesLiveData = async (symbol, tf) => {
try { return await fetchBinanceData(symbol, tf); }
catch (e) { return await fetchBitgetData(symbol, tf); }
};
const fetchForexLiveData = async (symbolRaw, tf) => {
if (!TWELVEDATA_API_KEY || TWELVEDATA_API_KEY.startsWith('GANTI_')) {
throw new Error('TwelveData API key belum di-set.');
}
const symbol = symbolRaw.includes('/') ? symbolRaw :
symbolRaw.replace(/^([A-Z]{3})([A-Z]{3})$/, '$1/$2');
const interval = TF_MAP.TwelveData[tf];
const [priceRes, seriesRes] = await Promise.all([
fetch(`${API_BASE}/api/proxy/twelvedata/price?symbol=${encodeURIComponent(symbol)}`),
fetch(`${API_BASE}/api/proxy/twelvedata/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=100`)
]);
const price = await priceRes.json();
const series = await seriesRes.json();
if (price.status === 'error') throw new Error(price.message || 'Symbol tidak dikenali TwelveData. Coba format XAU/USD.');
if (series.status === 'error' || !series.values) throw new Error(series.message || 'Gagal ambil data candle dari TwelveData.');
return {
source: 'TwelveData', currentPrice: parseFloat(price.price),
candles: series.values.slice().reverse().map(v => ({ time: v.datetime, open:+v.open,
high:+v.high, low:+v.low, close:+v.close }))
};
};
const MarketSessionTracker = memo(() => {
const [time, setTime] = useState(new Date());
useEffect(() => {
const timer = setInterval(() => setTime(new Date()), 1000);
return () => clearInterval(timer);
}, []);
const utcHour = time.getUTCHours();
const utcMin = time.getUTCMinutes();
const timeFloat = utcHour + utcMin / 60;
const isAsia = (timeFloat >= 23 || timeFloat < 8);
const isLondon = (timeFloat >= 7 && timeFloat < 16);
const isNY = (timeFloat >= 12 && timeFloat < 21);
const isLondonKillzone = (timeFloat >= 7 && timeFloat < 10);
const isNYKillzone = (timeFloat >= 12 && timeFloat < 16);
let killzoneAlert = null;
if (isNYKillzone) {
killzoneAlert = (
<div className="w-full bg-red-500/20 border border-red-500/50 text-red-400 p-2.5 rounded-xl text-center font-black text-[10px] sm:text-xs animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)] mt-3">
🔥 NEW YORK KILLZONE ACTIVE (MAX VOLATILITY)
</div>
);
} else if (isLondonKillzone) {
killzoneAlert = (
<div className="w-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 p-2.5 rounded-xl text-center font-black text-[10px] sm:text-xs animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-3">
⚡ LONDON KILLZONE ACTIVE
</div>
);
} else if (isAsia) {
killzoneAlert = (
<div className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-400 p-2.5 rounded-xl text-center font-bold text-[10px] sm:text-xs mt-3 shadow-sm">
🔵 ASIAN SESSION (LOW-MED VOLATILITY)
</div>
);
}
return (
<div className="bg-[#0b1016]/90 backdrop-blur-md border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl mb-6">
<div className="flex justify-between items-center mb-3">
<h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500"/>
Sesi Market & Killzone</h3>
<span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">{time.toLocaleTimeString('id-ID')}</span>
</div>
<div className="grid grid-cols-3 gap-2 sm:gap-3">
<div className={`p-2.5 rounded-xl text-center border transition-all ${isAsia ?
'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
: 'bg-[#070a10] border-white/5 text-slate-600 opacity-50'}`}>
<div className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase mb-0.5">ASIA</div>
<div className="text-[7px] sm:text-[8px] font-bold opacity-80 uppercase">Tokyo /
Sydney</div>
</div>
<div className={`p-2.5 rounded-xl text-center border transition-all ${isLondon ?
'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-[#070a10] border-white/5 text-slate-600 opacity-50'}`}>
<div className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase mb-0.5">LONDON</div>
<div className="text-[7px] sm:text-[8px] font-bold opacity-80 uppercase">Euro /
London</div>
</div>
<div className={`p-2.5 rounded-xl text-center border transition-all ${isNY ?
'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
'bg-[#070a10] border-white/5 text-slate-600 opacity-50'}`}>
<div className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase mb-0.5">NEW YORK</div>
<div className="text-[7px] sm:text-[8px] font-bold opacity-80 uppercase">US / Wall
Street</div>
</div>
</div>
{killzoneAlert}
</div>
);
});
const TVAdvancedChartWidget = memo(({ market }) => {
const containerId = `tv_chart_${market}`;
useEffect(() => {
if (!document.getElementById('tv-script')) {
const script = document.createElement('script');
script.id = 'tv-script'; script.src = 'https://s3.tradingview.com/tv.js'; script.async = true;
script.onload = () => {
if (window.TradingView) {
new window.TradingView.widget({ "autosize": true, "symbol": market === 'FUTURES' ?
"BINANCE:BTCUSDT" : "OANDA:XAUUSD", "interval": "15", "timezone": "Asia/Jakarta",
"theme": "dark", "style": "1", "locale": "id", "enable_publishing": false, "backgroundColor":
"#0b1016", "gridColor": "rgba(255, 255, 255, 0.05)", "hide_top_toolbar": false, "hide_legend":
false, "save_image": false, "container_id": containerId });
}
};
document.body.appendChild(script);
} else {
if (window.TradingView) {
setTimeout(() => {
new window.TradingView.widget({ "autosize": true, "symbol": market ===
'FUTURES' ? "BINANCE:BTCUSDT" : "OANDA:XAUUSD", "interval": "15", "timezone":
"Asia/Jakarta", "theme": "dark", "style": "1", "locale": "id", "enable_publishing": false,
"backgroundColor": "#0b1016", "gridColor": "rgba(255, 255, 255, 0.05)", "hide_top_toolbar":
false, "hide_legend": false, "save_image": false, "container_id": containerId });
}, 300);
}
}
}, [market]);
return (
<div className="w-full mb-6 relative">
<div className="flex items-center gap-2 mb-3 px-1"><BarChart3 className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interactive Candlestick</span></div>
<div className="w-full bg-[#0b1016] border border-white/5 rounded-2xl overflow-hidden shadow-xl h-[450px]"><div id={containerId} className="w-full h-full"></div></div>
</div>
);
});
const TVCalendarWidget = memo(() => {
const container = useRef(null);
useEffect(() => {
if (container.current) {
container.current.innerHTML = ''; const script = document.createElement("script");
script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
script.type = "text/javascript"; script.async = true;
script.innerHTML = JSON.stringify({ "colorTheme": "dark", "isTransparent": true, "width":
"100%", "height": "600", "locale": "id", "importanceFilter": "-1,0,1", "currencyFilter":
"USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD" });
container.current.appendChild(script);
}
}, []);
return <div className="w-full bg-[#0b1016] border border-white/5 rounded-2xl overflow-hidden shadow-xl" ref={container}></div>;
});
function MainApp() {
const [activeTab, setActiveTab] = useState('analyze');
const [lastTab, setLastTab] = useState('analyze');
const [user, setUser] = useState(null);
const [isCloudSyncing, setIsCloudSyncing] = useState(true);
const [appConfig, setAppConfig] = useState(DEFAULT_SETTINGS);
const [draftConfig, setDraftConfig] = useState(DEFAULT_SETTINGS);
const [searchTerm, setSearchTerm] = useState('');
const [toastMsg, setToastMsg] = useState('');
const [isExporting, setIsExporting] = useState(false);
const exportRef = useRef(null);
const [showRecModal, setShowRecModal] = useState(false);
const [activeRecTab, setActiveRecTab] = useState('Scalping');
const [leverage, setLeverage] = useState(20);
const [lotSize, setLotSize] = useState('0.01');
const [selectedMarket, setSelectedMarket] = useState('FUTURES');
const [pair, setPair] = useState('');
const [images, setImages] = useState({ 0: null, 1: null, 2: null });
const [scanningStatus, setScanningStatus] = useState({ 0: false, 1: false, 2: false });
const [loading, setLoading] = useState(false);
const [report, setReport] = useState('');
const [errorMsg, setErrorMsg] = useState('');
const [dataMode, setDataMode] = useState('upload');
const [liveDataLoading, setLiveDataLoading] = useState(false);
const [predictNews, setPredictNews] = useState(false);
const [isEvaluating, setIsEvaluating] = useState(false);
const [deepSeekResult, setDeepSeekResult] = useState(null);
const [historyList, setHistoryList] = useState([]);
const [historyFilter, setHistoryFilter] = useState('FUTURES');
const [activeHistoryItem, setActiveHistoryItem] = useState(null);
const [itemToDelete, setItemToDelete] = useState(null);
const [newsFilter, setNewsFilter] = useState('calendar');
// --- Ringkasan Pagi (Morning Brief) ---
const [morningBrief, setMorningBrief] = useState(null);
const [briefLoading, setBriefLoading] = useState(false);
const [briefUnread, setBriefUnread] = useState(false);
const loadMorningBrief = React.useCallback(async (force = false) => {
setBriefLoading(true);
try {
const res = await fetch(`${API_BASE}/api/news/morning-brief${force ? '?force=true' : ''}`);
const json = await res.json();
if (json?.brief) {
setMorningBrief(json.brief);
let lastRead = null;
try { lastRead = localStorage.getItem('apex_brief_read'); } catch (e) {}
setBriefUnread(lastRead !== json.brief.date);
}
} catch (e) { console.error('Gagal memuat ringkasan pagi:', e); }
finally { setBriefLoading(false); }
}, []);
useEffect(() => { loadMorningBrief(false); }, [loadMorningBrief]);
const markBriefRead = React.useCallback((dateKey) => {
if (!dateKey) return;
try { localStorage.setItem('apex_brief_read', dateKey); } catch (e) {}
setBriefUnread(false);
}, []);
useEffect(() => {
if (activeTab === 'news' && morningBrief?.date) markBriefRead(morningBrief.date);
}, [activeTab, morningBrief, markBriefRead]);
const pressTimer = useRef(null);
const isLongPress = useRef(false);
const safeConfig = useMemo(() => {
if (!appConfig) return DEFAULT_SETTINGS;
return {
mode: appConfig.mode || 'Scalping', analysisType: appConfig.analysisType || 'Balance',
rr: appConfig.rr || '1:2', tpLevel: appConfig.tpLevel || 'TP3', risk: appConfig.risk || '2%',
methods: Array.isArray(appConfig.methods) ? appConfig.methods :
DEFAULT_SETTINGS.methods,
leverage: appConfig.leverage || 20, lotSize: appConfig.lotSize || '0.01',
showPips: true,
predictNews: appConfig.predictNews !== undefined ? appConfig.predictNews : false,
aiPersona: appConfig.aiPersona || 'Standar (Elite Quant AI)',
confidenceThreshold: appConfig.confidenceThreshold !== undefined ?
appConfig.confidenceThreshold : 70,
requireDualVerification: appConfig.requireDualVerification !== undefined ?
appConfig.requireDualVerification : false,
useHistoryCalibration: appConfig.useHistoryCalibration !== undefined ?
appConfig.useHistoryCalibration : false
};
}, [appConfig]);
const safeDraft = useMemo(() => {
if (!draftConfig) return DEFAULT_SETTINGS;
return {
mode: draftConfig.mode || 'Scalping', analysisType: draftConfig.analysisType || 'Balance',
rr: draftConfig.rr || '1:2', tpLevel: draftConfig.tpLevel || 'TP3', risk: draftConfig.risk || '2%',
methods: Array.isArray(draftConfig.methods) ? draftConfig.methods :
DEFAULT_SETTINGS.methods,
leverage: draftConfig.leverage || 20, lotSize: draftConfig.lotSize || '0.01',
showPips: true,
predictNews: draftConfig.predictNews !== undefined ? draftConfig.predictNews : false,
aiPersona: draftConfig.aiPersona || 'Standar (Elite Quant AI)',
confidenceThreshold: draftConfig.confidenceThreshold !== undefined ?
draftConfig.confidenceThreshold : 70,
requireDualVerification: draftConfig.requireDualVerification !== undefined ?
draftConfig.requireDualVerification : false,
useHistoryCalibration: draftConfig.useHistoryCalibration !== undefined ?
draftConfig.useHistoryCalibration : false
};
}, [draftConfig]);
const currentMode = safeConfig.mode || 'Scalping';
const currentTFs = MODES[currentMode] || ['M5', 'M15', 'M30'];
const allImagesUploaded = Boolean(images[0] && images[1] && images[2]);
const activeMethods = Array.isArray(safeConfig.methods) ? safeConfig.methods :
DEFAULT_SETTINGS.methods;
const formatDisplayPrice = (val) => {
if (!val || typeof val !== 'string') return val;
let cleanStr = val.replace(/[^0-9.,]/g, '');
if (cleanStr.includes(',') && cleanStr.includes('.')) cleanStr = cleanStr.replace(/\./g,
'').replace(',', '.');
else if (cleanStr.includes(',')) cleanStr = cleanStr.replace(',', '.');
const num = parseFloat(cleanStr);
if (!isNaN(num)) return num.toString();
return val;
};
const cleanTimeStr = (timeStr, tz) => {
if(!timeStr) return '';
const match = timeStr.match(/\b([01]\d|2[0-3])[:.]([0-5]\d)(?:[:.]([0-5]\d))?\b/);
if(match) return `${match[0].replace(/\./g, ':')} ${tz}`;
let cleaned = timeStr.replace(/\d{4}[-/]\d{2}[-/]\d{2}/g, '').trim();
return cleaned.substring(0, 10) + ` ${tz}`;
};
useEffect(() => {
let isMounted = true;
if (!auth) { setIsCloudSyncing(false); return; }
const initAuth = async () => {
try {
if (RUNTIME.__initial_auth_token) await
signInWithCustomToken(auth, RUNTIME.__initial_auth_token);
else await signInAnonymously(auth);
} catch (e) { if(isMounted) setIsCloudSyncing(false); }
};
initAuth();
const unsubscribe = onAuthStateChanged(auth, (currentUser) => { if(isMounted)
setUser(currentUser); });
return () => { isMounted = false; unsubscribe(); };
}, []);
useEffect(() => {
if (!user || !db) { setIsCloudSyncing(false); return; }
let unsubSettings = () => {}; let unsubHistory = () => {}; let unsubDashboard = () => {};
try {
const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'config',
'preferences_v88');
unsubSettings = onSnapshot(settingsRef, (docSnap) => {
if (docSnap.exists()) {
const data = docSnap.data();
const valid = {
mode: data.mode || DEFAULT_SETTINGS.mode, analysisType: data.analysisType ||
DEFAULT_SETTINGS.analysisType,
rr: data.rr || DEFAULT_SETTINGS.rr, tpLevel: data.tpLevel ||
DEFAULT_SETTINGS.tpLevel, risk: data.risk || DEFAULT_SETTINGS.risk,
methods: Array.isArray(data.methods) ? data.methods :
DEFAULT_SETTINGS.methods, leverage: data.leverage || DEFAULT_SETTINGS.leverage,
lotSize: data.lotSize || DEFAULT_SETTINGS.lotSize, showPips: data.showPips !==
undefined ? data.showPips : DEFAULT_SETTINGS.showPips,
predictNews: data.predictNews !== undefined ? data.predictNews : false, aiPersona:
data.aiPersona || 'Standar (Elite Quant AI)',
confidenceThreshold: data.confidenceThreshold !== undefined ?
data.confidenceThreshold : 70,
requireDualVerification: data.requireDualVerification !== undefined ?
data.requireDualVerification : false,
useHistoryCalibration: data.useHistoryCalibration !== undefined ?
data.useHistoryCalibration : false
};
setAppConfig(valid); setDraftConfig(valid); setLeverage(valid.leverage);
setLotSize(valid.lotSize); setPredictNews(valid.predictNews);
} else { setDoc(settingsRef, DEFAULT_SETTINGS).catch(() => {}); }
setIsCloudSyncing(false);
}, () => { setIsCloudSyncing(false); });
const historyRef = collection(db, 'artifacts', appId, 'users', user.uid,
'analysis_history_v88');
unsubHistory = onSnapshot(historyRef, (snap) => {
const hData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
hData.sort((a, b) => b.timestamp - a.timestamp);
setHistoryList(hData);
});
} catch(err) { setIsCloudSyncing(false); }
return () => { unsubSettings(); unsubHistory(); unsubDashboard(); };
}, [user]);
const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000);
};
const handleExportImage = async (pairName) => {
if (isExporting) return;
const node = exportRef.current;
if (!node) { showToast('Tidak ada setup untuk diekspor.'); return; }
setIsExporting(true);
try {
await new Promise(r => setTimeout(r, 400));
const dataUrl = await toPng(node, {
backgroundColor: '#070a10',
pixelRatio: 2,
cacheBust: true,
filter: (el) => !(el.dataset && el.dataset.noExport === 'true')
});
const stamp = new Date().toISOString().slice(0, 10);
const fileName = `ApexQuant_${String(pairName || 'SETUP').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}_${stamp}.png`;
let shared = false;
try {
const blob = await (await fetch(dataUrl)).blob();
const file = new File([blob], fileName, { type: 'image/png' });
if (navigator.canShare && navigator.canShare({ files: [file] })) {
await navigator.share({ files: [file], title: `ApexQuant Setup ${pairName || ''}`.trim() });
shared = true;
}
} catch (shareErr) { shared = false; }
if (!shared) {
const link = document.createElement('a');
link.href = dataUrl; link.download = fileName;
document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
showToast(shared ? 'Setup berhasil dibagikan!' : 'Gambar setup berhasil disimpan!');
} catch (err) {
console.error('Export image failed:', err);
showToast('Gagal membuat gambar setup.');
} finally {
setIsExporting(false);
}
};
const ExportWatermark = ({ pairName }) => (
<div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"><Activity className="w-4 h-4 text-slate-950" /></div>
<div>
<p className="text-[11px] font-black tracking-widest text-white leading-none">APEX<span className="text-amber-400">QUANT</span></p>
<p className="text-[8px] text-slate-500 tracking-widest uppercase mt-0.5">Elite FX &amp; Futures Terminal</p>
</div>
</div>
<div className="text-right">
<p className="text-[10px] font-black text-amber-400 tracking-widest">{String(pairName || '').toUpperCase()}</p>
<p className="text-[8px] text-slate-500 tracking-wider mt-0.5">{new Date().toLocaleString('id-ID')}</p>
</div>
</div>
);
const copyToClipboard = (text) => {
if (!text) return;
const textArea = document.createElement("textarea"); textArea.value = text;
document.body.appendChild(textArea); textArea.select();
document.execCommand('copy'); document.body.removeChild(textArea);
showToast(`Berhasil disalin!`);
};
const handleCopySetupLengkap = (reportText, pairName) => {
if (!reportText) return;
try {
let dirMatch = reportText.match(/(?:🧭\s*)?Arah:\s*(LONG|SHORT)/i);
let direction = dirMatch ? dirMatch[1].toUpperCase() : 'LONG';
let pairInfo = `[${pairName}] (${direction} ${direction === 'LONG' ? '🟢' : '🔴'})`;
const regex = /(.*Harga Entry:.*|.*Harga SL:.*Pips.*|.*Harga TP.*Pips.*)/gi;
const matches = reportText.match(regex);
if (matches) { copyToClipboard(`🔥 APEXQUANT
SETUP\n${pairInfo}\n\n${matches.join('\n')}`); }
else { copyToClipboard(`🔥 APEXQUANT SETUP\n${pairInfo}\n(Salin harga secara
manual)`); }
} catch (e) { showToast("Gagal menyalin setup."); }
};
const handleSaveSettings = async () => {
const finalDraft = { ...safeDraft, leverage, lotSize, predictNews }; setAppConfig(finalDraft);
if (!user || !db) { showToast("Tersimpan Offline"); return; }
try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'preferences_v88'),
finalDraft); showToast("Sistem Berhasil Disimpan ke Cloud!"); }
catch (e) { showToast("Tersimpan Offline"); }
};
const handleSaveExecParams = async () => {
const finalDraft = { ...safeConfig, leverage, lotSize, predictNews };
setAppConfig(finalDraft); setDraftConfig(finalDraft);
if (!user || !db) { showToast("Parameter Tersimpan Lokal"); return; }
try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'preferences_v88'),
finalDraft); showToast("Parameter Tersimpan Permanen ke Cloud!"); }
catch (e) { showToast("Gagal menyimpan ke Cloud"); }
};
const toggleMethod = (method) => {
setDraftConfig(prev => {
const currentMethods = Array.isArray(prev?.methods) ? prev.methods : [];
const newMethods = currentMethods.includes(method) ? currentMethods.filter(m => m
!== method) : [...currentMethods, method];
return { ...prev, methods: newMethods };
});
};
const handleImageUpload = (index, e) => {
const file = e.target.files[0];
if (file) {
const reader = new FileReader();
reader.onloadend = () => {
setScanningStatus(prev => ({...prev, [index]: true}));
setTimeout(() => { setImages(prev => ({ ...prev, [index]: reader.result }));
setScanningStatus(prev => ({...prev, [index]: false})); }, 800);
};
reader.readAsDataURL(file);
}
};
const removeImage = (index) => setImages(prev => ({ ...prev, [index]: null }));
const resetInputs = () => { setPair(''); setImages({ 0: null, 1: null, 2: null }); setErrorMsg('');
setDeepSeekResult(null); };
const handleTabChange = (tab) => { if (tab === 'analyze') resetInputs();
setActiveHistoryItem(null); setActiveTab(tab); };
const handleBackToLastTab = () => setActiveTab(lastTab);
const updateTradeResult = async (historyId, newStatus) => {
if (!user || !db) return;
if (activeHistoryItem && activeHistoryItem.tradeResult !== 'pending') {
showToast("Tindakan Ditolak: Hasil setup ini sudah dikunci permanen."); return; }
setHistoryList(prev => prev.map(item => item.id === historyId ? { ...item, tradeResult:
newStatus } : item));
setActiveHistoryItem(prev => ({ ...prev, tradeResult: newStatus }));
showToast(`Terkunci Permanen: Hasil ditandai sebagai ${newStatus.toUpperCase()}`);
if (user && db) { try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid,
'analysis_history_v88', historyId), { tradeResult: newStatus }); } catch (e) {} }
};
const handleTouchStart = (item) => {
isLongPress.current = false;
pressTimer.current = setTimeout(() => { isLongPress.current = true;
setItemToDelete(item); }, 600);
};
const handleTouchEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
const handleHistoryClick = (e, item) => {
if (isLongPress.current) { e.preventDefault(); e.stopPropagation(); return; }
setActiveHistoryItem(item); setLastTab('history');
};
const confirmDelete = async (id) => {
setHistoryList(prev => prev.filter(i => i.id !== id)); setItemToDelete(null);
if (activeHistoryItem && activeHistoryItem.id === id) setActiveHistoryItem(null);
showToast("Data histori berhasil dihapus.");
if (user && db) { try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid,
'analysis_history_v88', id)); } catch (e) { } }
};
const handleDeleteFromDetail = () => { if(activeHistoryItem)
setItemToDelete(activeHistoryItem); };
const fetchWithBackoff = async (url, options) => {
let delay = 1000;
for (let i = 0; i < 3; i++) {
try {
const response = await fetch(url, options);
if (response.ok) return await response.json();
if (response.status === 401 || response.status === 403) throw new Error("Akses API ditolak. Environment tidak menyuntikkan key yang valid.");
else if (response.status >= 500 && i === 2) throw new Error(`Server API sedang sibuk
atau gangguan (${response.status}).`);
else if (i === 2) throw new Error(`Gagal memproses data (${response.status}).`);
} catch (e) { if (i === 2) throw e; }
await new Promise(r => setTimeout(r, delay)); delay *= 1.5;
}
};
const analyzeLoss = async (item) => {
if (!item || isEvaluating) return;
setIsEvaluating(true);
showToast("Menganalisis penyebab kerugian (Loss)...");
try {
const url = `${API_BASE}/api/llm/generate`;
const promptText = `
Anda adalah AI Elite Quant Analyst. Tugas Anda adalah melakukan Post-Mortem
Analysis (Evaluasi Kesalahan) untuk setup trading yang gagal dan mengenai Stop Loss.
Data Setup:
Pair: ${item.pair}
Waktu Setup Diambil: ${item.dateFormatted}
Laporan Asli AI:
${item.report}
Tugas Anda:
Gunakan Google Search untuk mencari berita makroekonomi, pergerakan whale
(Sosovalue), atau sentimen pasar tak terduga yang terjadi setelah waktu setup tersebut
yang menyebabkan harga berbalik arah secara drastis dan mengenai Stop Loss.
Balas HANYA dengan teks evaluasinya saja, format HANYA SEPERTI INI (tanpa
markdown tambahan di luar blok):
🔍 POST-MORTEM (EVALUASI LOSS):
[Jelaskan 3-4 kalimat analitis yang mendalam mengapa setup ini gagal. Sebutkan
faktor eksternal, fundamental, aliran ETF/On-chain, atau berita mendadak yang merusak
struktur teknikal setup tersebut.]
`;
const payload = { contents: [{ role: "user", parts: [{ text: promptText }] }], tools: [{
google_search: {} }], generationConfig: { temperature: 0.6 } };
const res = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type':
'application/json' }, body: JSON.stringify(payload) });
let textResult = res.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mengekstrak evaluasi.";
textResult = textResult.replace(/```[a-z]*\n?/gi, '').replace(/```/gi, '').trim();
const updatedReport = item.report + '\n\n══════════════════════════\n' +
textResult;
setHistoryList(prev => prev.map(h => h.id === item.id ? { ...h, report: updatedReport } :
h));
setActiveHistoryItem(prev => ({ ...prev, report: updatedReport }));
if (user && db) {
await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'analysis_history_v88',
item.id), { report: updatedReport });
}
showToast("Evaluasi Loss Selesai!");
} catch (err) {
showToast(err.message || "Gagal melakukan evaluasi.");
} finally {
setIsEvaluating(false);
}
};
const formatPriceDisplay = (price) => {
const p = parseFloat(price);
if (isNaN(p)) return price;
if (p > 1000) return p.toFixed(2);
if (p > 1) return p.toFixed(3);
return p.toFixed(5);
};
const buildContextBlock = (mode, liveMarketData, currentIndicators, currentSosoData,
currentTFs) => {
if (mode === 'upload' && !liveMarketData) return '';
let indicatorText = "";
if (liveMarketData && currentIndicators) {
if (mode === 'live' && currentTFs) {
currentTFs.forEach((tf, i) => {
const data = liveMarketData[tf];
const ind = currentIndicators[tf];
if (data && ind) {
const label = i === 0 ? 'LTF (Entry)' : i === 1 ? 'MTF (Confirm)' : 'HTF (Trend)';
const candleText = data.candles.slice(-25).map(c => `${c.time}
O:${formatPriceDisplay(c.open)} H:${formatPriceDisplay(c.high)}
L:${formatPriceDisplay(c.low)} C:${formatPriceDisplay(c.close)}`).join('\n');
indicatorText += `\n[DATA HARGA & INDIKATOR ${label} - TIMEFRAME ${tf}]
Harga saat ini: ${formatPriceDisplay(data.currentPrice)}
RSI(14): ${ind.rsi} | EMA(20): ${ind.ema20} | EMA(50): ${ind.ema50} | ATR: ${ind.atr}
MACD: ${ind.macd.macd} (Signal: ${ind.macd.signal}, Hist: ${ind.macd.histogram})
25 Candle Terakhir (${tf}):
${candleText}\n`;
}
});
} else if (liveMarketData[currentTFs[0]]) {
const tf = currentTFs[0];
const data = liveMarketData[tf];
const ind = currentIndicators[tf];
if (data && ind) {
const candleText = data.candles.slice(-25).map(c => `${c.time}
O:${formatPriceDisplay(c.open)} H:${formatPriceDisplay(c.high)}
L:${formatPriceDisplay(c.low)} C:${formatPriceDisplay(c.close)}`).join('\n');
indicatorText += `\n[DATA INDIKATOR TEKNIKAL REAL-TIME (BACKGROUND
FETCH)]
Harga saat ini: ${formatPriceDisplay(data.currentPrice)}
RSI(14): ${ind.rsi} | EMA(20): ${ind.ema20} | EMA(50): ${ind.ema50} | ATR: ${ind.atr}
MACD: ${ind.macd.macd} (Signal: ${ind.macd.signal}, Hist: ${ind.macd.histogram})
25 Candle Terakhir:
${candleText}\n`;
}
}
}
let sosoText = "";
if (currentSosoData) {
sosoText = `\n[SOSOVALUE ON-CHAIN/ETF DATA API]\n*Sistem diinstruksikan
melacak pergerakan smart money.*\n${currentSosoData}\n`;
}
return `${indicatorText}${sosoText}`;
};
const generateTradingSetup = async () => {
if (dataMode === 'upload') {
if (!pair.trim() || !allImagesUploaded) { setErrorMsg(`Mohon masukkan nama Pair
${selectedMarket} dan unggah 3 screenshot Timeframe.`); return; }
} else {
if (!pair.trim()) { setErrorMsg(`Mohon masukkan pair ${selectedMarket}.`); return; }
}
setLoading(true); if(dataMode === 'live') setLiveDataLoading(true);
setErrorMsg(''); setReport('');
try {
let liveMarketData = {};
let currentIndicators = {};
let currentSosoData = null;
if (dataMode === 'live') {
const fetchPromises = currentTFs.map(async (tf) => {
const data = selectedMarket === 'FUTURES'
? await fetchFuturesLiveData(pair.toUpperCase(), tf)
: await fetchForexLiveData(pair.toUpperCase(), tf);
return { tf, data };
});
const results = await Promise.all(fetchPromises);
results.forEach(res => {
liveMarketData[res.tf] = res.data;
currentIndicators[res.tf] = computeIndicators(res.data.candles);
});
currentSosoData = await fetchSosovalueData(pair.toUpperCase());
} else if (dataMode === 'upload') {
try {
const bgData = selectedMarket === 'FUTURES'
? await fetchFuturesLiveData(pair.toUpperCase(), currentTFs[0])
: await fetchForexLiveData(pair.toUpperCase(), currentTFs[0]);
liveMarketData[currentTFs[0]] = bgData;
currentIndicators[currentTFs[0]] = computeIndicators(bgData.candles);
} catch (e) { console.warn("Failed bg fetch"); }
try { currentSosoData = await fetchSosovalueData(pair.toUpperCase()); } catch (e) {
console.warn("Failed soso fetch"); }
}
const url = `${API_BASE}/api/llm/generate`;
const imageParts = dataMode === 'upload' ? [0, 1, 2].map(i => ({ inlineData: {
mimeType: "image/jpeg", data: images[i].split(',')[1] } })) : [];
const d = new Date(); const currentMonthIndex = d.getMonth(); const currentYear =
d.getFullYear();
const today =
`${d.getDate()}-${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","Septembe r","Oktober","November","Desember"][currentMonthIndex]}-${currentYear}`;
const timeNowDisplay = `${String(d.getHours()).padStart(2,
'0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const allowedPipsRange = PIPS_RANGE[safeConfig.mode] || '10-50';
let tpFormat = '';
if (safeConfig.tpLevel === 'TP1') {
tpFormat = `🎯 Harga TP: [Harga Aktual] (+[Angka Desimal] Pips)`;
} else if (safeConfig.tpLevel === 'TP2') {
tpFormat = `🎯 Harga TP1: [Harga Aktual] (+[Angka Desimal] Pips)\n⚡ Harga TP2:
[Harga Aktual] (+[Angka Desimal] Pips)`;
} else {
tpFormat = `🎯 Harga TP1: [Harga Aktual] (+[Angka Desimal] Pips)\n⚡ Harga TP2:
[Harga Aktual] (+[Angka Desimal] Pips)\n🔥 Harga TP3: [Harga Aktual] (+[Angka Desimal]
Pips)`;
}
let predictiveNewsAddon = '';
if (selectedMarket === 'FX' && predictNews) {
predictiveNewsAddon = `
══════════════════════════
🔮 PREDIKSI NEWS & MAKROEKONOMI
[TUGAS WAJIB: Gunakan Web Search untuk mencari 5 jadwal rilis berita ekonomi
terpenting HARI INI/MINGGU INI dari Forex Factory atau Bloomberg.]
📋 Jadwal Kalender Ekonomi Terkini:
1. [Jam Rilis WIB] ([Hari, Tanggal]) - [Nama Berita] ([High/Medium Impact])
2. [Jam Rilis WIB] ([Hari, Tanggal]) - [Nama Berita] ([High/Medium Impact])
3. [Jam Rilis WIB] ([Hari, Tanggal]) - [Nama Berita] ([High/Medium Impact])
4. [Jam Rilis WIB] ([Hari, Tanggal]) - [Nama Berita] ([High/Medium Impact])
5. [Jam Rilis WIB] ([Hari, Tanggal]) - [Nama Berita] ([High/Medium Impact])
[PILIH 1 BERITA PALING BERDAMPAK DARI DAFTAR DI ATAS UNTUK DIANALISIS]
🔴 Fokus Berita Utama: [Nama Berita]
Forecast: [Angka Forecast Riil]
Previous: [Angka Previous Riil]
🤖 Prediksi AI: [Sebutkan prediksi angkanya, jelaskan alasan perbandingan masa lalunya
secara logis]
Interpretasi saat data keluar:
✅ Jika Actual > Forecast
- [Dampak real-time ke USD]
- [Dampak real-time ke Pair ${pair.toUpperCase()}]
✅ Jika Actual < Forecast
- [Dampak real-time ke USD]
- [Dampak real-time ke Pair ${pair.toUpperCase()}]
══════════════════════════
`;
}
let calibrationText = "";
if (safeConfig.useHistoryCalibration) {
const relevantHistory = historyList.filter(h => h.pair === pair.toUpperCase() && h.mode
=== safeConfig.mode && h.persona === safeConfig.aiPersona);
const closedTrades = relevantHistory.filter(h => h.tradeResult === 'win' ||
h.tradeResult === 'loss');
if (closedTrades.length >= 3) {
const wins = closedTrades.filter(h => h.tradeResult === 'win').length;
const winrate = Math.round((wins / closedTrades.length) * 100);
calibrationText = `\n[KALIBRASI PERFORMA HISTORIS USER]\nData historis
nyata user untuk pair ${pair.toUpperCase()} pada mode ${safeConfig.mode} dengan
persona ${safeConfig.aiPersona} menunjukkan Win Rate: ${winrate}% dari
${closedTrades.length} trade terakhir.\nInstruksi Tambahan: Jika win rate di bawah 50%,
bersikaplah SANGAT KONSERVATIF, perketat filter sideways, dan jangan ragu untuk
memberi status NO TRADE jika setup tidak sempurna. Jika di atas 50%, Anda bisa
mengeksekusi probabilitas teknikal yang ada.\n`;
}
}
const contextBlock = buildContextBlock(dataMode, liveMarketData, currentIndicators,
currentSosoData, currentTFs);
const promptText = `
Anda adalah AI Elite Quant Analyst. Analisis market ${pair.toUpperCase()} ini secara akurat.
**GAYA ANALISIS & KEPUTUSAN (WAJIB DIIKUTI 100%):** Anda HARUS meniru gaya,
pemikiran, manajemen risiko, dan filosofi trading dari **${safeConfig.aiPersona}**.
Adaptasikan gaya tokoh ini ke dalam penyampaian teknikal Anda. Sinyal yang Anda berikan
WAJIB disinkronkan dengan rilis berita/sentimen fundamental yang sedang terjadi HARI INI,
termasuk data aliran ETF dan On-Chain dari Sosovalue. Jika sinyal teknikal bertentangan
dengan berita fundamental aktual ATAU bertentangan dengan filosofi
${safeConfig.aiPersona}, batalkan setup (Tulis NO TRADE).
${contextBlock}
ATURAN WAJIB (DIIKUTI 100%):
1. **Volatilitas Dinamis & Jarak Pips:** Mode saat ini adalah ${safeConfig.mode}. Oleh
karena itu, target pips untuk TP terjauh WAJIB berada di rentang **${allowedPipsRange}
pips**. Untuk TP terdekat/SL, sesuaikan secara logis berdasar Target Rasio (R:R)
${safeConfig.rr} dan Volatilitas riil (ATR) dari aset ini. Jarak pips tidak boleh diluar range ini!
2. **Kalkulasi Probabilitas Dinamis:** Angka % probabilitas/akurasi TIDAK BOLEH ACAK!
Hitung dari agregat skor teknikal (Trend, SMC, Volume) dan Fundamental. Jika market
buruk, berikan angka di bawah ${safeConfig.confidenceThreshold}% atau tulis NO TRADE.
3. **AKURASI MATEMATIS HARGA & PIPS (MUTLAK):** Nilai angka desimal di belakang
koma pada Harga Entry, SL, dan setiap TP **TIDAK BOLEH SAMA / KEMBAR** (contoh
salah: Entry 63533.41, TP1 64877.41, TP2 65000.41 -> Ini DILARANG KERAS!). Anda
WAJIB menghitung harga secara persis dan realistis berdasarkan kalkulasi
penambahan/pengurangan pips riil yang Anda sebutkan di dalam kurung. DILARANG
KERAS menggunakan angka bulat murni!
4. **Berita & Sentimen:** WAJIB TULIS SATU PARAGRAF PENUH TANPA
ENTER/NEWLINE (Gabungkan semua kalimat menjadi satu blok teks panjang, minimal 4
kalimat komprehensif).
5. **Markdown Bintang:** Gunakan tanda bintang DUA (**Teks**) HANYA untuk penekanan
NAMA ASET/INDEKS (contoh: **NFP**, **Indeks DXY**). Gunakan tanda bintang SATU
(*Teks*) HANYA untuk ISTILAH TEKNIKAL. JANGAN BERI SPASI DI DALAM BINTANG.
6. **Korelasi Intermarket (WAJIB):** Cek Indeks DXY & US10Y (Forex) atau BTC
Dominance & S&P500 (Crypto). Validasi apakah sejalan dengan arah sinyal.
7. **Filter Sesi (WAJIB):** Evaluasi jam saat ini (${timeNowDisplay}). Tentukan sesi (Asia,
London, New York) dan peringatkan risikonya.
8. **Skenario Chart 1-10 (WAJIB):** Anda HARUS membuat tepat 10 langkah Skenario
Chart yang berurutan.
9. JANGAN MENGGUNAKAN HEADER "### === FORMAT 1 ===". MULAI LANGSUNG
DARI KATA "🏷 Tipe Order:".
10. **ANTI-N/A PADA PREDIKSI NEWS:** Jika bagian 🔮 PREDIKSI NEWS aktif, Anda
DIWAJIBKAN menampilkan 5 daftar Kalender Ekonomi nyata hari ini via Web Search.
DILARANG KERAS mengisi dengan N/A.
11. **ORDER TYPE LABEL (MUTLAK):** Di baris PALING ATAS, tuliskan "🏷 Tipe Order:
[JENIS]" di mana jenisnya adalah Market Order, Buy Limit, Sell Limit, Buy Stop, atau Sell
Stop. Tentukan ini berdasarkan posisi harga entry terhadap harga saat ini secara logis.
${calibrationText}
🏷 Tipe Order: [Isi Tipe Order berdasar letak entry]
🤖 EARLY CALL BY AI AGENT
📅 Called on: ${today}
🕑 Time: ${timeNowDisplay}
🧭 Arah: [LONG atau SHORT]
📈 Chart Pattern: [NAMA POLA]
📊 Potensial set up: [% Hasil Kalkulasi Skor Riil] - [Penjelasan potensi berdasar SENTIMEN
NEWS]
💰 Harga Entry: [Harga Aktual]
🛡 Harga SL: [Harga Aktual] (-[Angka Pips Risiko] Pips)
${tpFormat}
🔍 Mode: ${safeConfig.mode} (Target Pips ${allowedPipsRange}) (Volatilitas Pair:
[Tinggi/Sedang/Rendah])
💬 Alasan: [Alasan teknikal yang panjang dan analitis berdasar gambar/data, silangkan juga
dengan data ETF/On-chain dari Sosovalue jika relevan]
Trend + struktur: [Kondisi trend] - ([Isi penjelasan struktur mendalam])
Candle: [Sebutkan 1 jenis candle terakhir beserta konfirmasinya]
══════════════════════════
🌍 Intermarket Correlation: [Tuliskan korelasi dengan DXY/US10Y atau BTC.D dan
dampaknya pada setup ini secara singkat]
🕰 Session Impact: [Evaluasi jam saat ini dan sebutkan sesinya beserta peringatan risiko
sesinya]
${predictiveNewsAddon}
📊 Berita & Sentimen (Live): [TULIS SELURUH ANALISIS BERITA DALAM SATU
PARAGRAF PANJANG TANPA ENTER SAMA SEKALI. Minimal 4 kalimat komprehensif.]
📊 Market Condition: [Uptrend/Sideways/Downtrend]
📊 Metode Analisa: ${activeMethods.join(', ')}
📊 Gaya Pemikiran AI: ${safeConfig.aiPersona}
📊 Money Management: Risiko per trade disarankan ${safeConfig.risk}
📊 Eksekusi Trading: ${selectedMarket === 'FUTURES' ? `Leverage ${leverage}x` : `Lot
Size ${lotSize}`}
📊 Area Buyer: [Isi range level support] ( *Demand Zone* )
📊 Area Seller: [Isi range level resistance] ( *Supply Zone* )
📊 Smart Money Concept: [Detail Institusi]
📊 Invalidasi Setup: [Sebutkan level harga spesifik yang jika tersentuh membuat setup ini
batal] - [Rencana lanjutan: apakah tunggu re-entry di level tersebut, atau setup dianggap
gugur total dan cari peluang lain]
📊 Sideways Filter:
- Jenis sideways: [Isi detail riil, JANGAN N/A]
- Range: [Isi rentang harga]
- Posisi harga: [Isi posisi harga terhadap range]
- Validasi sweep: [Isi penjelasan sweep liquidity]
- Risiko fake signal: [Isi tingkat risiko]
- Keputusan: [Isi keputusan eksekusi]
📊 Sideways Range Specialist:
- Range utama: [Isi level range utama]
- Posisi harga: [Isi posisi harga]
- Setup terbaik: [Isi strategi setup terbaik]
- Validitas: [Isi tingkat validitas]
- Catatan risiko: [Isi catatan risiko spesifik]
📊 Fake Signal Protection:
- Area rawan trap: [Isi level atau area rawan jebakan]
📊 Validitas Entry: [Tinggi/Sedang/Rendah]
📊 Scenario Chart:
1. [Langkah/Skenario 1]
2. [Langkah/Skenario 2]
3. [Langkah/Skenario 3]
4. [Langkah/Skenario 4]
5. [Langkah/Skenario 5]
6. [Langkah/Skenario 6]
7. [Langkah/Skenario 7]
8. [Langkah/Skenario 8]
9. [Langkah/Skenario 9]
10. [Langkah/Skenario 10]
`;
const payload = { contents: [{ role: "user", parts: [{ text: promptText }, ...imageParts] }],
tools: [{ google_search: {} }], generationConfig: { temperature: 0.6 } };
const data = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type':
'application/json' }, body: JSON.stringify(payload) });
const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal memproses analisis.";
let cleanedReport = textResult.replace(/```[a-z]*\n?/gi, '').replace(/```/gi,
'').replace(/#*\s*={1,3}\s*FORMAT 1.*$/gim, '').replace(/#*\s*={1,3}\s*FORMAT 2.*$/gim,
'').trim();
const confidenceMatch = cleanedReport.match(/Potensial set up:\s*(\d+)%/i);
const currentConfidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 100;
let dsVerification = null;
let finalStatus = 'pending';
let isNoTrade = cleanedReport.includes('🚫') || cleanedReport.includes('NO TRADE');
if (currentConfidence < safeConfig.confidenceThreshold && !isNoTrade) {
isNoTrade = true;
cleanedReport = cleanedReport.replace(
/🧭 Arah:.*/,
`⚠ SINYAL DITOLAK OTOMATIS (Confidence ${currentConfidence}% < Threshold
${safeConfig.confidenceThreshold}%)\n${cleanedReport.match(/🧭 Arah:.*/)?.[0] || '🧭 Arah: NEUTRAL'}`
);
}
if (!isNoTrade) {
const validationIndicators = currentIndicators[currentTFs[0]] || null;
dsVerification = await verifyWithDeepSeek(cleanedReport, validationIndicators,
pair.toUpperCase());
if (dsVerification) {
setDeepSeekResult(dsVerification);
if (dsVerification.verified === false) {
// Perbedaan analisis AI -> setup DIBATALKAN TOTAL, hanya pesan singkat NO TRADE.
isNoTrade = true;
finalStatus = 'rejected';
const biasAwal = cleanedReport.match(/Arah:\s*(LONG|SHORT)/i)?.[1]?.toUpperCase() || null;
cleanedReport = buildNoTradeReport(pair.toUpperCase(), dsVerification.reason, biasAwal,
currentConfidence);
}
}
}
if (isNoTrade && finalStatus !== 'rejected') {
finalStatus = 'no_trade';
}
const newDocId = Date.now().toString();
const newHistoryObj = {
id: newDocId, pair: pair.toUpperCase(), marketType: selectedMarket, report:
cleanedReport,
mode: safeConfig.mode, persona: safeConfig.aiPersona, status: finalStatus,
tradeResult: finalStatus === 'rejected' ? 'rejected' : 'pending',
timestamp: Date.now(), month: currentMonthIndex, year: currentYear, dateFormatted:
today,
deepSeekVerification: dsVerification
};
setHistoryList(prev => [newHistoryObj, ...prev]);
if (user && db) { try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid,
'analysis_history_v88', newDocId), newHistoryObj); } catch (e) {} }
setReport(cleanedReport); setLastTab(activeTab); setActiveTab('result');
if (dataMode === 'upload') setImages({ 0: null, 1: null, 2: null });
} catch (err) { setErrorMsg(err.message || "Gagal memproses AI. Pastikan koneksi internet stabil atau cek penulisan pair Anda."); }
finally { setLoading(false); setLiveDataLoading(false); }
};
const renderCardsAndReport = (text, pairNameContext, dsVerificationData = null) => {
if (!text || typeof text !== 'string') return null;
const sanitizeText = text.replace(/,/g, '.');
let dirMatch = sanitizeText.match(/(?:🧭\s*)?Arah:\s*(LONG|SHORT)/i);
let direction = dirMatch ? dirMatch[1].toUpperCase() : null;
let orderTypeMatch = sanitizeText.match(/(?:🏷\s*)?Tipe Order:\s*(.*)/i);
let orderTypeLabel = orderTypeMatch ? orderTypeMatch[1].trim() : null;
const extractPips = (lineStr) => {
if(!lineStr) return null;
const match = lineStr.match(/\(\s*[-+]?\s*([\d.]+)\s*Pips?\s*\)/i);
return match && match[1] && match[1] !== "undefined" ? match[1] : null;
};
let lines = sanitizeText.split('\n');
let entryLine = lines.find(l => l.match(/Harga Entry:/i));
let slLine = lines.find(l => l.match(/Harga SL:/i));
let entry = entryLine ? entryLine.match(/Harga Entry:\s*([\d.]+)/i)?.[1] : null;
let sl = slLine ? slLine.match(/Harga SL:\s*([\d.]+)/i)?.[1] : null;
let slPips = slLine ? extractPips(slLine) : null;
const extractTP = (tpLabel) => {
const regex = new RegExp(`Harga\\s*${tpLabel}\\s*:\\s*([\\d.]+)(?:[^\\(\\n]*\\(\\s*[-+]?\\s*([\\d.]+)\\s*Pips?\\s*\\))?`, 'i');
const match = sanitizeText.match(regex);
return match ? { price: match[1], pips: match[2] && match[2] !== "undefined" ? match[2]
: null } : null;
}
let tps = [];
const tpTunggal = extractTP('TP'); if (tpTunggal && !sanitizeText.includes('Harga TP1:'))
tps.push({ label: 'TAKE PROFIT', price: tpTunggal.price, pips: tpTunggal.pips });
const tp1 = extractTP('TP1'); if (tp1) tps.push({ label: 'TAKE PROFIT 1', price: tp1.price,
pips: tp1.pips });
const tp2 = extractTP('TP2'); if (tp2) tps.push({ label: 'TAKE PROFIT 2', price: tp2.price,
pips: tp2.pips });
const tp3 = extractTP('TP3'); if (tp3) tps.push({ label: 'TAKE PROFIT 3', price: tp3.price,
pips: tp3.pips });
let dsBadge = null;
const isNoTradeReport = /NO TRADE/i.test(sanitizeText) || sanitizeText.includes('🚫');
if (dsVerificationData && !isNoTradeReport) {
if (dsVerificationData.verified) {
dsBadge = (
<div className="w-full mt-4 bg-emerald-500/10 border border-emerald-500/30 p-3 sm:p-4 rounded-xl flex items-start gap-3 animate-in fade-in shadow-sm">
<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0 mt-0.5" />
<div>
<span className="text-[11px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest block mb-1">✅ Terverifikasi Dual-AI (DeepSeek)</span>
<span className="text-[11px] sm:text-xs text-emerald-200/80 leading-relaxed block">{dsVerificationData.reason}</span>
</div>
</div>
);
} else {
dsBadge = (
<div className="w-full mt-4 bg-red-500/10 border border-red-500/30 p-3 sm:p-4 rounded-xl flex items-start gap-3 animate-in fade-in shadow-sm">
<AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 shrink-0 mt-0.5" />
<div>
<span className="text-[11px] sm:text-xs font-black text-red-400 uppercase tracking-widest block mb-1">⚠ Perbedaan Analisis AI — Tinjau Manual</span>
<span className="text-[11px] sm:text-xs text-red-200/80 leading-relaxed block">{dsVerificationData.reason}</span>
</div>
</div>
);
}
}
let renderHeader = null;
const displayPair = pairNameContext || pair.toUpperCase() || 'PAIR';
if (direction) {
renderHeader = (
<div className="mb-6 flex flex-col w-full">
<div className="flex flex-wrap items-center gap-3">
<div className="text-xl sm:text-2xl font-black text-white tracking-widest bg-[#111820] border border-white/5 px-4 py-2 rounded-[16px] shadow-md">
[{displayPair}]
</div>
<div className={`font-black text-[13px] sm:text-sm px-4 py-2.5 rounded-xl border
shadow-sm flex items-center gap-2 uppercase ${direction === 'LONG' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
{direction} {direction === 'LONG' ? '🟢' : '🔴'}
</div>
{orderTypeLabel && (
<div className="font-black text-[13px] sm:text-sm px-4 py-2.5 rounded-xl border shadow-sm flex items-center gap-2 uppercase text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
<ListOrdered className="w-4 h-4"/> {orderTypeLabel}
</div>
)}
</div>
{dsBadge}
</div>
);
}
let cleanText = lines.filter(line => {
if (line.match(/Harga Entry:/i)) return false;
if (line.match(/Harga SL:/i)) return false;
if (line.match(/Harga TP/i)) return false;
if (line.match(/(?:🧭\s*)?Arah:/i)) return false;
if (line.match(/Tipe Order:/i)) return false;
if (line.match(/EARLY CALL BY AI AGENT/i)) return false;
if (line.includes('⚠ SINYAL DITOLAK OTOMATIS')) return false;
return true;
}).join('\n').trim();
const renderMarkdown = (textStr) => {
if(!textStr) return null;
const parts = textStr.split(/(\*\*.*?\*\*|\*.*?\*)/g);
return parts.map((part, i) => {
if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
return <span key={i} className="font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 mx-0.5 rounded shadow-[0_0_10px_rgba(245,158,11,0.2)] border border-amber-500/40 inline-block leading-tight">{part.slice(2, -2)}</span>;
} else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
return <span key={i} className="font-bold text-emerald-300 italic bg-emerald-500/10 px-1.5 py-0.5 mx-0.5 rounded border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)] inline-block leading-tight">{part.slice(1,
-1)}</span>;
}
return <span key={i}>{part}</span>;
});
};
const renderInlineText = (line, idx) => {
let className = "min-h-[1.5rem] text-[13px] sm:text-sm text-slate-300 leading-relaxed mb-2.5 whitespace-pre-wrap ";
if (line.trim().startsWith('NO TRADE')) {
return (
<div key={idx} className="w-full bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-5 sm:p-6 mb-4 mt-1 shadow-[0_0_25px_rgba(239,68,68,0.15)] animate-in fade-in flex items-center gap-4">
<Ban className="w-9 h-9 sm:w-11 sm:h-11 text-red-500 shrink-0" />
<div>
<div className="text-2xl sm:text-3xl font-black text-red-500 tracking-widest leading-none">NO TRADE 🚫</div>
<div className="text-[10px] sm:text-[11px] font-bold text-red-300/70 uppercase tracking-widest mt-2">Setup dibatalkan — tidak ada entry, SL, atau TP</div>
</div>
</div>
);
}
if (line.trim().startsWith('ALASANNYA:')) {
return (
<div key={idx} className="w-full bg-[#141a22] border border-red-500/25 rounded-2xl p-4 sm:p-5 mb-5 shadow-md animate-in fade-in">
<span className="text-[10px] sm:text-[11px] font-black text-red-400 uppercase tracking-widest block mb-2">Alasannya</span>
<span className="text-[13px] sm:text-sm text-red-100/85 font-medium leading-relaxed block">
{renderMarkdown(line.replace(/^\s*ALASANNYA:\s*/i, '').trim())}
</span>
</div>
);
}
if (line.startsWith('📊 Berita & Sentimen')) {
return (
<div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 my-5 shadow-sm">
<span className="font-bold text-amber-300 tracking-wide block mb-2">📊 Berita
& Sentimen (Live):</span>
<span className="text-amber-400 font-medium leading-relaxed text-[13px] sm:text-sm block">
{renderMarkdown(line.replace('📊 Berita & Sentimen (Live):', '').trim())}
</span>
</div>
);
}
if (line.startsWith('🔍 POST-MORTEM')) {
return (
<div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 my-6 shadow-md animate-in fade-in">
<span className="font-black text-red-400 tracking-wide flex items-center gap-2 mb-3 text-sm border-b border-red-500/20 pb-2">
<Search className="w-5 h-5"/> POST-MORTEM (EVALUASI LOSS):
</span>
<span className="text-red-300 font-medium leading-relaxed text-[13px] sm:text-sm block">
{renderMarkdown(line.replace('🔍 POST-MORTEM (EVALUASI LOSS):',
'').replace('🔍 POST-MORTEM:', '').trim())}
</span>
</div>
);
}
if (line.startsWith('🌍 Intermarket Correlation') || line.startsWith('🕰 Session Impact')) {
return (
<div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 my-3 shadow-sm border-l-4 border-l-blue-400">
<span className="text-blue-300 font-medium leading-relaxed text-[13px] sm:text-sm block">
{renderMarkdown(line)}
</span>
</div>
);
}
if (line.includes('🔮 PREDIKSI NEWS')) className += "text-indigo-400 font-black text-base mt-6 mb-4 flex items-center gap-2 border-b border-indigo-500/30 pb-2";
else if (line.startsWith('📋 Jadwal Kalender')) className += "text-indigo-300 font-bold mb-2 uppercase tracking-widest text-[11px] sm:text-xs";
else if (line.startsWith('🔴 Fokus Berita') || line.startsWith('🔴 Jadwal News') ||
line.startsWith('🔴')) className += "text-red-400 font-bold bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20 mb-3 mt-4 shadow-sm";
else if (line.startsWith('Forecast:') || line.startsWith('Previous:')) className +=
"text-slate-300 font-medium pl-2";
else if (line.startsWith('✅ Jika Actual')) className += "text-emerald-400 font-bold mt-4 mb-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit";
else if (line.includes('NO TRADE') || line.includes('🚫')) className += "text-red-500 font-bold text-lg mb-2";
else if (line.startsWith('📊')) className += "text-cyan-300 font-bold mt-5 mb-1 border-b border-white/5 pb-1";
else if (line.startsWith('- ')) className += "pl-3.5 border-l-2 border-slate-600/50 ml-1.5 py-0.5 text-slate-300 bg-slate-800/20 rounded-r-lg mb-1.5";
else if (/^\d+\./.test(line)) className += "pl-2 py-0.5 text-slate-300 mb-1";
else if (line.startsWith('📅') || line.startsWith('🕑') || line.startsWith('🔍')) className +=
"text-slate-400";
else if (line.includes('════')) return <div key={idx} className="my-6 border-t border-slate-700/50 w-full shadow-sm"></div>;
const badgeRegex = new RegExp(`(${LABELS_TO_BADGE.map(l =>
l.replace(/[.*+?^$\/()|\[\]\\]/g, '\\$&')).join('|')})`, 'g');
const parts = line.split(badgeRegex);
return (
<div key={idx} className={className}>
{parts.map((part, i) => {
if (LABELS_TO_BADGE.includes(part)) {
return <span key={i} className="font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 mx-1 rounded border border-amber-500/30 shadow-sm inline-block mb-1 tracking-wide">{part}</span>;
} else {
return <span key={i}>{renderMarkdown(part)}</span>;
}
})}
</div>
);
};

const EntryCard = () => (
<div className="bg-[#111820] rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 mb-4 border border-white/5 shadow-2xl flex items-center justify-between group transition-all col-span-full">
<div><div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Harga Entry</div><div className="text-3xl sm:text-4xl font-black text-white tracking-tight">{entry}</div></div>
<button onClick={() => copyToClipboard(entry)} className="p-3 sm:p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-full transition-all border border-emerald-500/30 shadow-lg focus:outline-none focus:ring-0 outline-none"><Copy className="w-5 h-5 sm:w-6 sm:h-6" /></button>
</div>
);
const SLCard = ({ fullWidth }) => (
<div className={`bg-[#111820] rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 border
border-white/5 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all
h-full ${fullWidth ? 'col-span-full mb-4' : ''}`}>
<div className="flex justify-between items-start mb-6"><div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-tight">Stop
Loss</div><button onClick={() => copyToClipboard(sl)} className="p-2 sm:p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/30 flex-shrink-0 shadow-sm focus:outline-none focus:ring-0 outline-none"><Copy className="w-4 h-4 sm:w-5 sm:h-5" /></button></div>
<div className="mb-2 mt-auto">
<div className={`font-black text-white tracking-tight leading-none mb-2 ${fullWidth ?
'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>{sl}</div>
{safeConfig.showPips && slPips && <div className="text-[11px] sm:text-xs font-bold text-red-400 mb-4">-{slPips} pips</div>}
</div>
<div className="absolute bottom-0 left-5 right-5 h-1.5 bg-red-500 rounded-t-lg shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
</div>
);
const TPCard = ({ tp, compact }) => (
<div className={`bg-[#111820] rounded-[20px] sm:rounded-[24px] border
border-white/5 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all
h-full ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}>
<div className="flex justify-between items-start mb-6"><div className={`font-bold
text-slate-500 uppercase tracking-widest leading-tight ${compact ? 'text-[9px] sm:text-[10px] w-16' : 'text-[10px] sm:text-xs'}`}>{tp.label}</div><button onClick={() =>
copyToClipboard(tp.price)} className={`bg-emerald-500/10 hover:bg-emerald-500/20
text-emerald-400 rounded-xl transition-all border border-emerald-500/30 flex-shrink-0
shadow-sm focus:outline-none focus:ring-0 outline-none ${compact ? 'p-2' : 'p-2 sm:p-2.5'}`}><Copy className={`${compact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-5 sm:h-5'}`} /></button></div>
<div className="mb-2 mt-auto">
<div className={`font-black text-white tracking-tight leading-none mb-2 ${compact ?
'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>{tp.price}</div>
{safeConfig.showPips && tp.pips && <div className={`font-bold text-emerald-400
mb-4 ${compact ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'}`}>+{tp.pips}
pips</div>}
</div>
<div className="absolute bottom-0 left-5 right-5 h-1.5 bg-emerald-500 rounded-t-lg shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
</div>
);
if (text.includes('🚫') || text.includes('NO TRADE') || text.includes('⚠ SINYAL DITOLAK OTOMATIS')) {
let rejectionText = text;
if (text.includes('⚠ SINYAL DITOLAK OTOMATIS')) {
const rejectionReason = text.match(/⚠ SINYAL DITOLAK OTOMATIS(.*)/i)?.[0] ||
'⚠ SINYAL DITOLAK OTOMATIS';
rejectionText = `<div class="bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-4 font-black text-red-400 uppercase tracking-widest shadow-lg flex flex-col gap-2"><div class="flex items-center gap-2">GAGAL MELEWATI GATE KEAMANAN AI</div><div class="text-xs text-red-300 font-medium normal-case">${rejectionReason.replace('⚠ SINYAL DITOLAK OTOMATIS', '').replace(/^[\s(]+|[\s)]+$/g, '').trim()}</div></div>\n\n` + text;
}
return (
<div className="w-full font-sans animate-in fade-in duration-200">
{renderHeader}
{(entry && sl && tps.length > 0) && (
<div className="w-full mb-8">
{tps.length === 1 && (<><EntryCard /><div className="grid grid-cols-2 gap-4"><SLCard fullWidth={false} /><TPCard tp={tps[0]} compact={false} /></div></>)}
{tps.length === 2 && (<div className="flex flex-col"><EntryCard /><SLCard fullWidth={true} /><div className="grid grid-cols-2 gap-4"><TPCard tp={tps[0]} compact={false} /><TPCard tp={tps[1]} compact={false} /></div></div>)}
{tps.length >= 3 && (<div className="flex flex-col"><EntryCard /><SLCard fullWidth={true} /><div className="grid grid-cols-3 gap-3 sm:gap-4"><TPCard tp={tps[0]} compact={true} /><TPCard tp={tps[1]} compact={true} /><TPCard tp={tps[2]} compact={true} /></div></div>)}
</div>
)}
<div className="space-y-1 bg-[#0b1016] rounded-2xl p-5 border border-white/5 shadow-lg">{rejectionText.split('\n').map((line, idx) => {
if (line.includes('<div class="bg-red-500/20')) {
return <div key={idx} dangerouslySetInnerHTML={{__html: line}}></div>;
}
return renderInlineText(line, idx);
})}</div>
</div>
);
}
return (
<div className="w-full font-sans animate-in fade-in duration-200">
{renderHeader}
<div className="w-full mb-8">
{tps.length === 1 && entry && sl && (<><EntryCard /><div className="grid grid-cols-2 gap-4"><SLCard fullWidth={false} /><TPCard tp={tps[0]} compact={false}
/></div></>)}
{tps.length === 2 && entry && sl && (<div className="flex flex-col"><EntryCard
/><SLCard fullWidth={true} /><div className="grid grid-cols-2 gap-4"><TPCard tp={tps[0]}
compact={false} /><TPCard tp={tps[1]} compact={false} /></div></div>)}
{tps.length >= 3 && entry && sl && (<div className="flex flex-col"><EntryCard
/><SLCard fullWidth={true} /><div className="grid grid-cols-3 gap-3 sm:gap-4"><TPCard
tp={tps[0]} compact={true} /><TPCard tp={tps[1]} compact={true} /><TPCard tp={tps[2]}
compact={true} /></div></div>)}
</div>
<div className="bg-[#0b1016] rounded-2xl p-5 sm:p-7 border border-white/5 border-l-4 border-l-amber-500 shadow-xl relative overflow-hidden">
{cleanText.split('\n').map((line, idx) => renderInlineText(line, idx))}
</div>
</div>
);
};
const currentMonth = new Date().getMonth(); const currentYear = new Date().getFullYear();
const displayedHistory = (historyList || []).filter(item => item && item.marketType ===
historyFilter);
const thisMonthHistory = displayedHistory.filter(item => {
if (!item) return false;
if (item.month !== undefined && item.year !== undefined) return item.month ===
currentMonth && item.year === currentYear;
if (item.timestamp) { const d = new Date(item.timestamp); return d.getMonth() ===
currentMonth && d.getFullYear() === currentYear; }
return false;
});
const wins = thisMonthHistory.filter(i => i.tradeResult === 'win').length; const losses =
thisMonthHistory.filter(i => i.tradeResult === 'loss').length; const beps =
thisMonthHistory.filter(i => i.tradeResult === 'bep').length;
const totalClosed = wins + losses; const winrate = totalClosed > 0 ? Math.round((wins /
totalClosed) * 100) : 0;
const isHistoryItemLocked = activeHistoryItem ? (activeHistoryItem.tradeResult !==
'pending' && activeHistoryItem.tradeResult !== 'no_trade') : false;
const filteredMethods = ANALYSIS_METHODS.filter(method =>
method.toLowerCase().includes((searchTerm || '').toLowerCase()));
if (isCloudSyncing) return <div className="min-h-screen bg-[#070a10] flex flex-col items-center justify-center text-amber-500"><Loader2 className="w-10 h-10 animate-spin mb-4" /><p className="text-xs font-bold tracking-widest uppercase text-slate-500">Mengkoneksikan Database...</p></div>;
return (
<div className="min-h-screen bg-[#070a10] text-slate-200 font-sans selection:bg-amber-500/30 antialiased overflow-x-hidden pb-28">
<style>{`.custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02);
border-radius: 8px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 158,
11, 0.3); border-radius: 8px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:
rgba(245, 158, 11, 0.5); }`}</style>
{toastMsg && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-slate-950 px-4 py-2 rounded-full font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-2"><CheckCircle
className="w-4 h-4" /> {toastMsg}</div>}
{showRecModal && (
<div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
<div className="bg-[#0b1016] border border-white/10 rounded-[24px] w-full max-w-md shadow-2xl animate-in fade-in duration-200 flex flex-col max-h-[85vh] overflow-hidden">
<div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#111820]">
<div className="flex items-center gap-2">
<div className="p-2 bg-amber-500/20 rounded-lg"><Lightbulb className="w-5 h-5 text-amber-400" /></div>
<h3 className="text-sm font-black text-white tracking-widest uppercase">Panduan Setting AI (Elite)</h3>
</div>
<button onClick={() => setShowRecModal(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-all text-slate-400 focus:outline-none focus:ring-0 outline-none"><X className="w-4 h-4" /></button>
</div>
<div className="flex bg-[#0b1016] p-1 border border-white/5 rounded-xl mb-4 mx-4 mt-4 flex-shrink-0">
{['Scalping', 'Intraday', 'Swing'].map(tab => (
<button key={tab} onClick={() => setActiveRecTab(tab)} className={`flex-1
py-3 text-[11px] font-black tracking-widest rounded-lg transition-all focus:outline-none
focus:ring-0 outline-none border ${activeRecTab === tab ? 'bg-[#1a232f] text-amber-400 border-amber-500/30 shadow-md' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>
{tab.toUpperCase()}
</button>
))}
</div>
<div className="p-5 pt-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
<div key={activeRecTab} className="animate-in fade-in duration-200">
<div className="grid grid-cols-3 gap-2 mb-3">
<div className="bg-[#070a10] border border-white/5 rounded-xl p-3 text-center">
<div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Max TP</div>
<div className="text-[11px] font-black text-emerald-400 leading-tight">{RECOMMENDATIONS[activeRecTab].tp}</div>
</div>
<div className="bg-[#070a10] border border-white/5 rounded-xl p-3 text-center">
<div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Rasio R:R</div>
<div className="text-[11px] font-black text-blue-400 leading-tight">{RECOMMENDATIONS[activeRecTab].rr}</div>
</div>
<div className="bg-[#070a10] border border-white/5 rounded-xl p-3 text-center">
<div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Profil AI</div>
<div className="text-[11px] font-black text-cyan-400 leading-tight">{RECOMMENDATIONS[activeRecTab].profil}</div>
</div>
</div>
<div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-center mb-6 shadow-sm">
<div className="text-[9px] text-indigo-400/70 font-bold uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><UserCheck className="w-3 h-3"/> Rekomendasi Persona AI</div>
<div className="text-[12px] font-black text-indigo-300 leading-tight">{RECOMMENDATIONS[activeRecTab].persona}</div>
</div>
<h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-amber-500" /> Tepat
15 Metode Akurasi Tinggi Disarankan</h4>
<div className="space-y-2">
{RECOMMENDATIONS[activeRecTab].methods.map((met, idx) => (
<div key={idx} className="bg-[#111820] border border-white/5 rounded-xl p-3 flex flex-col gap-1 hover:border-amber-500/20 transition-colors">
<span className="text-xs font-bold text-amber-300">{idx + 1}.
{met.name}</span>
<span className="text-[10px] text-slate-400 leading-relaxed">{met.desc}</span>
</div>
))}
</div>
</div>
</div>
</div>
</div>
)}
{itemToDelete && (
<div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
<div className="bg-[#111820] border border-red-500/30 rounded-[24px] p-6 max-w-xs w-full shadow-2xl animate-in fade-in duration-200">
<div className="flex flex-col items-center text-center">
<ShieldAlert className="w-14 h-14 text-red-500 mb-4" />
<h3 className="text-xl font-black text-white mb-2 tracking-tight">Hapus
Riwayat?</h3>
<p className="text-xs text-slate-400 mb-6 leading-relaxed">Anda yakin ingin
menghapus hasil analisis <strong
className="text-white">{itemToDelete.pair}</strong>?</p>
<div className="flex gap-3 w-full">
<button onClick={() => setItemToDelete(null)} className="flex-1 py-3.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-800/50 hover:bg-slate-700 border border-white/5 uppercase tracking-widest focus:outline-none focus:ring-0 outline-none">Batal</button>
<button onClick={() => confirmDelete(itemToDelete.id)} className="flex-1 py-3.5 rounded-xl font-bold text-xs text-white bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] uppercase tracking-widest focus:outline-none focus:ring-0 outline-none">Hapus</button>
</div>
</div>
</div>
</div>
)}
<div className="fixed inset-0 pointer-events-none overflow-hidden">
<div className="absolute top-[-10%] left-[-15%] w-[50%] h-[50%] bg-amber-600/5 blur-[150px] rounded-full"></div>
<div className="absolute bottom-[-10%] right-[-15%] w-[50%] h-[50%] bg-cyan-600/5 blur-[150px] rounded-full"></div>
</div>
<div className="max-w-2xl mx-auto p-4 sm:p-6 relative z-10 pb-24">
<header className="flex items-center gap-3 mb-8 bg-[#0b1016]/80 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
<div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
<Activity className="text-slate-950 w-6 h-6 stroke-[2.5]" />
</div>
<div>
<h1 className="text-xl font-black tracking-tight text-white leading-none uppercase">Apex<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Quant</span></h1>
<span className="text-[9px] text-amber-500/90 font-bold tracking-widest uppercase">Elite FX & Futures Terminal</span>
</div>
</header>
{}
{activeTab === 'analyze' && (
<div className="space-y-6 animate-in fade-in duration-200">
<div className="flex bg-[#0b1016] border border-white/5 rounded-xl p-1 shadow-lg">
<button onClick={() => setSelectedMarket('FUTURES')} className={`flex-1 py-3
text-xs font-black tracking-widest rounded-lg transition-all focus:outline-none focus:ring-0
outline-none border ${selectedMarket === 'FUTURES' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>CRYPTO FUTURES</button>
<button onClick={() => setSelectedMarket('FX')} className={`flex-1 py-3 text-xs
font-black tracking-widest rounded-lg transition-all focus:outline-none focus:ring-0
outline-none border ${selectedMarket === 'FX' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>FOREX (FX)</button>
</div>
<div className="bg-[#0b1016]/80 p-5 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
<div className="flex bg-[#070a10] border border-white/5 rounded-xl p-1 mb-5">
<button onClick={() => setDataMode('upload')} className={`flex-1 py-2
text-[10px] font-black uppercase tracking-widest rounded-lg transition-all focus:outline-none
focus:ring-0 outline-none border ${dataMode === 'upload' ? 'bg-white/10 text-white border-white/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>📷 UPLOAD
CHART</button>
<button onClick={() => setDataMode('live')} className={`flex-1 py-2 text-[10px]
font-black uppercase tracking-widest rounded-lg transition-all focus:outline-none focus:ring-0
outline-none border ${dataMode === 'live' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>⚡ LIVE
DATA (API)</button>
</div>
<div className="flex justify-between items-center mb-4"><label
className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><TrendingUp className={`w-4 h-4 ${selectedMarket === 'FUTURES' ?
'text-amber-400' : 'text-cyan-400'}`} /> Instrumen {selectedMarket}</label></div>
<input type="text" value={pair} onChange={(e) => setPair((e.target.value ||
'').toUpperCase())} placeholder={selectedMarket === 'FUTURES' ? "e.g. BTCUSDT, ETHUSDT" : "e.g. XAUUSD, GBPJPY"} className={`w-full bg-[#070a10] border
border-white/10 rounded-xl px-4 py-4 text-xl font-black text-white focus:outline-none
focus:ring-1 transition-all uppercase tracking-widest shadow-inner mb-6 ${selectedMarket
=== 'FUTURES' ? 'focus:border-amber-500/50 focus:ring-amber-500/50' :
'focus:border-cyan-500/50 focus:ring-cyan-500/50'}`} />
{selectedMarket === 'FX' && (
<div className="flex items-center justify-between bg-indigo-500/10 p-3.5 rounded-xl border border-indigo-500/30 mb-6 shadow-sm transition-all hover:bg-indigo-500/20">
<div>
<h4 className="text-xs font-black text-indigo-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> AI Predict News</h4>
<p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed pr-2">Prediksi
hasil berita fundamental AS (NFP, CPI, dll).</p>
</div>
<button onClick={() => setPredictNews(!predictNews)}
className="text-indigo-400 shrink-0 focus:outline-none focus:ring-0 outline-none">
{predictNews ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft
className="w-8 h-8 text-slate-600" />}
</button>
</div>
)}
<div className="border-t border-white/5 pt-6">
{selectedMarket === 'FUTURES' ? (
<div>
<div className="flex justify-between items-center mb-4"><span
className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atur
Leverage</span><span className="text-sm font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{leverage}x</span></div>
<input type="range" min="1" max="125" value={leverage} onChange={(e) =>
setLeverage(e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-0" />
</div>
) : (
<div>
<div className="flex justify-between items-center mb-4"><span
className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pilih Lot
Size</span><span className="text-sm font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{lotSize} Lot</span></div>
<div className="grid grid-cols-5 gap-2">{['0.01', '0.05', '0.10', '0.50',
'1.00'].map(lot => (<button key={lot} onClick={() => setLotSize(lot)} className={`py-2
rounded-lg text-[10px] font-bold border focus:outline-none focus:ring-0 outline-none
transition-all ${lotSize === lot ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
'bg-[#070a10] text-slate-400 border-transparent hover:border-white/5'}`}>{lot}</button>))}</div>
</div>
)}
<button onClick={handleSaveExecParams} className="w-full mt-5 py-3 bg-[#111820] hover:bg-[#1a232f] border border-transparent hover:border-white/10 text-amber-400 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-md focus:outline-none focus:ring-0 outline-none"><Save className="w-4 h-4" /> Simpan Parameter</button>
</div>
</div>
{dataMode === 'upload' ? (
<div className="bg-[#0b1016]/80 p-5 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg animate-in fade-in duration-300">
<div className="flex justify-between items-end mb-4">
<div><h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-slate-300" /> Unggah 3
Timeframe</h3></div>
<div className="flex flex-col items-end gap-1"><div className="text-[10px] font-bold px-2 py-1 bg-[#070a10] rounded border border-white/5 text-amber-400">Target
R:R {safeConfig.rr}</div></div>
</div>
<div className="grid grid-cols-3 gap-3">
{[0, 1, 2].map((i) => (
<div key={i} className="relative aspect-square sm:aspect-[4/3]">
{scanningStatus[i] ? (
<div className="w-full h-full rounded-xl border bg-[#070a10]/80 flex flex-col items-center justify-center relative overflow-hidden border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]"><ScanLine className="w-6 h-6 animate-pulse mb-2 text-emerald-400" /><div className="w-full h-1 absolute top-0 left-0 animate-[scan_1.2s_ease-in-out_infinite] bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)]"></div></div>
) : images[i] ? (
<div className="animate-in fade-in duration-300 w-full h-full rounded-xl overflow-hidden border border-emerald-500/50 group relative shadow-[0_0_15px_rgba(16,185,129,0.2)]"><img src={images[i]} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-emerald-500/10 pointer-events-none"></div><div className="absolute top-2 right-2 bg-emerald-500 text-slate-900 p-1 rounded-full shadow-lg"><Check className="w-3.5 h-3.5"
strokeWidth={3} /></div><div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><button onClick={() =>
removeImage(i)} className="p-2 bg-red-500/90 text-white rounded-full focus:outline-none focus:ring-0 outline-none"><X className="w-4 h-4" /></button></div><div
className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/80 text-[10px] font-black rounded border border-emerald-500/30 text-emerald-400 flex items-center gap-1">{currentTFs[i]}</div></div>
) : (
<label className={`w-full h-full rounded-xl border border-dashed
border-slate-700/80 bg-[#070a10]/60 flex flex-col items-center justify-center cursor-pointer
group transition-all focus:outline-none focus:ring-0 outline-none ${selectedMarket ===
'FUTURES' ? 'hover:border-amber-500/50' : 'hover:border-cyan-500/50'}`}><input type="file"
accept="image/*" className="hidden" onChange={(e) => handleImageUpload(i, e)}
/><Upload className="w-5 h-5 mb-1.5 text-slate-600 group-hover:text-amber-400" /><span
className="text-[10px] font-bold text-slate-500">UNGGAH</span><span
className="text-sm font-black text-white mt-1">{currentTFs[i]}</span></label>
)}
</div>
))}
</div>
</div>
) : (
<div className="bg-[#0b1016]/80 p-5 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg mb-6 animate-in fade-in duration-300">
<h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-emerald-400" />
Multi-Timeframe Scan (Live)</h3>
<div className="flex gap-3">
{currentTFs.map((tf, i) => (
<div key={tf} className="flex-1 bg-[#070a10] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
<div className="absolute inset-0 bg-emerald-500/5"></div>
<span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 relative z-10">{i === 0 ? 'LTF (Entry)' : i === 1 ? 'MTF (Confirm)' : 'HTF (Trend)'}</span>
<span className="text-lg sm:text-xl font-black text-emerald-400 relative z-10">{tf}</span>
</div>
))}
</div>
<div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
<p className="text-[10px] text-emerald-400/80 leading-relaxed italic">
*Sistem akan memindai ketiga timeframe di atas secara serentak via API
(Binance/Bitget/TwelveData) beserta data Sosovalue untuk memvalidasi struktur tren secara
menyeluruh layaknya trader profesional.
</p>
</div>
</div>
)}
{errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400 text-sm"><AlertCircle className="w-5 h-5 shrink-0"
/><p>{errorMsg}</p></div>}
<button onClick={() => generateTradingSetup()} disabled={loading || liveDataLoading
|| (dataMode === 'upload' ? !allImagesUploaded : !pair.trim())} className={`w-full py-4.5
rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-xl uppercase
tracking-widest focus:outline-none focus:ring-0 outline-none transition-all ${(loading ||
liveDataLoading) ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : (dataMode === 'upload' ? !allImagesUploaded : !pair.trim()) ?
'bg-slate-900/80 text-slate-600 cursor-not-allowed border border-transparent' :
selectedMarket === 'FUTURES' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)]'}`}>
{(loading || liveDataLoading) ? <><div className="w-5 h-5 border-2 border-slate-700 border-t-slate-300 rounded-full animate-spin"></div>Memproses AI...</> :
<><Play className="w-5 h-5 fill-current" />Buat Setup {dataMode === 'live' && 'API'}</>}
</button>
<p className="text-[9px] sm:text-[10px] text-slate-500/80 text-center italic mt-2 px-4 leading-relaxed">
*Disclaimer: Skor probabilitas, perhitungan jarak SL/TP, dan prediksi adalah
estimasi model AI berdasarkan volatilitas saat ini. Keputusan akhir eksekusi berada di
tangan Anda.
</p>
</div>
)}
{}
{activeTab === 'result' && (
<div className="animate-in fade-in duration-200">
<div className="flex items-center justify-between mb-6">
<button onClick={handleBackToLastTab} className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-white/10 focus:outline-none focus:ring-0 outline-none transition-all">
<ArrowLeft className="w-5 h-5 text-slate-400 hover:text-white transition-colors"
/>
<span className="text-xs font-bold text-slate-400">KEMBALI</span>
</button>
<button onClick={() => handleExportImage(pair)} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase tracking-widest transition-all shadow-md focus:outline-none focus:ring-0 outline-none disabled:opacity-50">
{isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />} Ekspor Gambar
</button>
</div>
<div ref={exportRef} className="bg-[#070a10]">
{renderCardsAndReport(report, pair, deepSeekResult)}
{isExporting && <ExportWatermark pairName={pair} />}
</div>
</div>
)}
{}
{}
{activeTab === 'news' && (
<div className="animate-in fade-in duration-200">
<div className="flex items-center gap-2 mb-6"><Newspaper className="w-5 h-5 text-indigo-400" /><h2 className="text-sm font-black uppercase tracking-widest text-white">Intelijen Berita Makro</h2></div>
{/* ================= RINGKASAN PAGI ================= */}
<div className="bg-gradient-to-br from-[#141a22] to-[#0e131a] border border-amber-500/25 rounded-[22px] p-5 sm:p-6 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
<div className="flex items-start justify-between gap-3 mb-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
<Sunrise className="w-5 h-5 text-amber-400" />
</div>
<div>
<div className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-amber-400">Ringkasan Pagi</div>
<div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
{morningBrief?.date || '—'} • sebelum pasar buka {morningBrief?.marketOpen || '06:00'} WIB
</div>
</div>
</div>
<button onClick={() => loadMorningBrief(true)} disabled={briefLoading}
className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all disabled:opacity-40 focus:outline-none focus:ring-0 outline-none"
title="Perbarui ringkasan (memakai 1 permintaan AI)">
<RefreshCw className={`w-4 h-4 ${briefLoading ? 'animate-spin' : ''}`} />
</button>
</div>
{briefLoading && !morningBrief && (
<div className="flex items-center gap-2 text-slate-400 text-xs font-bold py-6 justify-center">
<Loader2 className="w-4 h-4 animate-spin" /> Menyusun ringkasan pagi...
</div>
)}
{morningBrief && (
<>
<div className="flex flex-wrap items-center gap-2 mb-3">
<span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
morningBrief.bias === 'RISK-ON' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
: morningBrief.bias === 'RISK-OFF' ? 'text-red-400 border-red-500/30 bg-red-500/10'
: 'text-slate-300 border-white/10 bg-white/5'}`}>
BIAS: {morningBrief.bias || 'NETRAL'}
</span>
<span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
{(morningBrief.events?.length || 0)} EVENT HARI INI
</span>
{morningBrief.aiGenerated === false && (
<span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400">
MODE KALENDER
</span>
)}
</div>
<div className="text-sm sm:text-base font-black text-white leading-snug mb-2">{morningBrief.headline}</div>
<div className="text-[13px] sm:text-sm text-slate-300 leading-relaxed mb-4">{morningBrief.summary}</div>
{Array.isArray(morningBrief.events) && morningBrief.events.length > 0 && (
<div className="mb-4">
<div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Jadwal Event (WIB)</div>
<div className="space-y-2">
{morningBrief.events.map((ev, i) => (
<div key={i} className="flex items-center gap-3 bg-[#0b1016] border border-white/5 rounded-xl px-3 py-2.5">
<span className="text-[11px] font-black text-white tabular-nums w-[68px] shrink-0">{ev.time}</span>
<span className={`text-[9px] font-black uppercase px-2 py-1 rounded border shrink-0 ${
(ev.impact || '').toLowerCase() === 'high' ? 'text-red-400 border-red-500/30 bg-red-500/10'
: 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>{ev.impact}</span>
<span className="text-[11px] sm:text-xs text-slate-300 font-medium leading-tight flex-1">
<span className="text-slate-500 font-bold mr-1.5">{ev.country}</span>{ev.title}
</span>
</div>
))}
</div>
</div>
)}
{Array.isArray(morningBrief.watchlist) && morningBrief.watchlist.length > 0 && (
<div className="mb-4">
<div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Watchlist</div>
<div className="space-y-1.5">
{morningBrief.watchlist.map((w, i) => (
<div key={i} className="text-[12px] sm:text-[13px] text-cyan-200/90 font-medium bg-cyan-500/5 border-l-2 border-cyan-500/40 pl-3 py-1.5 rounded-r-lg">{w}</div>
))}
</div>
</div>
)}
{morningBrief.caution ? (
<div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
<ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
<span className="text-[11px] sm:text-xs text-red-200/85 font-medium leading-relaxed">{morningBrief.caution}</span>
</div>
) : null}
<div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-4">
Dibuat {morningBrief.generatedAtWib || '-'} • otomatis 1x per hari
</div>
</>
)}
{!briefLoading && !morningBrief && (
<div className="text-xs text-slate-500 font-bold text-center py-6">Ringkasan pagi belum tersedia. Tekan tombol perbarui.</div>
)}
</div>
{/* =============== AKHIR RINGKASAN PAGI =============== */}
<div className="flex bg-[#0b1016] border border-white/5 rounded-xl p-1 mb-6 shadow-lg overflow-x-auto custom-scrollbar">
<button onClick={() => setNewsFilter('calendar')} className={`flex-shrink-0 flex-1
py-3 px-4 text-xs font-black tracking-widest rounded-lg transition-all focus:outline-none
focus:ring-0 outline-none flex items-center justify-center gap-2 border ${newsFilter ===
'calendar' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'border-transparent text-slate-500 hover:text-slate-300'} `}><CalendarDays className="w-4 h-4" />
KALENDER</button>
</div>
<div className="w-full relative min-h-[600px]">
{newsFilter === 'calendar' && <TVCalendarWidget />}
</div>
</div>
)}
{}
{activeTab === 'settings' && (
<div className="animate-in fade-in duration-200 pb-16">
<div className="flex items-center justify-between mb-6">
<div className="flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-amber-400" /><h2 className="text-sm font-black uppercase tracking-widest text-white">Pengaturan Sistem</h2></div>
<button onClick={() => setShowRecModal(true)} className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest shadow-md focus:outline-none focus:ring-0 outline-none">
<Lightbulb className="w-3.5 h-3.5" /> Panduan AI (Elite)
</button>
</div>
<div className="bg-[#0b1016] border border-white/10 rounded-3xl p-6 shadow-xl space-y-8 h-[75vh] overflow-y-auto custom-scrollbar">
<div>
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 block">1. Timeframe Mode (Dinamis)</label>
<div className="flex flex-wrap gap-2">
{Object.keys(MODES).map(mode => (
<button key={mode} onClick={() => setDraftConfig(prev => ({...prev, mode}))}
className={`flex-1 min-w-[30%] py-3 px-2 text-center text-sm rounded-xl border
transition-all focus:outline-none focus:ring-0 outline-none ${draftConfig?.mode === mode ?
'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-[#070a10] border-transparent text-slate-400 hover:border-white/5'}`}>
{mode} <span className="block text-[9px] opacity-70 mt-1 tracking-widest font-normal">{MODES[mode].join(', ')}</span>
</button>
))}
</div>
<p className="text-[10px] text-slate-500 mt-2 text-center italic">*Timeframe di
atas hanya acuan dasar. AI akan menyesuaikan volatilitas spesifik pair secara otomatis.</p>
</div>
<div>
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 block">2. Profil Analisis</label>
<div className="flex flex-wrap gap-2">
{ANALYSIS_TYPES.map(type => (<button key={type} onClick={() =>
setDraftConfig(prev => ({...prev, analysisType: type}))} className={`flex-1 min-w-[30%]
py-2.5 px-4 text-xs text-center rounded-xl border transition-all focus:outline-none focus:ring-0
outline-none ${draftConfig?.analysisType === type ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold' : 'bg-[#070a10] border-transparent text-slate-400 hover:border-white/5'}`}>{type}</button>))}
</div>
</div>
<div>
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 block">3. Level Target Profit Bebas</label>
<div className="flex flex-wrap gap-2">
{TP_LEVELS.map(tp => (<button key={tp} onClick={() => setDraftConfig(prev =>
({...prev, tpLevel: tp}))} className={`flex-1 min-w-[30%] py-2.5 px-4 text-xs text-center
rounded-xl border transition-all focus:outline-none focus:ring-0 outline-none
${draftConfig?.tpLevel === tp ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-[#070a10] border-transparent text-slate-400 hover:border-white/5'}`}>{tp}</button>))}
</div>
</div>
<div>
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 block">4. Target Rasio (R:R)</label>
<div className="flex flex-wrap gap-2">
{RR_RATIOS.map(ratio => (<button key={ratio} onClick={() =>
setDraftConfig(prev => ({...prev, rr: ratio}))} className={`w-[calc(25%-0.5rem)]
sm:w-[calc(20%-0.5rem)] py-2 text-xs text-center rounded-xl border transition-all
focus:outline-none focus:ring-0 outline-none ${draftConfig?.rr === ratio ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold' : 'bg-[#070a10] border-transparent text-slate-400 hover:border-white/5'}`}>{ratio}</button>))}
</div>
</div>
<div>
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 block">5. Gaya Pemikiran AI (Tokoh Trading)</label>
<div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3 snap-x snap-mandatory">
{TRADING_FIGURES.map(fig => (
<button key={fig.name} onClick={() => setDraftConfig(prev => ({...prev,
aiPersona: fig.name}))} className={`flex-shrink-0 w-[200px] snap-center text-left p-4
rounded-[16px] border transition-all focus:outline-none focus:ring-0 outline-none
${draftConfig?.aiPersona === fig.name ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-[#070a10] border-white/5 text-slate-400 hover:border-white/10'}`}>
<div className="flex items-center gap-2 mb-2">
<div className={`w-6 h-6 rounded-full flex items-center justify-center
${draftConfig?.aiPersona === fig.name ? 'bg-indigo-500/30' : 'bg-slate-800'}`}>
<UserCheck className={`w-3.5 h-3.5 ${draftConfig?.aiPersona ===
fig.name ? 'text-indigo-400' : 'text-slate-500'}`} />
</div>
<div className="font-bold text-[12px] leading-tight truncate">{fig.name}</div>
</div>
<div className="text-[10px] opacity-80 leading-relaxed whitespace-normal">{fig.desc}</div>
</button>
))}
</div>
</div>
<div>
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500"/> 6. Verification &
Confidence Gate</label>
<div className="bg-[#111820] rounded-2xl border border-white/5 p-4 sm:p-5 flex flex-col gap-5">
<div>
<div className="flex justify-between items-center mb-3">
<div>
<h3 className="text-[11px] font-bold text-white mb-0.5">Minimum
Confidence Threshold</h3>
<p className="text-[9px] text-slate-500">Blokir otomatis sinyal jika
probabilitas AI di bawah batas ini.</p>
</div>
<span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">{draftConfig?.confidenceThreshold ||
70}%</span>
</div>
<input type="range" min="50" max="95"
value={draftConfig?.confidenceThreshold || 70} onChange={(e) => setDraftConfig(prev =>
({...prev, confidenceThreshold: parseInt(e.target.value)}))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-0" />
</div>
<div className="h-px w-full bg-white/5"></div>
<div className="flex justify-between items-center">
<div>
<h3 className="text-[11px] font-bold text-white mb-0.5">Wajibkan Dual-AI
Verification</h3>
<p className="text-[9px] text-slate-500">Sinyal tanpa verifikasi DeepSeek
ditandai 'Rejected'.</p>
</div>
<button onClick={() => setDraftConfig(prev => ({...prev,
requireDualVerification: !prev?.requireDualVerification}))} className="text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-0 outline-none">
{draftConfig?.requireDualVerification ? <ToggleRight className="w-8 h-8"
/> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
</button>
</div>
<div className="h-px w-full bg-white/5"></div>
<div className="flex justify-between items-center">
<div>
<h3 className="text-[11px] font-bold text-white mb-0.5">Gunakan Riwayat
Performa untuk Kalibrasi AI</h3>
<p className="text-[9px] text-slate-500">Sesuaikan tingkat confidence AI
dengan win-rate histori trading Anda.</p>
</div>
<button onClick={() => setDraftConfig(prev => ({...prev, useHistoryCalibration:
!prev?.useHistoryCalibration}))} className="text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-0 outline-none">
{draftConfig?.useHistoryCalibration ? <ToggleRight className="w-8 h-8" />
: <ToggleLeft className="w-8 h-8 text-slate-600" />}
</button>
</div>
</div>
</div>
<div className="flex flex-col h-[350px]">
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2 flex-shrink-0"><Target className="w-4 h-4 text-amber-400" /> 7.
Database Metode Analisis Khusus</label>
<div className="relative mb-3 flex items-center flex-shrink-0">
<Search className="w-4 h-4 absolute left-4 text-slate-500 pointer-events-none"
/>
<input type="text" placeholder="Cari puluhan metode teknikal & fundamental..."
value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#070a10] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner" />
</div>
<div className="overflow-y-auto custom-scrollbar bg-[#070a10]/50 p-4 rounded-xl border border-white/5 shadow-inner flex-1">
<div className="flex flex-col gap-1.5">
{filteredMethods.map(method => {
const draftMethods = Array.isArray(draftConfig?.methods) ?
draftConfig.methods : [];
const isActive = draftMethods.includes(method);
return (
<button key={method} onClick={() => toggleMethod(method)}
className={`py-2 px-3 text-xs rounded-lg border transition-all flex items-center gap-2
text-left focus:outline-none focus:ring-0 outline-none ${isActive ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' : 'bg-[#1a232f] border-transparent text-slate-400 hover:bg-slate-700'}`}>
<div className={`w-4 h-4 rounded-full border flex items-center
justify-center flex-shrink-0 ${isActive ? 'bg-amber-400 border-amber-400 text-slate-900' :
'border-slate-500'}`}>{isActive && <Check className="w-3 h-3" />}</div> <span
className="leading-snug">{method}</span>
</button>
)
})}
{filteredMethods.length === 0 && <p className="text-xs text-slate-500 italic py-4 text-center w-full">Metode tidak ditemukan...</p>}
</div>
</div>
</div>
<button onClick={handleSaveSettings} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] tracking-wide uppercase flex-shrink-0 mt-4 mb-4 flex items-center justify-center gap-2 focus:outline-none focus:ring-0 outline-none">
<Save className="w-5 h-5" /> Simpan Konfigurasi Cloud
</button>
</div>
</div>
)}
{}
{activeTab === 'history' && (
<div className="animate-in fade-in duration-200 pb-20">
{activeHistoryItem ? (
<div className="animate-in fade-in duration-200">
<div className="flex items-center justify-between mb-6">
<button onClick={() => setActiveHistoryItem(null)} className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-white/10 focus:outline-none focus:ring-0 outline-none transition-all">
<ArrowLeft className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
<span className="text-xs font-bold text-slate-400">KEMBALI</span>
</button>
<div className="flex gap-2">
{activeHistoryItem.tradeResult === 'loss' &&
!activeHistoryItem.report.includes('POST-MORTEM (EVALUASI LOSS)') && (
<button onClick={() => analyzeLoss(activeHistoryItem)}
disabled={isEvaluating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 shadow-md focus:outline-none focus:ring-0 outline-none">
{isEvaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
<Search className="w-3.5 h-3.5" />} Evaluasi Loss
</button>
)}
<button onClick={() => handleCopySetupLengkap(activeHistoryItem.report,
activeHistoryItem.pair)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b1016] hover:bg-[#1a232f] border border-white/10 text-slate-300 rounded-lg font-bold text-[10px] transition-all shadow-md focus:outline-none focus:ring-0 outline-none"><Copy
className="w-3.5 h-3.5" /> Full Copy</button>
<button onClick={() => handleExportImage(activeHistoryItem.pair)} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg font-bold text-[10px] transition-all shadow-md focus:outline-none focus:ring-0 outline-none disabled:opacity-50">{isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown
className="w-3.5 h-3.5" />} Ekspor</button>
<button onClick={handleDeleteFromDetail} className="flex items-center justify-center p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all focus:outline-none focus:ring-0 outline-none"><Trash2
className="w-4 h-4" /></button>
</div>
</div>
<div className="flex items-center justify-between mb-4 p-3 bg-[#0b1016] rounded-2xl border border-white/5 shadow-lg">
{isHistoryItemLocked ? (
<div className="w-full flex items-center justify-between bg-slate-900/50 rounded-xl px-3 py-2 border border-slate-700/50">
<span className="text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest"><Lock className="w-4 h-4 text-amber-500"
/> Hasil Terkunci</span>
<span className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest
shadow-md border ${
activeHistoryItem.tradeResult === 'win' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
activeHistoryItem.tradeResult === 'loss' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
activeHistoryItem.tradeResult === 'rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
}`}>{activeHistoryItem.tradeResult === 'win' ? 'WIN 🟢' :
activeHistoryItem.tradeResult === 'loss' ? 'LOSS 🔴' : activeHistoryItem.tradeResult ===
'rejected' ? 'REJECTED ⛔' : 'BEP ⚪'}</span>
</div>
) : (
<>
<span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tandai Hasil Trade:</span>
<div className="flex items-center gap-2">
<button onClick={() => updateTradeResult(activeHistoryItem.id, 'win')}
className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#1a232f] text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 focus:outline-none focus:ring-0 outline-none">WIN 🟢</button>
<button onClick={() => updateTradeResult(activeHistoryItem.id, 'loss')}
className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#1a232f] text-red-400 hover:bg-red-500/20 border border-red-500/20 focus:outline-none focus:ring-0 outline-none">LOSS 🔴</button>
<button onClick={() => updateTradeResult(activeHistoryItem.id, 'bep')}
className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#1a232f] text-slate-400 hover:bg-slate-700 border border-white/10 focus:outline-none focus:ring-0 outline-none">BEP ⚪</button>
</div>
</>
)}
</div>
<div className="w-full" ref={exportRef}>{renderCardsAndReport(activeHistoryItem.report,
activeHistoryItem.pair, activeHistoryItem.deepSeekVerification)}
{isExporting && <ExportWatermark pairName={activeHistoryItem.pair} />}</div>
</div>
) : (
<div className="flex flex-col w-full">
<div className="flex items-center gap-2 mb-4">
<HistoryIcon className="w-5 h-5 text-amber-400" />
<h2 className="text-sm font-black uppercase tracking-widest text-white">Arsip
Analisis</h2>
</div>
<div className="flex bg-[#0b1016] border border-white/5 rounded-xl p-1 mb-4">
<button onClick={() => setHistoryFilter('FUTURES')} className={`flex-1 py-2
text-xs font-bold rounded-lg transition-all focus:outline-none focus:ring-0 outline-none border
${historyFilter === 'FUTURES' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
'border-transparent text-slate-500 hover:text-slate-300'}`}>CRYPTO FUTURES</button>
<button onClick={() => setHistoryFilter('FX')} className={`flex-1 py-2 text-xs
font-bold rounded-lg transition-all focus:outline-none focus:ring-0 outline-none border
${historyFilter === 'FX' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
'border-transparent text-slate-500 hover:text-slate-300'}`}>FOREX (FX)</button>
</div>
<div className="bg-gradient-to-br from-slate-900 to-[#0b1016] border border-white/5 rounded-2xl p-5 mb-6 shadow-lg">
<h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Statistik
{historyFilter} Bulan Ini</h3>
<div className="flex items-center justify-between">
<div>
<div className="text-4xl font-black text-white">{winrate}<span
className={`text-xl ${historyFilter === 'FUTURES' ? 'text-amber-400' :
'text-cyan-400'}`}>%</span></div>
<div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Win Rate Sistem</div>
</div>
<div className="flex gap-4 bg-[#070a10] p-3 rounded-xl border border-white/5">
<div className="text-center"><div className="text-xl font-black text-emerald-400">{wins}</div><div className="text-[9px] text-slate-500 uppercase tracking-wider">Win</div></div>
<div className="w-px bg-white/10"></div>
<div className="text-center"><div className="text-xl font-black text-red-400">{losses}</div><div className="text-[9px] text-slate-500 uppercase tracking-wider">Loss</div></div>
<div className="w-px bg-white/10"></div>
<div className="text-center"><div className="text-xl font-black text-slate-400">{beps}</div><div className="text-[9px] text-slate-500 uppercase tracking-wider">BEP</div></div>
</div>
</div>
</div>
<div className="text-center mb-3"><span className="text-[10px] text-slate-500 font-bold tracking-widest bg-[#0b1016] px-3 py-1 rounded-full border border-white/5">TAHAN LAMA UNTUK MENGHAPUS</span></div>
{displayedHistory.length === 0 ? (
<div className="bg-[#0b1016] border border-white/5 rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-4 shadow-inner mt-4 animate-in fade-in zoom-in-95">
<div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center border border-white/5 shadow-md">
<Database className="w-10 h-10 text-slate-500" />
</div>
<div>
<h3 className="text-slate-300 font-black tracking-widest uppercase mb-1.5">Arsip Kosong</h3>
<p className="text-slate-500 font-medium text-xs leading-relaxed max-w-[200px] mx-auto">Belum ada data setup tersimpan untuk pasar {historyFilter}.</p>
</div>
</div>
) : (
<div className="space-y-3">
{displayedHistory.map(item => (
<button key={item.id} onMouseDown={() => handleTouchStart(item)}
onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd} onTouchStart={() =>
handleTouchStart(item)} onTouchEnd={handleTouchEnd} onClick={(e) =>
handleHistoryClick(e, item)} className="w-full text-left bg-[#0b1016]/80 hover:bg-[#0b1016] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 transition-all flex items-center justify-between group shadow-sm select-none focus:outline-none focus:ring-0 outline-none">
<div className="flex items-center gap-4">
<div className={`w-12 h-12 rounded-xl flex items-center justify-center
border border-white/5 shadow-inner ${item.tradeResult === 'rejected' ? 'bg-rose-900/20 text-rose-400' : item.marketType === 'FUTURES' ? 'bg-amber-900/20 text-amber-400' :
'bg-cyan-900/20 text-cyan-400'} font-black`}>{item.pair ? item.pair.slice(0, 4) : 'PAIR'}</div>
<div>
<h3 className="font-black text-white text-lg tracking-wider flex items-center gap-2">
{item.pair}
{item.tradeResult === 'win' && <span className="text-emerald-500 text-xs">🟢</span>}
{item.tradeResult === 'loss' && <span className="text-red-500 text-xs">🔴</span>}
{item.tradeResult === 'bep' && <span className="text-slate-400 text-xs">⚪</span>}
{item.tradeResult === 'rejected' && <span className="text-rose-500 text-[10px] border border-rose-500/50 bg-rose-500/10 px-1.5 py-0.5 rounded ml-1">REJECTED ⛔</span>}
</h3>
<div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-1"><Clock className="w-3 h-3 text-slate-500" /> {item.dateFormatted} <span
className="bg-[#070a10] px-2 py-0.5 rounded-md border border-white/5">{item.mode}</span></div>
</div>
</div>
<ChevronRight className={`w-5 h-5 text-slate-600 transition-colors
${item.marketType === 'FUTURES' ? 'group-hover:text-amber-400' :
'group-hover:text-cyan-400'}`} />
</button>
))}
</div>
)}
</div>
)}
</div>
)}
</div>
{}
<div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-4 pt-2 bg-gradient-to-t from-[#070a10] via-[#070a10]/95 to-transparent pointer-events-none">
<div className="max-w-md mx-auto bg-[#0b1016]/90 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between p-2 shadow-2xl pointer-events-auto">
<button onClick={() => handleTabChange('history')} className={`flex flex-col
items-center justify-center flex-1 py-2 rounded-xl transition-all focus:outline-none focus:ring-0
outline-none ${activeTab === 'history' ? 'bg-cyan-500/10 text-cyan-400 shadow-inner' :
'text-slate-500 hover:text-slate-300'}`}><HistoryIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-1" /><span className="text-[8px] sm:text-[9px] font-bold tracking-widest">ARSIP</span></button>
<button onClick={() => handleTabChange('analyze')} className={`flex flex-col
items-center justify-center flex-1 py-2 rounded-xl transition-all focus:outline-none focus:ring-0
outline-none ${activeTab === 'analyze' || activeTab === 'result' ? 'bg-amber-500/10 text-amber-400 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}><BarChart3
className="w-4 h-4 sm:w-5 sm:h-5 mb-1" /><span className="text-[8px] sm:text-[9px] font-bold tracking-widest">ANALISIS</span></button>
<button onClick={() => handleTabChange('news')} className={`relative flex flex-col
items-center justify-center flex-1 py-2 rounded-xl transition-all focus:outline-none focus:ring-0
outline-none ${activeTab === 'news' ? 'bg-fuchsia-500/10 text-fuchsia-400 shadow-inner' :
'text-slate-500 hover:text-slate-300'}`}>{briefUnread && (
<span className="absolute top-1 right-1/2 translate-x-[16px] flex items-center justify-center">
<span className="absolute w-3 h-3 rounded-full bg-amber-400/60 animate-ping"></span>
<span className="w-2 h-2 rounded-full bg-amber-400 border border-[#0b1016]"></span>
</span>
)}<Globe className="w-4 h-4 sm:w-5 sm:h-5 mb-1"
/><span className="text-[8px] sm:text-[9px] font-bold tracking-widest">NEWS</span></button>
<button onClick={() => handleTabChange('settings')} className={`flex flex-col
items-center justify-center flex-1 py-2 rounded-xl transition-all focus:outline-none focus:ring-0
outline-none ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-inner' :
'text-slate-500 hover:text-slate-300'}`}><SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-1" /><span className="text-[8px] sm:text-[9px] font-bold tracking-widest">PENGATURAN</span></button>
</div>
</div>
</div>
);
}
export default function App() {
return (
<ErrorBoundary>
<MainApp />
</ErrorBoundary>
);
}