/**
 * Minimal chrome.* surface for the Secure Mail core host.
 * Only what mailvelope/src/modules actually calls — verified by grep:
 * storage.local, storage.session, alarms, runtime.getManifest.
 */
const sessionMap = new Map();
const alarmTimers = new Map();
const alarmListeners = [];
let manifest = {version: '0.0.0', oauth2: {client_id: '', scopes: []}};

export function setManifest(m) { manifest = m; }

export function clearSession() {
  sessionMap.clear();
  for (const entry of alarmTimers.values()) clearTimeout(entry.timer);
  alarmTimers.clear();
}

function pick(map, id) {
  const keys = id === null || id === undefined ? Array.from(map.keys())
    : Array.isArray(id) ? id : [id];
  const out = {};
  for (const k of keys) if (map.has(k)) out[k] = map.get(k);
  return out;
}

export function installChromeShim({storage}) {
  sessionMap.clear();
  alarmTimers.clear();
  alarmListeners.length = 0;

  const local = {
    async get(id) {
      const keys = Array.isArray(id) ? id : [id];
      const out = {};
      for (const k of keys) {
        const v = await storage.get(k);
        if (v !== undefined) out[k] = v;
      }
      return out;
    },
    async set(obj) { for (const [k, v] of Object.entries(obj)) await storage.set(k, v); },
    async remove(id) { for (const k of (Array.isArray(id) ? id : [id])) await storage.remove(k); }
  };

  const session = {
    async get(id) { return pick(sessionMap, id); },
    async set(obj) { for (const [k, v] of Object.entries(obj)) sessionMap.set(k, v); },
    async remove(id) { for (const k of (Array.isArray(id) ? id : [id])) sessionMap.delete(k); },
    async getBytesInUse(id) {
      const picked = pick(sessionMap, id);
      if (!Object.keys(picked).length) return 0;
      return JSON.stringify(picked).length;
    }
  };

  const alarms = {
    create(name, {delayInMinutes = 0} = {}) {
      const existing = alarmTimers.get(name);
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        alarmTimers.delete(name);
        for (const fn of alarmListeners) fn({name});
      }, delayInMinutes * 60000);
      alarmTimers.set(name, {timer, name});
    },
    async clear(name) {
      const entry = alarmTimers.get(name);
      if (!entry) return false;
      clearTimeout(entry.timer);
      alarmTimers.delete(name);
      return true;
    },
    async getAll() { return Array.from(alarmTimers.values()).map(({name}) => ({name})); },
    onAlarm: {addListener(fn) { alarmListeners.push(fn); }}
  };

  globalThis.chrome = {
    storage: {local, session},
    alarms,
    runtime: {
      getManifest: () => manifest,
      getURL: path => `core://${path}`,
      // The core never sends runtime messages on mobile; fail loudly if it starts.
      sendMessage: () => { throw new Error('chrome.runtime.sendMessage is not available on mobile'); }
    }
  };
  return globalThis.chrome;
}

// mailvelope/src/lib/util.js:402 reads `navigator` at module scope to detect
// the browser brand. A WebView always has it; Node and Jest's node environment
// may not, and util.js is imported by almost every core module. Define a
// harmless stand-in so brand resolves to {other: true}.
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {};
}

// Bootstrap install at module load: some desktop modules read
// chrome.runtime.getManifest() at import time. installChromeShim() replaces
// this with the real storage backend during createCore().
installChromeShim({
  storage: {
    get: async () => { throw new Error('storage backend not installed yet'); },
    set: async () => { throw new Error('storage backend not installed yet'); },
    remove: async () => { throw new Error('storage backend not installed yet'); }
  }
});
