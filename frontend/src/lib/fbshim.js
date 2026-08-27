/**
 * fbshim.js
 * ---------------------------------------------------------------------------
 * Drop-in replacement for the `firebase/app`, `firebase/auth` and
 * `firebase/firestore` API surface used by ApexQuant Elite, backed by the
 * FastAPI + MongoDB document store (`/api/store/*`).
 *
 * It exposes exactly the same function signatures the app already calls, so
 * the application source stays untouched:
 *   initializeApp / getApps / getApp
 *   getAuth / signInAnonymously / signInWithCustomToken / onAuthStateChanged
 *   getFirestore / doc / collection / setDoc / updateDoc / deleteDoc / onSnapshot
 *
 * `onSnapshot` is emulated with adaptive polling + a local write bus so writes
 * are reflected instantly (same perceived realtime behaviour as Firestore).
 */

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
const STORE = `${API_BASE}/api/store`;
const POLL_MS = 4000;

/* --------------------------------- app ---------------------------------- */
const _apps = [];

export function initializeApp(config) {
  const app = { name: '[DEFAULT]', options: config || {} };
  _apps.push(app);
  return app;
}

export function getApps() {
  return _apps;
}

export function getApp() {
  return _apps[0] || initializeApp({});
}

/* --------------------------------- auth --------------------------------- */
const UID_KEY = 'apexquant.uid.v88';

function resolveUid() {
  try {
    let uid = window.localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = 'anon-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      window.localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch (e) {
    return 'anon-session';
  }
}

let _auth = null;

export function getAuth(app) {
  if (!_auth) {
    _auth = { app: app || getApp(), currentUser: null, _listeners: new Set() };
  }
  return _auth;
}

function _emitAuth(auth) {
  auth._listeners.forEach((cb) => {
    try {
      cb(auth.currentUser);
    } catch (e) {
      /* noop */
    }
  });
}

function _signIn(auth) {
  const uid = resolveUid();
  auth.currentUser = { uid, isAnonymous: true, providerId: 'anonymous' };
  _emitAuth(auth);
  return Promise.resolve({ user: auth.currentUser });
}

export function signInAnonymously(auth) {
  return _signIn(auth || getAuth());
}

export function signInWithCustomToken(auth, _token) {
  return _signIn(auth || getAuth());
}

export function onAuthStateChanged(auth, cb) {
  const a = auth || getAuth();
  a._listeners.add(cb);
  // Fire immediately if already signed in (matches Firebase behaviour).
  if (a.currentUser) {
    setTimeout(() => {
      try {
        cb(a.currentUser);
      } catch (e) {
        /* noop */
      }
    }, 0);
  }
  return () => a._listeners.delete(cb);
}

/* ------------------------------- firestore ------------------------------ */
export function getFirestore(app) {
  return { app: app || getApp(), _type: 'firestore' };
}

function joinPath(segments) {
  return segments
    .filter((s) => s !== undefined && s !== null && s !== '')
    .map((s) => String(s))
    .join('/');
}

export function doc(_db, ...segments) {
  return { _kind: 'doc', path: joinPath(segments), id: joinPath(segments).split('/').pop() };
}

export function collection(_db, ...segments) {
  return { _kind: 'collection', path: joinPath(segments) };
}

/* write bus: lets watchers refresh instantly after a local mutation */
const _bus = new Set();

function notify(path) {
  _bus.forEach((fn) => {
    try {
      fn(path);
    } catch (e) {
      /* noop */
    }
  });
}

function sanitize(value) {
  // Strip undefined / functions so the payload is valid JSON (Firestore-like).
  return JSON.parse(
    JSON.stringify(value === undefined ? null : value, (k, v) => (v === undefined ? null : v))
  );
}

export async function setDoc(ref, data) {
  const res = await fetch(`${STORE}/doc`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: ref.path, data: sanitize(data || {}) }),
  });
  if (!res.ok) throw new Error('Gagal menyimpan data ke cloud.');
  notify(ref.path);
  return res.json();
}

export async function updateDoc(ref, data) {
  const res = await fetch(`${STORE}/doc`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: ref.path, data: sanitize(data || {}) }),
  });
  if (!res.ok) throw new Error('Gagal memperbarui data di cloud.');
  notify(ref.path);
  return res.json();
}

export async function deleteDoc(ref) {
  const res = await fetch(`${STORE}/doc?path=${encodeURIComponent(ref.path)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Gagal menghapus data di cloud.');
  notify(ref.path);
  return res.json();
}

export async function getDoc(ref) {
  const res = await fetch(`${STORE}/doc?path=${encodeURIComponent(ref.path)}`);
  const json = await res.json();
  return {
    id: ref.id,
    exists: () => !!json.exists,
    data: () => json.data || {},
  };
}

export function onSnapshot(ref, onNext, onError) {
  let stopped = false;
  let timer = null;
  let lastHash = null;

  const isDoc = ref._kind === 'doc';
  const url = isDoc
    ? `${STORE}/doc?path=${encodeURIComponent(ref.path)}`
    : `${STORE}/collection?path=${encodeURIComponent(ref.path)}`;

  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`store ${res.status}`);
      const json = await res.json();
      const hash = JSON.stringify(json);
      if (hash !== lastHash) {
        lastHash = hash;
        if (isDoc) {
          onNext({
            id: ref.id,
            exists: () => !!json.exists,
            data: () => json.data || {},
          });
        } else {
          onNext({
            size: (json.docs || []).length,
            empty: (json.docs || []).length === 0,
            docs: (json.docs || []).map((d) => ({
              id: d.id,
              exists: () => true,
              data: () => d.data || {},
            })),
          });
        }
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err);
    }
  };

  const loop = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      await tick();
      loop();
    }, POLL_MS);
  };

  const busHandler = (changedPath) => {
    if (stopped) return;
    if (isDoc ? changedPath === ref.path : changedPath.startsWith(ref.path + '/')) {
      tick();
    }
  };

  _bus.add(busHandler);
  tick();
  loop();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    _bus.delete(busHandler);
  };
}

export default {
  initializeApp,
  getApps,
  getApp,
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  getFirestore,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
};
