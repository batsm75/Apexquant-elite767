import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import {
Settings as SettingsIcon, Upload, Image as ImageIcon, X, Play, CheckCircle,
AlertCircle, ShieldAlert, TrendingUp, Loader2, Target, ArrowLeft, History as HistoryIcon,
Clock, ChevronRight, Search, Activity, Database, Check, ScanLine, BarChart3,
Copy, Lock, Wallet, Lightbulb, ToggleLeft, ToggleRight, Newspaper, Globe,
CalendarDays, Trash2, Save, LayoutDashboard, Zap, RefreshCw, UserCheck,
Flame, Crown, Radio, ArrowRight, Shield, ListOrdered
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from
'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc } from
'firebase/firestore';
const appId = typeof __app_id !== 'undefined' ? __app_id : 'apexquant-unified-v88';
let app = null;
let auth = null;
let db = null;
try {
let firebaseConfig = {};
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) :
__firebase_config;
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
const TWELVEDATA_API_KEY = '***REDACTED***';
const SOSO_API_KEY = '***REDACTED***';
const DEEPSEEK_API_KEY = '***REDACTED***';
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
const res = await fetch(`https://api.sosovalue.com/v1/market/data?symbol=${symbol}`, {
headers: { 'Authorization': `Bearer ${SOSO_API_KEY}` }
});
if (!res.ok) throw new Error('API Sosovalue diblokir atau limit');
const data = await res.json();
return JSON.stringify(data.data || data);
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
const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
},
body: JSON.stringify({
model: 'deepseek-chat',
messages: [{ role: 'user', content: prompt }],
temperature: 0.1,
response_format: { type: 'json_object' }
})
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
const DASHBOARD_MODES = {
'Pulse': { icon: <Flame className="w-5 h-5 text-orange-500" />, title: '🔥 Pulse Mode (High Frequency)', desc: 'AI akan menghasilkan sinyal dengan frekuensi tinggi. Sangat responsif terhadap volatilitas pasar instan, sentimen market, momentum harga, dan likuiditas.', tfs: 'M5 (Entry) • M15 (Confirm) • M30 (Structure)', dur: 'Dinamis (Menit, misal: 17, 33 Menit)' },
'Momentum': { icon: <Zap className="w-5 h-5 text-amber-400" />, title: '⚡ Momentum Mode (Balanced Frequency)', desc: 'Keseimbangan antara frekuensi dan akurasi. Menggabungkan teknikal, fundamental menengah, sentimen, serta rilis kalender ekonomi.',
tfs: 'M15 (Setup) • H1 (Direction) • H4 (HTF Bias)', dur: 'Dinamis (Jam presisi, misal: 3 Jam 22 Menit)' },
'Titan': { icon: <Crown className="w-5 h-5 text-emerald-400" />, title: '👑 Titan Mode (Precision Frequency)', desc: 'Fokus pada akurasi mutlak. Mempertimbangkan tren makro, kebijakan Bank Sentral, dan akumulasi institusi raksasa. Sinyal jarang tapi presisi tinggi.', tfs:
'H1 (Zone) • H4 (Major Trend) • D1 (Inst. Bias)', dur: 'Dinamis (Hari & Jam ganjil)' }
};
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
dashboardMode: 'Momentum', confidenceThreshold: 70, requireDualVerification: false,
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
const [klineRes, tickerRes] = await Promise.all([
fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`),
fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
]);
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
const res = await
fetch(`https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}&granularity=${interval}&limit=100`);
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
fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${TWELVEDATA_API_KEY}`),
fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=100&apikey=${TWELVEDATA_API_KEY}`)
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
const [predictQuery, setPredictQuery] = useState('');
const [predictLoading, setPredictLoading] = useState(false);
const [predictData, setPredictData] = useState(null);
const [predictError, setPredictError] = useState('');
const [deepSeekResult, setDeepSeekResult] = useState(null);
const [historyList, setHistoryList] = useState([]);
const [historyFilter, setHistoryFilter] = useState('FUTURES');
const [activeHistoryItem, setActiveHistoryItem] = useState(null);
const [itemToDelete, setItemToDelete] = useState(null);
const [newsFilter, setNewsFilter] = useState('calendar');
const [dashboardFilter, setDashboardFilter] = useState('FUTURES');
const [dashboardData, setDashboardData] = useState({ futures: [], forex: [], lastUpdated:
null });
const [isDashboardLoading, setIsDashboardLoading] = useState(false);
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
showPips: appConfig.showPips !== undefined ? appConfig.showPips : true,
predictNews: appConfig.predictNews !== undefined ? appConfig.predictNews : false,
aiPersona: appConfig.aiPersona || 'Standar (Elite Quant AI)',
dashboardMode: appConfig.dashboardMode || 'Momentum',
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
showPips: draftConfig.showPips !== undefined ? draftConfig.showPips : true,
predictNews: draftConfig.predictNews !== undefined ? draftConfig.predictNews : false,
aiPersona: draftConfig.aiPersona || 'Standar (Elite Quant AI)',
dashboardMode: draftConfig.dashboardMode || 'Momentum',
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
if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await
signInWithCustomToken(auth, __initial_auth_token);
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
dashboardMode: data.dashboardMode || 'Momentum',
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
const dashRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dashboard_data', 'latest');
unsubDashboard = onSnapshot(dashRef, (docSnap) => {
if (docSnap.exists()) setDashboardData(docSnap.data());
});
} catch(err) { setIsCloudSyncing(false); }
return () => { unsubSettings(); unsubHistory(); unsubDashboard(); };
}, [user]);
const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000);
};
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
const generateDashboardRecommendations = async () => {
setIsDashboardLoading(true);
const expandedCryptoSymbols =
['ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LI NKUSDT','MATICUSDT','DOTUSDT','LTCUSDT','NEARUSDT','BCHUSDT','FILUSDT','FTM USDT','SANDUSDT','APEUSDT','GALAUSDT','ATOMUSDT','INJUSDT','RNDRUSDT','OPU SDT','ARBUSDT','FETUSDT','SUIUSDT','APTUSDT','TIAUSDT','SEIUSDT','WLDUSDT','OR DIUSDT','PEPEUSDT','AAVEUSDT'];
const shuffledCrypto = expandedCryptoSymbols.sort(() => 0.5 - Math.random()).slice(0,
15);
const selectedCryptoPool = ['BTCUSDT', ...shuffledCrypto];
const expandedForexSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD',
'USDCAD', 'GBPJPY', 'EURJPY', 'AUDNZD', 'EURGBP', 'GBPNZD', 'CADCHF', 'EURAUD',
'NZDUSD', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'EURCAD', 'EURCHF', 'EURNZD',
'GBPAUD', 'GBPCAD', 'GBPCHF', 'AUDCAD', 'AUDCHF', 'NZDCAD', 'NZDCHF'];
const shuffledForex = expandedForexSymbols.sort(() => 0.5 - Math.random()).slice(0, 15);
const selectedForexPool = ['XAUUSD', ...shuffledForex];
let livePriceText = "Data harga live gagal ditarik, gunakan pencarian web Google.";
try {
const cryptoRes = await fetchWithBackoff('https://api.binance.com/api/v3/ticker/price',
{method: 'GET'});
if(cryptoRes && Array.isArray(cryptoRes)) {
const wantedSymbols = [...selectedCryptoPool, 'PAXGUSDT', 'EURUSDT',
'GBPUSDT'];
const filtered = cryptoRes.filter(c => wantedSymbols.includes(c.symbol));
let formattedPrices = filtered.map(c => {
let sym = c.symbol;
if (sym === 'PAXGUSDT') sym = 'XAUUSD';
if (sym === 'EURUSDT') sym = 'EURUSD';
if (sym === 'GBPUSDT') sym = 'GBPUSD';
return `${sym}: ${parseFloat(c.price).toString()}`;
});
livePriceText = formattedPrices.join(', ');
}
} catch(e) { console.log("Failed to fetch live prices"); }
try {
const apiKey = "";
const url =
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
const d = new Date();
const offset = d.getTimezoneOffset() / -60;
let userTimeZone = 'WIB';
if (offset === 8) userTimeZone = 'WITA';
else if (offset === 9) userTimeZone = 'WIT';
const dayOfWeek = d.toLocaleDateString('id-ID', { weekday: 'long' });
const timeNowDisplay = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit',
second: '2-digit' }).replace(/:/g, '.');
const currentUTC = d.toISOString().replace('T', ' ').substr(0, 19) + ' UTC';
const isWeekend = dayOfWeek === 'Sabtu' || dayOfWeek === 'Minggu' || dayOfWeek
=== 'Saturday' || dayOfWeek === 'Sunday';
const activeDashModeData = DASHBOARD_MODES[safeConfig.dashboardMode] ||
DASHBOARD_MODES['Momentum'];
const activeMethodsString = activeMethods.length > 0 ? activeMethods.join(', ') : 'Price Action, SMC';
let durationConstraint = "";
if (safeConfig.dashboardMode === 'Pulse') {
durationConstraint = "PULSE MODE: Durasi WAJIB dalam hitungan menit ganjil tak terduga (misal: 11 Menit, 23 Menit). MAKSIMAL 60 Menit. DILARANG KERAS MENGGUNAKAN ANGKA BULAT!";
} else if (safeConfig.dashboardMode === 'Momentum') {
durationConstraint = "MOMENTUM MODE: Durasi WAJIB kombinasi jam dan menit ganjil (misal: 2 Jam 17 Menit). MAKSIMAL 24 Jam. DILARANG menggunakan angka bulat!";
} else if (safeConfig.dashboardMode === 'Titan') {
durationConstraint = "TITAN MODE: Durasi WAJIB kombinasi hari dan jam ganjil (misal: 1 Hari 11 Jam). DILARANG menggunakan angka genap murni!";
}
const promptText = `
System: Anda adalah "Claude AI", beroperasi sebagai "Master Analisyst" tingkat institusi
untuk APEX QUANT. Anda dirancang dengan kemampuan analitis, kehati-hatian matematis,
dan ketajaman logika khas Claude. Anda TIDAK BERHALUSINASI, argumen Anda 100%
didasarkan pada data faktual.
WAKTU PENGGUNA SAAT INI: Hari ${dayOfWeek}, Jam ${timeNowDisplay}
${userTimeZone} (Setara dengan ${currentUTC}).
Status Weekend/Libur: ${isWeekend ? 'YA (Market Tutup)' : 'TIDAK'}
Tentukan Session aktif dengan tepat berdasarkan offset timezone di atas!
PERSONA TRADING: ${safeConfig.aiPersona}
MODE PREFERENSI: ${activeDashModeData.title}
METODE ANALISIS USER: ${activeMethodsString}
[MEGA-INTEGRASI SUMBER DATA MULTI-DIMENSI MUTLAK]
Gunakan Search Google untuk mencari berita makro, sentimen kalender ekonomi (Forex
Factory), aliran data ETF/Onchain (Sosovalue API Key: ${SOSO_API_KEY}), dan siklus
waktu.
[DATA HARGA REAL-TIME DETIK INI JUGA]
${livePriceText}
[HYPER-AGGRESSIVE CLAUDE FILTERING (WITH NEUTRAL ALLOWANCE)]
- Anda adalah mesin presisi. Jika kondisi pasar SAH dan JELAS, berikan arahan "BUY"
atau "SELL".
- NAMUN, jika market sedang sideways/choppy, rawan manipulasi, atau tidak ada arah
yang jelas, IZINKAN menggunakan action "NEUTRAL" atau "WAIT" dengan skor confidence
rendah (< 50). Jangan paksa trading di pasar yang buruk.
[ATURAN KHUSUS MUTLAK]
1. KUNCI HARGA MUTLAK & REALISTIS: Untuk "currentPrice", Anda WAJIB
MENGGUNAKAN ANGKA PERSIS DARI [DATA HARGA REAL-TIME] DI ATAS! Jika tidak
ada, lakukan web search harga spot live. Format harga tanpa nol berlebihan. "targetPrice"
dihitung rasional menyesuaikan ATR/volatilitas live pair.
2. NUMERIC INTEGRITY GUARD: Pastikan SEMUA skor maksimal 100. Nilai Buy +
Sell pada OrderFlow WAJIB 100.
3. STATUS DINAMIS: Gunakan 2-4 kata unik (misal: "Whale Pre-Positioning", "Breakout
Terkonfirmasi", "Sideways Choppy").
4. DURASI KETAT & FORMAT: validTime = HANYA TULIS JAM FORMAT HH:MM:SS
(misal 15:24:47). DILARANG TULIS TANGGAL/TAHUN. Durasi WAJIB mematuhi:
${durationConstraint}. Sesuaikan zona waktu "entryWindow" ke ${userTimeZone}.
5. DINAMIKA PAIR:
- Futures: TEPAT 9 Pair. Ke-1 WAJIB "BTCUSDT". Sisa 8 pair WAJIB DIPILIH ACAK
HANYA dari daftar: ${selectedCryptoPool.join(', ')}.
- Forex: TEPAT 9 Pair. Ke-1 WAJIB "XAUUSD". Sisa 8 pair WAJIB DIPILIH ACAK
HANYA dari daftar: ${selectedForexPool.join(', ')}.
6. REASONING LUGAS: Maksimal 4 poin.
7. TRAP DETECTION: Wajib isi "trapDetection" dengan: "Bullish Trap 🐻", "Bearish Trap
🐂", atau "None".
8. PREDIKSI NEWS, MEMB & SIKLUS ASTROLOGI: Pecah prediksi ke dalam json
(institusi, whale, astrologi, conclusion).
9. ATURAN SESI, WEEKEND & PREDIKSI NEWS (SNIPER ELITE MODE):
- DETEKSI WEEKEND/AKHIR SESI: Karena hari ini ${dayOfWeek}, jika sedang
weekend/libur, atau sudah di penghujung akhir sesi New York, AI WAJIB mengubah
"conclusion" menjadi mode "PREDIKTOR OPENING". Prediksi arah pergerakan arus dana
institusi untuk BESOKNYA atau saat sesi market (Asia) dibuka kembali.
- MULTIPLE NEWS DI SESI NY: Khusus tab Forex, jika mendeteksi banyak news di
sesi US (misal ada 3-5 news di jam berbeda hari ini), WAJIB buatkan DAFTAR LIST
JADWAL NEWS tersebut secara berurutan menggunakan newline (\n) di bagian awal teks
"conclusion".
- SNIPER ELITE MODE: Pada sesi US/New York yang memiliki jadwal news, AI
WAJIB masuk ke mode "Sniper Elite" di AI Historical Prediction. Berikan bocoran arah news
riil (Buy/Sell sebenarnya).
- GAYA BAHASA TRADER PRO: Setelah list news, tuliskan kesimpulan secara naratif
layaknya predictor handal. Contoh format wajib untuk ditiru & diadaptasi datanya: "Gold hari
ini diprediksi tertekan karena data forecast dari Sosovalue menunjukkan adanya prediksi
yang akan membuat retail margin call padahal arah sebenarnya BUY...". Sesuaikan kalimat
ini secara dinamis dengan data Sosovalue/TwelveData hari ini. Jadikan Apex Quant Elite
sebagai Prediktor sejati.
BALAS HANYA DENGAN FORMAT JSON MURNI TANPA TEKS APAPUN:
{
"futures": [
{
"pair": "[NAMA_PAIR]",
"action": "BUY", // ATAU SELL, ATAU NEUTRAL JIKA BURUK
"currentPrice": "[HARGA_LIVE_DARI_API_ATAU_WEB]",
"targetPrice":
"[TARGET_HARGA_PROYEKSI_REALISTIS_SESUAI_VOLATILITAS]",
"mode": "${safeConfig.dashboardMode}",
"session": "[SESI AKTIF BERDASARKAN UTC SAAT INI (e.g. LONDON, NEW
YORK)]",
"marketSpeed": "FAST",
"duration": "[DURASI_GANJIL]",
"validTime": "16:45:24",
"entryWindow": "15:00 - 16:30 ${userTimeZone}",
"newsRisk": "HIGH",
"sessionScore": 95,
"confidence": 92,
"status": "[STATUS_DINAMIS]",
"trapDetection": "Bearish Trap 🐂",
"orderFlow": { "buy": 65, "sell": 35 },
"newsPrediction": {
"institusi": "[Analisis uang institusi faktual]",
"whale": "[Analisis aliran dana paus/ETF Sosovalue faktual]",
"astrologi": "[Analisis siklus waktu Gann / Geometri (Tandai spekulatif)]",
"conclusion": "[Kesimpulan sesi dinamis sesuai Aturan 9]"
},
"scores": { "trend": 23, "smc": 18, "volume": 14, "fundamental": 19, "sentiment": 9,
"persona": 9 },
"reasons": ["[ALASAN_1]", "[ALASAN_2]"]
}
],
"forex": [ ... ]
}
`;
const payload = { contents: [{ role: "user", parts: [{ text: promptText }] }], tools: [{
google_search: {} }], generationConfig: { temperature: 0.6 } };
const data = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type':
'application/json' }, body: JSON.stringify(payload) });
let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
textResult = textResult.replace(/```[a-zA-Z]*\n/gi, '').replace(/```/gi, '').trim();
const parsedData = JSON.parse(textResult);
const finalData = {
futures: parsedData.futures || [], forex: parsedData.forex || [],
lastUpdated: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year:
'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })
};
setDashboardData(finalData); showToast("Sistem Master Analisyst Diperbarui!");
if (user && db) { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid,
'dashboard_data', 'latest'), finalData); }
} catch (error) {
console.error(error);
showToast(error.message || "Gagal memindai market. Silakan coba lagi.");
} finally { setIsDashboardLoading(false); }
};
const analyzeLoss = async (item) => {
if (!item || isEvaluating) return;
setIsEvaluating(true);
showToast("Menganalisis penyebab kerugian (Loss)...");
try {
const apiKey = "";
const url =
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
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
const handlePredictSubmit = async () => {
if (!predictQuery.trim()) { setPredictError("Tuliskan isu ekonomi atau market yang ingin Anda prediksi."); return; }
setPredictLoading(true); setPredictError(''); setPredictData(null);
try {
const apiKey = "";
const url =
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
const promptText = `
System: Anda adalah AI Elite Quant Analyst ("${safeConfig.aiPersona}") di ApexQuant.
TUGAS: Analisis mendalam tentang Isu Ekonomi/Geopolitik/Market berikut:
"${predictQuery}"
ATURAN MUTLAK BOLA PREDIKSI:
1. FILTER TOPIK: Fitur ini hanya untuk ekonomi global, geopolitik, kebijakan
moneter/fiskal, investasi, pasar keuangan, dan Astrologi Finansial. JIKA diluar itu set
"isRelevant": false.
2. SUMBER DATA: Gunakan alat Google Search Anda untuk mencari berita terbaru dari
Sosovalue (API Key Concept: ${SOSO_API_KEY}), Federal Reserve, Bloomberg, dll.
3. FORMAT OUTPUT: HANYA JSON MURNI. DILARANG KERAS menggunakan simbol
markdown bintang (* atau **) di dalam teks.
4. METODE: Analisis dampak berdasarkan pendekatan ${activeMethods.join(', ')} jika
relevan.
FORMAT JSON YANG WAJIB DIKEMBALIKAN (Tanpa text apapun diluar bracket
JSON):
{
"isRelevant": true atau false,
"title": "[Judul Analisis Singkat & Tajam]",
"date": "${new Date().toLocaleString('id-ID', { timeZoneName: 'short' })}",
"summary": "[Ringkasan situasi 2-3 kalimat]",
"factors": ["[Faktor 1]", "[Faktor 2]", "[Faktor 3]"],
"impactPositive": ["[Dampak positif 1]", "[Dampak positif 2]"],
"impactNegative": ["[Dampak negatif 1]", "[Dampak negatif 2]"],
"sentiment": "BULLISH" atau "BEARISH" atau "NETRAL",
"confidence": "Tinggi" atau "Sedang" atau "Rendah",
"mainScenario": "[Skenario probabilitas tertinggi]",
"altScenario": "[Skenario alternatif/risiko]",
"support": ["[Level Support 1]", "[Level Support 2]"],
"resistance": ["[Level Resistance 1]", "[Level Resistance 2]"],
"conclusion": "[Kesimpulan tajam 2-4 kalimat]"
}
`;
const payload = { contents: [{ role: "user", parts: [{ text: promptText }] }], tools: [{
google_search: {} }], generationConfig: { temperature: 0.5 } };
const res = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type':
'application/json' }, body: JSON.stringify(payload) });
let textResult = res.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
textResult = textResult.replace(/```json/gi, '').replace(/```/gi, '').trim();
const parsedData = JSON.parse(textResult);
if(parsedData.isRelevant === false) {
setPredictError("Fitur Prediction hanya mendukung analisis ekonomi global, geopolitik, investasi, dan pasar keuangan.");
} else {
setPredictData(parsedData);
}
} catch(err) {
setPredictError(err.message || "Gagal menghubungkan ke satelit intelijen berita. Coba lagi.");
} finally {
setPredictLoading(false);
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
const apiKey = "";
const url =
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
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
if (dsVerification.verified === false && safeConfig.requireDualVerification) {
isNoTrade = true;
finalStatus = 'rejected';
cleanedReport = cleanedReport.replace(
/🧭 Arah:.*/,
`⚠ SINYAL DITOLAK OTOMATIS (Tidak Terverifikasi
Dual-AI)\n${cleanedReport.match(/🧭 Arah:.*/)?.[0] || '🧭 Arah: NEUTRAL'}`
);
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
const regex = new RegExp(`Harga
${tpLabel}:\\s*([\\d.]+)(?:[^\\(]*\\(\\s*[-+]?\\s*([\\d.]+)\\s*Pips?\\s*\\))?`, 'i');
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
if (dsVerificationData) {
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
if (text.includes('🚫') || text.includes('NO TRADE') || text.includes('⚠ SINYAL DITOLAK OTOMATIS')) {
let rejectionText = text;
if (text.includes('⚠ SINYAL DITOLAK OTOMATIS')) {
const rejectionReason = text.match(/⚠ SINYAL DITOLAK OTOMATIS(.*)/i)?.[0] ||
'⚠ SINYAL DITOLAK OTOMATIS';
rejectionText = `<div class="bg-red-500/20 border border-red-500/50 p-4 rounded-xl
mb-4 font-black text-red-400 uppercase tracking-widest shadow-lg flex flex-col gap-2"><div
class="flex items-center gap-2"><ShieldAlert class="w-6 h-6"/> GAGAL MELEWATI GATE
KEAMANAN AI</div><div class="text-xs text-red-300 font-medium
normal-case">${rejectionReason.replace('⚠ SINYAL DITOLAK OTOMATIS',
'').trim()}</div></div>\n\n` + text;
}
return <div className="space-y-1 bg-[#0b1016] rounded-2xl p-5 border border-white/5 shadow-lg">{rejectionText.split('\n').map((line, idx) => {
if (line.includes('<div class="bg-red-500/20')) {
return <div key={idx} dangerouslySetInnerHTML={{__html: line}}></div>;
}
return renderInlineText(line, idx);
})}</div>;
}
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
</div>
{renderCardsAndReport(report, pair, deepSeekResult)}
</div>
)}
{}
{activeTab === 'dashboard' && (
<div className="animate-in fade-in duration-200">
<div className="flex justify-between items-center mb-4 bg-[#0b1016]/80 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
<div className="flex items-center gap-2">
<LayoutDashboard className="w-5 h-5 text-emerald-400" />
<div>
<h2 className="text-[13px] font-black uppercase tracking-widest text-white leading-none">MARKET INSIDER</h2>
<p className="text-[9px] text-emerald-400 mt-1 font-bold tracking-widest">Master Analisyst</p>
</div>
</div>
<button
onClick={generateDashboardRecommendations}
disabled={isDashboardLoading}
className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
transition-all shadow-md focus:outline-none focus:ring-0 outline-none ${isDashboardLoading
? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' :
'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'}`}
>
{isDashboardLoading ? <><Loader2 className="w-4 h-4 animate-spin" />
Menganalisa...</> : <><RefreshCw className="w-4 h-4" /> Analisa Ulang ⚡</>}
</button>
</div>
<div className="mb-6 flex items-center justify-center">
<span className="text-[10px] sm:text-xs font-bold px-3 py-1.5 bg-[#111820] border border-white/10 rounded-full shadow-sm flex items-center gap-2 text-slate-300">
Mode Sinyal Aktif: <span className="text-amber-400 flex items-center gap-1">{DASHBOARD_MODES[safeConfig.dashboardMode]?.icon}
{safeConfig.dashboardMode}</span>
</span>
</div>
<MarketSessionTracker />
<div className="flex bg-[#0b1016] border border-white/5 rounded-xl p-1 mb-6 shadow-lg">
<button onClick={() => setDashboardFilter('FUTURES')} className={`flex-1 py-3
px-4 text-xs font-black tracking-widest rounded-lg transition-all focus:outline-none
focus:ring-0 outline-none flex items-center justify-center gap-2 border ${dashboardFilter ===
'FUTURES' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><Activity className="w-4 h-4" /> CRYPTO
FUTURES</button>
<button onClick={() => setDashboardFilter('FOREX')} className={`flex-1 py-3 px-4
text-xs font-black tracking-widest rounded-lg transition-all focus:outline-none focus:ring-0
outline-none flex items-center justify-center gap-2 border ${dashboardFilter === 'FOREX' ?
'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><Globe className="w-4 h-4" /> FOREX</button>
</div>
<TVAdvancedChartWidget market={dashboardFilter} />
{dashboardData?.lastUpdated && (
<p className="text-center text-[10px] text-slate-500 mb-4 font-bold tracking-widest flex items-center justify-center gap-1">
<Radio className="w-3 h-3 text-emerald-500 animate-pulse"/> LIVE DATA
SINKRON: <span className="text-slate-300">{dashboardData.lastUpdated}</span>
</p>
)}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
{((dashboardFilter === 'FUTURES' ? dashboardData?.futures :
dashboardData?.forex) || []).length === 0 ? (
<div className="col-span-full bg-slate-900/30 border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
<Database className="w-12 h-12 text-slate-700" />
<p className="text-slate-500 font-medium text-sm">Belum ada data. Silakan
tekan <strong className="text-emerald-400">Analisa Ulang</strong> untuk memindai
market saat ini.</p>
</div>
) : (
(dashboardFilter === 'FUTURES' ? dashboardData.futures :
dashboardData.forex).map((item, idx) => {
const isInsta = item.confidence >= 95;
const isHigh = item.confidence >= 85 && item.confidence < 95;
const isNeutral = item.action === 'NEUTRAL' || item.action === 'WAIT';
let cardStyles = ''; let glowStyles = null; let statusBadge = '';
if (isNeutral) {
cardStyles = 'border-slate-500/50 shadow-[0_0_20px_rgba(100,116,139,0.1)] bg-gradient-to-br from-[#0b1016] to-slate-800/20 grayscale-[30%]';
statusBadge = 'bg-slate-500/20 text-slate-300 border-slate-500/50';
} else if (isInsta) {
cardStyles = 'border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.15)] bg-gradient-to-br from-[#0b1016] to-fuchsia-900/10';
glowStyles = <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-600/20 blur-[60px] pointer-events-none"></div>;
statusBadge = 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.3)]';
} else if (isHigh) {
cardStyles = 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)] bg-gradient-to-br from-[#0b1016] to-emerald-900/10';
glowStyles = <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-600/15 blur-[60px] pointer-events-none"></div>;
statusBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
} else {
cardStyles = 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.05)] bg-gradient-to-br from-[#0b1016] to-amber-900/10';
glowStyles = <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/10 blur-[60px] pointer-events-none"></div>;
statusBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
}
let displayDuration = item.duration || (item.expectedDuration ?
item.expectedDuration.split('(')?.[1]?.replace(')', '') : '');
let safeEntryWindow = item.entryWindow;
if (!displayDuration || displayDuration.toUpperCase() === 'N/A' ||
displayDuration.toUpperCase() === 'NONE') displayDuration = "Estimasi Dinamis";
if (!safeEntryWindow || safeEntryWindow.toUpperCase() === 'N/A' ||
safeEntryWindow.toUpperCase() === 'NONE' || safeEntryWindow.trim() === '')
safeEntryWindow = "Menunggu Konfirmasi";
let displayTime = item.validTime || (item.expectedDuration ?
item.expectedDuration.split('(')?.[0]?.replace('⏳ Time :', '').trim() : '');
displayTime = cleanTimeStr(displayTime,
dashboardData?.lastUpdated?.includes('WITA') ? 'WITA' :
dashboardData?.lastUpdated?.includes('WIT') ? 'WIT' : 'WIB');
const buyFlow = item.orderFlow?.buy || 50; const sellFlow =
item.orderFlow?.sell || 50;
const orderFlowGauge = (
<div className="bg-[#070a10]/80 p-3 rounded-xl border border-white/10 mt-1 relative z-10 shrink-0">
<div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest mb-1.5">
<span className="text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Buy {buyFlow}%</span>
<span className="text-slate-400 opacity-60">Order Flow Gauge
⚖</span>
<span className="text-red-400 flex items-center gap-1">{sellFlow}%
Sell <TrendingUp className="w-3 h-3 rotate-180"/></span>
</div>
<div className="w-full h-1.5 rounded-full overflow-hidden flex shadow-inner bg-slate-800">
<div style={{ width: `${buyFlow}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] relative"><div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]"></div></div>
<div style={{ width: `${sellFlow}%` }} className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] relative"></div>
</div>
</div>
);
let conclusionStyle = "bg-amber-500/10 border-amber-500/30 text-amber-300";
let conclusionTitle = "CONCLUSION & ALERT";
let conclusionIcon = <ShieldAlert className="w-3 h-3"/>;
if (item.session && (item.session.toLowerCase().includes('new york') ||
item.session.toLowerCase().includes('us'))) {
conclusionStyle = "bg-red-500/15 border-red-500/40 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]"; conclusionTitle = "NEW YORK SNIPER ELITE 🎯"; conclusionIcon = <Target className="w-3 h-3 text-red-400"/>;
} else if (item.session && (item.session.toLowerCase().includes('london') ||
item.session.toLowerCase().includes('euro'))) {
conclusionStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]"; conclusionTitle = "LONDON FAKE MOVE WARNING ⚠"; conclusionIcon = <AlertCircle className="w-3 h-3 text-emerald-400"/>;
}
const d = new Date();
const dayOfWeek = d.toLocaleDateString('id-ID', { weekday: 'long' });
const isWeekend = dayOfWeek === 'Sabtu' || dayOfWeek === 'Minggu' ||
dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
const isConclusionWeekend =
item.newsPrediction?.conclusion?.toLowerCase().includes('besok') ||
item.newsPrediction?.conclusion?.toLowerCase().includes('opening') ||
item.newsPrediction?.conclusion?.toLowerCase().includes('sesi asia');
if (isConclusionWeekend || isWeekend) {
conclusionTitle = "MARKET OPEN PREDICTOR 🔮";
conclusionIcon = <Activity className="w-3 h-3 text-fuchsia-400"/>;
conclusionStyle = "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-200 shadow-[0_0_15px_rgba(217,70,239,0.2)]";
}
const mergedConclusionStyle = "border rounded-lg p-2.5 shadow-sm transition-all " + conclusionStyle;
let predictionContent;
if (typeof item.newsPrediction === 'object' && item.newsPrediction !== null) {
predictionContent = (
<div className="flex flex-col gap-2.5 mt-2 w-full">
<div className="bg-[#111820] border border-blue-500/20 rounded-lg p-2.5 shadow-sm"><span className="text-[9px] font-black text-blue-400 flex items-center gap-1.5 mb-1"><LayoutDashboard className="w-3 h-3"/> INSTITUSI (MEMB)</span><p
className="text-[10px] text-slate-300 leading-relaxed">{item.newsPrediction.institusi}</p></div>
<div className="bg-[#111820] border border-cyan-500/20 rounded-lg p-2.5 shadow-sm"><span className="text-[9px] font-black text-cyan-400 flex items-center gap-1.5 mb-1"><Activity className="w-3 h-3"/> WHALE (SOSOVALUE)</span><p
className="text-[10px] text-slate-300 leading-relaxed">{item.newsPrediction.whale}</p></div>
<div className="bg-[#0b1016] border border-slate-700/50 rounded-lg p-2.5 shadow-sm opacity-80"><span className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 mb-1"><Globe className="w-3 h-3"/> ASTROLOGI & SIKLUS
WAKTU (SPEKULATIF)</span><p className="text-[10px] text-slate-400 leading-relaxed italic">{item.newsPrediction.astrologi}</p></div>
<div className={mergedConclusionStyle}><span
className="text-[9px] font-black flex items-center gap-1.5 mb-1 opacity-90">{conclusionIcon} {conclusionTitle}</span><p className="text-[10px] font-bold leading-relaxed whitespace-pre-wrap">{item.newsPrediction.conclusion}</p></div>
</div>
);
} else {
let displayNewsPrediction = item.newsPrediction;
if (!displayNewsPrediction || displayNewsPrediction.toUpperCase() === 'N/A'
|| displayNewsPrediction.toUpperCase() === 'NONE' || displayNewsPrediction.trim() === '')
displayNewsPrediction = "🔮 Sentimen Makro: Menunggu konfirmasi aliran dana institusi (Whale) dan antisipasi pidato makroekonomi selanjutnya.";
predictionContent = <span className="text-[11px] sm:text-xs text-fuchsia-100/90 font-medium leading-relaxed mt-1 block">{displayNewsPrediction}</span>;
}
let cleanCurrentPrice = formatDisplayPrice(item.currentPrice); let
cleanTargetPrice = formatDisplayPrice(item.targetPrice);
return (
<div key={idx} className={"h-full rounded-[24px] p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden transition-all border " + cardStyles}>
{glowStyles}
<div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500/20 border-b border-x border-blue-500/30 px-3 py-0.5 rounded-b-lg flex items-center gap-1.5 z-20 shadow-sm backdrop-blur-sm"><Zap className="w-2.5 h-2.5 text-blue-400"
fill="currentColor"/><span className="text-[7px] text-blue-300 font-bold uppercase tracking-widest whitespace-nowrap">Synced with TV Live Data & Global
Sources</span></div>
<div className="flex justify-between items-start relative z-10 mt-3 gap-2">
<div className="flex-1 min-w-0">
<h3 className="text-xl sm:text-2xl font-black text-white tracking-wider mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
<span className="truncate">{item.pair}</span>
<span className={`text-[9px] sm:text-[11px] px-2 sm:px-3 py-1
rounded shadow-md uppercase tracking-widest font-black border shrink-0 ${isNeutral ?
'bg-slate-500/20 text-slate-300 border-slate-500/50' : item.action === 'BUY' ?
'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>{item.action} {isNeutral ? '⚪' : item.action === 'BUY' ? '🟢' :
'🔴'}</span>
</h3>
<div className={`text-[8px] sm:text-[10px] px-2 sm:px-2.5 py-1
rounded-md uppercase tracking-widest font-black flex items-center gap-1.5 w-fit max-w-full
border ${statusBadge}`}><span className="truncate">{item.status}</span></div>
</div>
<div className={`flex flex-col items-end shrink-0 pl-2`}>
<div className={`text-2xl sm:text-3xl font-black leading-none
drop-shadow-lg ${isNeutral ? 'text-slate-400' : isInsta ? 'text-fuchsia-400' : isHigh ?
'text-emerald-400' : 'text-amber-400'}`}>{Math.min(parseInt(item.confidence) || 0, 100)}<span
className="text-sm sm:text-lg opacity-70">%</span></div>
<div className="text-[7px] sm:text-[9px] text-slate-400 font-black tracking-widest uppercase mt-1 text-right">CONFIDENCE</div>
</div>
</div>
{cleanCurrentPrice && cleanTargetPrice && !isNeutral && (
<div className="flex items-center gap-2 sm:gap-3 bg-[#070a10]/80 p-3 sm:p-3.5 rounded-xl border border-white/10 shadow-inner relative z-10 shrink-0 mt-1">
<Target className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${item.action
=== 'BUY' ? 'text-emerald-500' : 'text-red-500'}`} />
<div className="flex-1 flex items-center justify-between min-w-0">
<div className="flex flex-col truncate"><span
className="text-[7px] sm:text-[8px] text-slate-500 font-bold uppercase tracking-widest truncate">Live Price</span><span className="text-[11px] sm:text-sm font-black text-slate-200 truncate">{cleanCurrentPrice}</span></div>
<div className="flex-1 border-b-2 border-dashed border-slate-600/50 mx-2 sm:mx-4 relative min-w-[20px]"><div className={`absolute -top-2
left-1/2 -translate-x-1/2 text-[6px] sm:text-[7px] font-black uppercase tracking-widest
bg-[#0b1016] px-1 sm:px-1.5 rounded-full ${item.action === 'BUY' ? 'text-emerald-500' :
'text-red-500'}`}>PROYEKSI</div><ArrowRight className={`absolute -top-1.5 sm:-top-2
-right-1 sm:-right-1.5 w-3 h-3 sm:w-4 sm:h-4 ${item.action === 'BUY' ? 'text-emerald-500' :
'text-red-500'}`} /></div>
<div className="flex flex-col items-end truncate"><span
className="text-[7px] sm:text-[8px] text-amber-500/80 font-bold uppercase tracking-widest truncate">Target Area</span><span className={`text-[11px] sm:text-sm font-black truncate
${item.action === 'BUY' ? 'text-emerald-400' :
'text-red-400'}`}>{cleanTargetPrice}</span></div>
</div>
</div>
)}
{orderFlowGauge}
<div className="grid grid-cols-2 gap-4 bg-[#070a10]/80 p-4 rounded-xl border border-white/10 shadow-inner mt-1 relative z-10 flex-1">
<div className="flex flex-col gap-4">
<div><div className="text-[8px] text-slate-500 font-bold uppercase mb-1 tracking-wider">Sesi & Volatilitas</div><div className="text-[11px] font-bold text-slate-200 leading-tight flex flex-wrap items-center gap-1">{item.session} <span
className="text-[9px] text-emerald-400 shrink-0">({Math.min(parseInt(item.sessionScore) ||
0, 100)}/100)</span></div><div className="text-[10px] text-amber-400 mt-1 font-black uppercase tracking-widest">{item.marketSpeed}</div></div>
<div><div className="text-[8px] text-slate-500 font-bold uppercase mb-1 tracking-wider">News Risk</div><div className={`text-[11px] font-black
tracking-widest uppercase leading-tight ${item.newsRisk === 'LOW' ? 'text-emerald-400' :
item.newsRisk === 'MEDIUM' ? 'text-amber-400' :
'text-red-400'}`}>{item.newsRisk}</div></div>
</div>
<div className="flex flex-col gap-4 border-l border-white/5 pl-4">
<div><div className="text-[8px] text-slate-500 font-bold uppercase mb-1 tracking-wider">Entry Window</div><div className="text-[11px] font-bold text-slate-200 leading-tight">{safeEntryWindow}</div></div>
<div className="flex flex-col"><div className="text-[8px] text-slate-500 font-bold uppercase mb-1 tracking-wider">AI Mode</div><div
className="text-[11px] font-black text-indigo-400 leading-tight">{item.mode}</div>{item.trapDetection && item.trapDetection.toUpperCase()
!== "NONE" && item.trapDetection.trim() !== "" && (<div className={`mt-1.5 inline-flex
items-center gap-1 px-1.5 py-1 rounded border shadow-[0_0_10px_rgba(0,0,0,0.5)] w-fit
max-w-[120px] ${item.trapDetection.toLowerCase().includes('bullish') ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}><AlertCircle className="w-2.5 h-2.5 shrink-0"
/><span className="text-[8px] font-black uppercase tracking-widest leading-none truncate">{item.trapDetection}</span></div>)}</div>
</div>
</div>
<div className="flex justify-between items-center bg-[#070a10]/80 p-2.5 sm:p-3 rounded-xl border border-white/10 shadow-inner mt-0.5 relative z-10 shrink-0">
<div className="text-[10px] sm:text-[11px] font-black text-slate-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
<span className="text-slate-500 uppercase tracking-widest text-[8px] sm:text-[9px]">Durasi:</span><span
className="text-amber-400">{displayDuration}</span></div>
<div className="text-[9px] sm:text-[10px] font-black text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-md border border-amber-500/30 shadow-sm flex items-center gap-1.5 shrink-0 max-w-[55%]"><span className="text-amber-500/80 uppercase tracking-widest text-[8px] shrink-0">⏳ Waktu:</span><span
className="truncate">{displayTime}</span></div>
</div>
<div className="bg-gradient-to-br from-slate-900/80 to-[#0b1016] border border-fuchsia-500/30 rounded-xl p-3 sm:p-4 relative z-10 shrink-0 shadow-sm flex flex-col items-start gap-1 mt-1 w-full"><div className="flex items-center gap-2 mb-1 w-full border-b border-fuchsia-500/20 pb-2"><Database className="w-4 h-4 text-fuchsia-400 shrink-0 animate-pulse" /><span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">🧠 AI Historical Prediction (MEMB)</span></div>{predictionContent}</div>
<div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1 relative z-10 shrink-0">
{[ { label: 'TREND', score: Math.min(parseInt(item.scores?.trend) || 0,
25), max: 25 }, { label: 'SMC', score: Math.min(parseInt(item.scores?.smc) || 0, 20), max: 20
}, { label: 'VOLUME', score: Math.min(parseInt(item.scores?.volume) || 0, 15), max: 15 }, {
label: 'FUNDAMENTAL', score: Math.min(parseInt(item.scores?.fundamental) || 0, 20), max:
20 }, { label: 'SENTIMENT', score: Math.min(parseInt(item.scores?.sentiment) || 0, 10), max:
10 }, { label: 'PERSONA', score: Math.min(parseInt(item.scores?.persona) || 0, 10), max: 10 }
].map(s => (
<div key={s.label} className="bg-black/30 rounded-xl p-2 text-center border border-white/5 flex flex-col items-center justify-center hover:bg-white/5 transition-colors"><div className="text-[7px] sm:text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1 leading-none">{s.label}</div><div className="text-xs sm:text-sm font-black text-slate-200 leading-none">{s.score}<span className="text-[9px] text-slate-500 font-bold">/{s.max}</span></div></div>
))}
</div>
<div className="mt-2 space-y-2 relative z-10 shrink-0">
<div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest border-b border-white/10 pb-1.5 flex items-center gap-1.5"><Search
className="w-3.5 h-3.5 text-amber-500" /> Multi-Source AI Reasoning</div>
{item.reasons?.map((reason, rIdx) => (
<div key={rIdx} className="flex items-start gap-2.5 text-[11px] sm:text-xs text-slate-300 bg-[#070a10] p-3 rounded-xl border border-white/5 shadow-sm"><CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isInsta ?
'text-fuchsia-400' : isHigh ? 'text-emerald-400' : 'text-amber-400'}`} /><span
className="leading-relaxed font-medium">{reason}</span></div>
))}
</div>
</div>
);
})
)}
</div>
</div>
)}
{}
{activeTab === 'news' && (
<div className="animate-in fade-in duration-200">
<div className="flex items-center gap-2 mb-6"><Newspaper className="w-5 h-5 text-indigo-400" /><h2 className="text-sm font-black uppercase tracking-widest text-white">Intelijen Berita Makro</h2></div>
<div className="flex bg-[#0b1016] border border-white/5 rounded-xl p-1 mb-6 shadow-lg overflow-x-auto custom-scrollbar">
<button onClick={() => setNewsFilter('calendar')} className={`flex-shrink-0 flex-1
py-3 px-4 text-xs font-black tracking-widest rounded-lg transition-all focus:outline-none
focus:ring-0 outline-none flex items-center justify-center gap-2 border ${newsFilter ===
'calendar' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'border-transparent text-slate-500 hover:text-slate-300'} `}><CalendarDays className="w-4 h-4" />
KALENDER</button>
<button onClick={() => setNewsFilter('prediction')} className={`flex-shrink-0 flex-1
py-3 px-4 text-xs font-black tracking-widest rounded-lg transition-all focus:outline-none
focus:ring-0 outline-none flex items-center justify-center gap-2 border ${newsFilter ===
'prediction' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><Database className="w-4 h-4" /> PREDICTION 🔮</button>
</div>
<div className="w-full relative min-h-[600px]">
{newsFilter === 'calendar' && <TVCalendarWidget />}
{newsFilter === 'prediction' && (
<div className="w-full animate-in fade-in duration-300">
<div className="bg-[#0b1016]/80 p-5 sm:p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl mb-6">
<div className="flex items-start sm:items-center gap-3 mb-4"><div
className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center shrink-0 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.3)]"><Globe
className="w-5 h-5 text-fuchsia-400" /></div><div><h3 className="text-sm sm:text-base font-black text-white tracking-widest uppercase">Prediction Makro 🔮</h3><p
className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Tulis isu ekonomi, geopolitik,
kebijakan Bank Sentral, Astrologi Finansial, atau proyeksi pasar yang ingin Anda
analisis.</p></div></div>
<textarea value={predictQuery} onChange={(e) =>
setPredictQuery(e.target.value)} placeholder="Contoh: Apa dampak pergerakan Mercury Retrograde dipadu pidato The Fed malam ini terhadap harga Emas (XAUUSD)?"
className="w-full h-28 bg-[#070a10] border border-white/10 rounded-xl p-4 text-sm font-medium text-white focus:outline-none focus:border-fuchsia-500/50 transition-all resize-none shadow-inner mb-4 custom-scrollbar placeholder:text-slate-600" />
{predictError && (<div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-start gap-2.5 shadow-sm"><AlertCircle
className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /><p className="text-[11px] sm:text-xs text-red-300 font-medium leading-relaxed">{predictError}</p></div>)}
<button onClick={handlePredictSubmit} disabled={predictLoading ||
!predictQuery.trim()} className={`w-full py-4 rounded-xl font-black text-xs sm:text-sm flex
items-center justify-center gap-2 shadow-lg uppercase tracking-widest focus:outline-none
focus:ring-0 transition-all ${predictLoading ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : !predictQuery.trim() ? 'bg-[#111820] text-slate-600 cursor-not-allowed border border-transparent' : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:scale-[1.01]'}`}>{predictLoading ? <><Loader2 className="w-4 h-4 animate-spin" />
Menganalisis Isu Global...</> : <><Search className="w-4 h-4" /> Prediksi Masa Depan
🔮</>}</button>
</div>
{predictData && (
<div className="bg-[#0b1016] border border-fuchsia-500/30 rounded-[24px] overflow-hidden shadow-[0_0_30px_rgba(217,70,239,0.1)] relative">
<div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/10 blur-[80px] pointer-events-none"></div><div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[80px] pointer-events-none"></div>
<div className="p-6 sm:p-8 relative z-10">
<div className="border-b border-white/10 pb-5 mb-6"><div
className="flex flex-wrap gap-2 items-center mb-3"><span className="bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">HASIL PREDICTION 🔮</span><span
className="text-[10px] text-slate-500 font-bold bg-[#111820] px-3 py-1 rounded-lg border border-white/5">{predictData.date}</span></div><h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 tracking-wide">{predictData.title}</h2></div>
<div className="mb-6"><p className="text-slate-300 text-sm leading-relaxed border-l-2 border-fuchsia-500/50 pl-4 py-1 italic bg-fuchsia-500/5 rounded-r-lg">{predictData.summary}</p></div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
<div className="bg-[#111820] p-5 rounded-2xl border border-white/5 shadow-inner"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 border-b border-white/5 pb-2"><Target className="w-3.5 h-3.5 text-amber-500" /> Faktor Utama
Pendorong</h4><ul className="space-y-2">{predictData.factors?.map((f, i) => (<li key={i}
className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed"><span
className="text-amber-500/80 mt-0.5 shrink-0">■</span> {f}</li>))}</ul></div>
<div className="flex flex-col gap-4"><div
className="bg-[#111820] p-5 rounded-2xl border border-white/5 shadow-inner flex items-center justify-between"><div><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Analisis Sentimen</h4><span className={`text-sm
sm:text-base font-black px-3 py-1 rounded-lg border shadow-sm flex items-center w-fit
${predictData.sentiment?.toUpperCase() === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : predictData.sentiment?.toUpperCase() ===
'BEARISH' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'}`}>{predictData.sentiment?.toUpperCase()}</span></div><div
className="text-right"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tingkat Keyakinan</h4><span className="text-lg font-black text-white tracking-widest">{predictData.confidence}</span></div></div></div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
<div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-500/20"><h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Dampak Potensial (Positif)</h4><ul
className="space-y-1.5">{predictData.impactPositive?.map((ip, i) => (<li key={i}
className="text-xs text-emerald-100/80 leading-relaxed flex items-start gap-1.5"><CheckCircle className="w-3 h-3 shrink-0 text-emerald-500 mt-0.5" />
{ip}</li>))}</ul></div>
<div className="bg-red-900/10 p-4 rounded-xl border border-red-500/20"><h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 rotate-180" /> Dampak Potensial (Negatif)</h4><ul
className="space-y-1.5">{predictData.impactNegative?.map((in_neg, i) => (<li key={i}
className="text-xs text-red-100/80 leading-relaxed flex items-start gap-1.5"><X
className="w-3 h-3 shrink-0 text-red-500 mt-0.5" /> {in_neg}</li>))}</ul></div>
</div>
<div className="space-y-4 mb-6">
<div className="bg-[#111820] p-4 rounded-xl border border-white/5 border-l-4 border-l-blue-500"><h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Skenario Utama</h4><p
className="text-xs text-slate-300 leading-relaxed">{predictData.mainScenario}</p></div>
<div className="bg-[#111820] p-4 rounded-xl border border-white/5 border-l-4 border-l-amber-500"><h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Skenario Alternatif / Risiko</h4><p
className="text-xs text-slate-300 leading-relaxed">{predictData.altScenario}</p></div>
</div>
{(predictData.support?.length > 0 || predictData.resistance?.length >
0) && (
<div className="bg-[#070a10] p-5 rounded-2xl border border-white/10 mb-6 flex flex-col sm:flex-row gap-6"><div className="flex-1"><h4
className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Level Penting (Support)</h4><ul
className="space-y-1">{predictData.support?.map((s, i) => <li key={i} className="text-xs text-slate-300 font-bold font-mono bg-[#111820] px-2 py-1 rounded border border-white/5">{s}</li>)}</ul></div><div className="flex-1"><h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Level Penting (Resistance)</h4><ul
className="space-y-1">{predictData.resistance?.map((r, i) => <li key={i}
className="text-xs text-slate-300 font-bold font-mono bg-[#111820] px-2 py-1 rounded border border-white/5">{r}</li>)}</ul></div></div>
)}
<div className="mt-8 border-t border-white/10 pt-6">
<h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Kesimpulan Akhir</h4><p className="text-sm font-bold text-white leading-relaxed mb-6">{predictData.conclusion}</p>
<div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-2 border border-slate-700/50"><Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" /><p className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-relaxed italic">Catatan Risiko: Prediksi bersifat probabilistik dan dapat berubah
mengikuti perkembangan data ekonomi, kebijakan pemerintah, maupun kondisi
astrologi/geopolitik terbaru. Bukan merupakan nasihat keuangan mutlak.</p></div>
</div>
</div>
</div>
)}
</div>
)}
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
<div className="flex items-center justify-between bg-[#070a10] p-4 rounded-2xl border border-white/5">
<div><h3 className="text-sm font-bold text-white mb-1">Tampilkan Target
Pips</h3><p className="text-[10px] text-slate-400">Tampilkan jumlah Pips di kartu
setup.</p></div>
<button onClick={() => setDraftConfig(prev => ({...prev, showPips:
!prev?.showPips}))} className="text-amber-400 hover:text-amber-300 focus:outline-none focus:ring-0 outline-none">{draftConfig?.showPips ? <ToggleRight className="w-8 h-8" /> :
<ToggleLeft className="w-8 h-8 text-slate-600" />}</button>
</div>
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
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-amber-500"/> 5.
PREFERENSI SIGNAL DASHBOARD</label>
<div className="flex flex-col gap-3">
{Object.entries(DASHBOARD_MODES).map(([modeKey, data]) => {
const isActive = draftConfig?.dashboardMode === modeKey;
return (
<button key={modeKey} onClick={() => setDraftConfig(prev => ({...prev,
dashboardMode: modeKey}))} className={`flex flex-col items-start text-left p-4 rounded-2xl
border transition-all focus:outline-none focus:ring-0 outline-none ${isActive ? 'bg-[#111820] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-[#070a10] border-white/5 text-slate-400 hover:border-white/10'}`}>
<div className="flex items-center gap-2 mb-2 w-full">
{data.icon}
<span className={`font-black text-sm tracking-wide ${isActive ?
'text-white' : 'text-slate-300'}`}>{data.title}</span>
{isActive && <CheckCircle className="w-4 h-4 text-amber-500 ml-auto" />}
</div>
<p className="text-[11px] leading-relaxed mb-3 opacity-80">{data.desc}</p>
<div className="w-full bg-[#070a10] p-2.5 rounded-xl border border-white/5">
<div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Timeframe Analisis</div>
<div className={`text-[11px] font-bold mb-2 ${isActive ?
'text-amber-400' : 'text-slate-300'}`}>{data.tfs}</div>
<div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Durasi Signal</div>
<div className={`text-[11px] font-bold ${isActive ? 'text-emerald-400' :
'text-slate-300'}`}>{data.dur}</div>
</div>
</button>
)
})}
</div>
<p className="text-[10px] text-slate-500 mt-3 text-center italic bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl leading-relaxed">
*Catatan: Durasi setiap sinyal tidak bersifat tetap. AI akan menghitung estimasi
waktu secara real-time.
</p>
</div>
<div>
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 block">6. Gaya Pemikiran AI (Tokoh Trading)</label>
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
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500"/> 7. Verification &
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
<label className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2 flex-shrink-0"><Target className="w-4 h-4 text-amber-400" /> 8.
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
<div className="w-full">{renderCardsAndReport(activeHistoryItem.report,
activeHistoryItem.pair, activeHistoryItem.deepSeekVerification)}</div>
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
<button onClick={() => handleTabChange('dashboard')} className={`flex flex-col
items-center justify-center flex-1 py-2 rounded-xl transition-all focus:outline-none focus:ring-0
outline-none ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}><LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 mb-1" /><span className="text-[8px] sm:text-[9px] font-bold tracking-widest">DASBOR</span></button>
<button onClick={() => handleTabChange('news')} className={`flex flex-col
items-center justify-center flex-1 py-2 rounded-xl transition-all focus:outline-none focus:ring-0
outline-none ${activeTab === 'news' ? 'bg-fuchsia-500/10 text-fuchsia-400 shadow-inner' :
'text-slate-500 hover:text-slate-300'}`}><Globe className="w-4 h-4 sm:w-5 sm:h-5 mb-1"
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