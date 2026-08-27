# ApexQuant Elite — Development Plan (Updated)

## 1) Objectives
- Rebuild the **ApexQuant Elite** web app from the PDF-reconstructed React source with **UI + copy + behavior matching the provided code** while supporting the user-requested removals/changes.
- Replace Firebase Auth/Firestore realtime with a **MongoDB-backed drop‑in shim** that preserves existing frontend call sites (`doc/collection/setDoc/updateDoc/deleteDoc/onSnapshot`) and persists settings/history.
- Make all non-CORS-safe integrations work via **FastAPI proxies**:
  - **Gemini** via backend passthrough (`/api/llm/generate`) using the user’s Gemini API key.
  - Sosovalue + DeepSeek + TwelveData proxied server-side.
- Keep Binance/Bitget direct as in the original code, with fallbacks where needed.

**Current status:** Objectives have been achieved and verified, with additional Phase 3 bug fixes and user-requested removals applied.

---

## 2) Implementation Steps

### Phase 1 — Core POC (isolation first; do not proceed until stable)
**Goal:** prove the three riskiest cores work end-to-end: (A) multimodal LLM proxy, (B) Mongo realtime-ish shim semantics, (C) 3rd party API proxy.

1) **Prep integration test scaffold**
   - ✅ Created `/app/image_testing.md` from the provided testing playbook.
   - ✅ Backend `.env` configured for Gemini and proxy keys.

2) **Backend POC endpoints (FastAPI)**
   - ✅ `POST /api/llm/generate`
     - Input: Gemini-native payload `{contents:[{role,parts:[{text},{inlineData:{mimeType,data}}]}], generationConfig, tools}`
     - Output: Gemini-native response `{candidates:[{content:{parts:[{text}]}}]}`
     - Supports: text-only, up to 3 base64 JPEG images, temperature, strict JSON output.
     - **Hardening added:** multi-model fallback chain (`GEMINI_MODELS`) and automatic retry without `google_search` tools when grounded quota is unavailable.
   - ✅ `GET /api/proxy/twelvedata/price` and `GET /api/proxy/twelvedata/time_series`
   - ✅ `GET /api/proxy/sosovalue?symbol=...` (graceful fallback)
   - ✅ `POST /api/proxy/deepseek` (DeepSeek upstream may 402; Gemini fallback verifier implemented)
   - ✅ Optional Binance/Bitget proxy endpoints available for fallback, but server-side Binance may be geo-blocked.

3) **MongoDB doc-store POC**
   - ✅ Firestore-like paths persisted in MongoDB:
     - `users/{uid}/config/preferences_v88`
     - `users/{uid}/analysis_history_v88/*`
   - ✅ Minimal REST:
     - `PUT /api/store/doc` (setDoc)
     - `PATCH /api/store/doc` (updateDoc)
     - `DELETE /api/store/doc`
     - `GET /api/store/doc`
     - `GET /api/store/collection` (list docs)
   - Note: `onSnapshot` is emulated client-side by polling + local write-bus in the shim.

4) **Single-file POC runner**
   - ✅ `/app/test_core.py` validates:
     - Gemini: text, strict JSON, 3x base64 chart-image vision
     - Mongo store CRUD + collection
     - Bitget candles
     - TwelveData price + series
     - Sosovalue fallback
     - DeepSeek verifier via Gemini fallback

5) **Fix until green**
   - ✅ Phase 1 complete: `/app/test_core.py` passes all checks.

**Phase 1 user stories (all complete)**
1. ✅ Developer can call `/api/llm/generate` with Gemini-style payload and receive a Gemini-style response.
2. ✅ Developer can send 3 base64 images and get a valid response.
3. ✅ Developer can request JSON-only output and parse it.
4. ✅ Developer can persist/retrieve documents in Mongo using Firestore-like paths.
5. ✅ Developer can read Sosovalue/DeepSeek/TwelveData via backend without browser CORS failures.

---

### Phase 2 — V1 App Build (pixel parity, minimal deltas, then E2E test)
**Goal:** ship the full app with identical UI/behavior to the provided source, with working backend.

1) **Frontend: keep App code identical**
   - ✅ Reconstructed source is stored and used: `/app/frontend/src/App.js` (2677 lines, Babel-parse validated).
   - ✅ Tailwind + global CSS aligned to the dark theme (`#070a10`, `#0b1016`, borders, blur, shadows).
   - ✅ Lucide icons and responsive bottom tab bar implemented.

2) **Drop-in Firebase shim module (MongoDB-backed)**
   - ✅ Firebase imports replaced with `./lib/fbshim` exposing:
     - `initializeApp/getApps/getApp`
     - `getAuth/signInAnonymously/signInWithCustomToken/onAuthStateChanged`
     - `getFirestore/doc/collection/setDoc/updateDoc/deleteDoc/onSnapshot`
   - ✅ Anonymous uid stored in `localStorage`.
   - ✅ `onSnapshot` emulated by polling + immediate local update bus.

3) **Wire all proxies without changing UX**
   - ✅ Gemini calls rerouted to `${API_BASE}/api/llm/generate`.
   - ✅ Sosovalue/DeepSeek/TwelveData routed to backend proxies.
   - ✅ Binance/Bitget kept direct with silent fallback logic (Binance server-side is geo-blocked; app falls back to Bitget as intended).

4) **History correctness & settings persistence**
   - ✅ History writes persist through MongoDB shim.
   - ✅ Settings persist after full page reload (manual verification completed).

5) **Run one full E2E test pass**
   - ✅ `testing_agent_v3` executed; critical flows verified (see Phase 3 summary below).

**Phase 2 user stories (updated to reflect removals)**
1. ✅ User can generate a trading setup from live data or uploaded screenshots and see ENTRY/SL/TP cards.
2. ⛔ Dashboard/“Master Analisyst” removed per user request.
3. ✅ User can save settings (mode, RR, TP level, persona, methods) and see them restored after refresh.
4. ✅ User can manage Riwayat (copy, set WIN/LOSS/BEP, delete) and see stats update.
5. ✅ User can open News and use TradingView calendar + AI prediction without crashes.

---

### Phase 3 — Hardening / Parity sweep (still “identical UI”)
**Goal:** eliminate PDF-reconstruction artifacts, improve reliability, and apply user-requested removals.

1) **Parity audit & bug fixes (completed, verified)**
   - ✅ **Signal cards missing** (ENTRY/SL/TP):
     - Root cause: PDF word-wrap inserted newline inside `extractTP` regex template literal.
     - Fix: normalized regex to `Harga\s*${tpLabel}\s*:` pattern.
     - Result: cards render with prices, pips, copy buttons.
   - ✅ **Rejected signal raw HTML leak**:
     - Root cause: multi-line template literal split by `\n`, only first fragment rendered via `dangerouslySetInnerHTML`.
     - Fix: single-line HTML string + rejected-view rendering moved after card component definitions (avoids TDZ) and now shows cards even when rejected.

2) **Reliability improvements (completed, verified)**
   - ✅ **CRA runtime error overlay “Script error.”** (TradingView cross-origin):
     - Fix: devServer overlay config `runtimeErrors: false` in `craco.config.js`.
     - Additional guard: capture-phase suppression in `public/index.html` for benign TradingView errors.
   - ✅ **Gemini quota resilience**:
     - Fix: backend multi-model fallback chain (`GEMINI_MODELS`) and retry without grounding tools.

3) **User-requested removals/updates (completed, verified)**
   - ✅ Removed **DASBOR / Market Insider**:
     - Deleted dashboard tab UI, nav button, dashboard state and generator function.
   - ✅ Removed **“Preferensi Signal Dashboard”** in Pengaturan:
     - Removed Pulse/Momentum/Titan UI section.
     - Deleted `DASHBOARD_MODES` constant and `dashboardMode` config keys.
     - Renumbered remaining settings sections.

4) **Testing pass (completed)**
   - ✅ `testing_agent_v3` verification (iteration_2.json) confirms:
     - Signal cards render
     - No raw HTML leak
     - No runtime error overlay
     - Dashboard removed
     - Preferensi Signal Dashboard removed
   - ✅ Manual verification completed for:
     - Settings persistence after reload
     - News Prediction AI flow

**Phase 3 user stories (updated)**
1. ✅ User doesn’t lose settings/history across reloads (MongoDB shim).
2. ✅ AI actions show consistent loading/error handling without UI crashes.
3. ⛔ Dashboard refresh story removed (dashboard removed).
4. ⚠ DeepSeek verification works via Gemini fallback (DeepSeek upstream 402 is a known limitation).
5. ✅ App remains usable on mobile widths; NEWS tab no longer blocks UI.

---

## 3) Next Actions
1. **(Optional) Re-enable Google Search grounding**
   - Current: tools block often returns quota/billing 429; backend auto-retries without grounding.
   - Next: enable billing / higher quota on Gemini project to restore grounded responses.

2. **(Optional) DeepSeek verification restoration**
   - Current: DeepSeek upstream returns HTTP 402; Gemini fallback verifier is used.
   - Next: provide a paid/working DeepSeek key or remove DeepSeek label if you prefer “single AI only”.

3. **Production build pass**
   - Build optimized bundle and verify no dev-only behaviors.

4. **Feature expansion (optional)**
   - Export/share setup as image/text
   - Alerts/notifications for killzones
   - Additional caching/rate limiting for LLM calls

---

## 4) Success Criteria
- ✅ **POC:** `/app/test_core.py` passes all checks (Gemini text+3images+JSON, Mongo store ops, proxies).
- ✅ **Parity:** UI/wording/layout match the provided source, with requested removals applied.
- ✅ **Persistence:** Settings and history persist via MongoDB after refresh.
- ✅ **No CORS breaks:** Sosovalue/DeepSeek/TwelveData are served through backend proxies (with graceful fallbacks as needed).
- ✅ **E2E:** testing agent validates primary workflows for Analyze/News/History/Settings, and confirms removals (no Dashboard; no Preferensi Signal Dashboard).

### Known limitations (documented)
- **Google Search grounding:** requires billing/quota; backend currently auto-falls back to ungrounded generation.
- **DeepSeek:** upstream may return 402; verifier falls back to Gemini.
- **Binance:** server IP may be geo-blocked (HTTP 451); browser-side direct calls + Bitget fallback remain the primary path.
