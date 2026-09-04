const {installChromeShim, clearSession, setManifest} = require('../src/shims/chrome.js');

function memoryBackend() {
  const m = new Map();
  return {
    dump: m,
    get: async id => m.get(id),
    set: async (id, obj) => void m.set(id, obj),
    remove: async id => void m.delete(id)
  };
}

beforeEach(() => { installChromeShim({storage: memoryBackend()}); });

test('storage.local delegates to the injected backend', async () => {
  await chrome.storage.local.set({'mvelo.keyring.x.publicKeys': ['a']});
  const got = await chrome.storage.local.get('mvelo.keyring.x.publicKeys');
  expect(got).toEqual({'mvelo.keyring.x.publicKeys': ['a']});
});

test('storage.local.get returns an empty object for a missing key', async () => {
  expect(await chrome.storage.local.get('nope')).toEqual({});
});

test('storage.session keeps values in memory and clearSession wipes them', async () => {
  await chrome.storage.session.set({keyringLoaded: true});
  expect(await chrome.storage.session.get('keyringLoaded')).toEqual({keyringLoaded: true});
  clearSession();
  expect(await chrome.storage.session.get('keyringLoaded')).toEqual({});
});

test('storage.session never reaches the persistent backend', async () => {
  const backend = memoryBackend();
  installChromeShim({storage: backend});
  await chrome.storage.session.set({secretPassphrase: 'hunter2'});
  expect(backend.dump.size).toBe(0);
});

test('getBytesInUse reports session usage, as main.controller expects', async () => {
  await chrome.storage.session.set({sess: {a: 1}});
  expect(await chrome.storage.session.getBytesInUse('sess')).toBeGreaterThan(0);
  expect(await chrome.storage.session.getBytesInUse('absent')).toBe(0);
});

test('alarms fire and can be cleared before firing', async () => {
  jest.useFakeTimers();
  const fired = [];
  chrome.alarms.onAlarm.addListener(a => fired.push(a.name));
  chrome.alarms.create('pwd:AAAA', {delayInMinutes: 1});
  chrome.alarms.create('pwd:BBBB', {delayInMinutes: 1});
  await chrome.alarms.clear('pwd:BBBB');
  jest.advanceTimersByTime(60001);
  expect(fired).toEqual(['pwd:AAAA']);
  jest.useRealTimers();
});

test('getAll lists pending alarms', async () => {
  jest.useFakeTimers();
  chrome.alarms.create('pwd:CCCC', {delayInMinutes: 5});
  expect((await chrome.alarms.getAll()).map(a => a.name)).toEqual(['pwd:CCCC']);
  jest.useRealTimers();
});

test('runtime.getManifest returns the injected manifest', () => {
  setManifest({version: '0.1.0', oauth2: {client_id: 'x', scopes: []}});
  expect(chrome.runtime.getManifest().version).toBe('0.1.0');
});

test('analytics stub exports every name the desktop core imports and stays inert', () => {
  const a = require('../src/shims/analytics.js');
  for (const name of ['ONBOARDING_CAMPAIGN', 'BEGIN', 'ADD_KEY', 'COMMUNICATION',
    'KEYSERVER_ADDRESS', 'initAnalytics', 'binInto10sIncrements', 'recordOnboardingStep',
    'shouldSeeConsentDialog', 'denyCampaign', 'isCampaignCurrentlyGranted', 'grantCampaign']) {
    expect(a[name]).toBeDefined();
  }
  expect(a.shouldSeeConsentDialog()).toBe(false);
  expect(a.isCampaignCurrentlyGranted()).toBe(false);
  expect(() => a.recordOnboardingStep('x', 'y')).not.toThrow();
});

test('l10n resolves from injected messages and falls back to the key', () => {
  const l10n = require('../src/shims/l10n.js');
  l10n.setMessages({key_import_success: {message: 'Imported $1 keys'}});
  l10n.register(['key_import_success']);
  l10n.mapToLocal();
  expect(l10n.get('key_import_success', ['3'])).toBe('Imported 3 keys');
  expect(l10n.map.key_import_success).toBe('Imported $1 keys');
  expect(l10n.get('totally_missing_key')).toBe('totally_missing_key');
});

test('l10n exports every binding the bundled desktop code imports', () => {
  const l10n = require('../src/shims/l10n.js');
  // The desktop lib/l10n.js exports these; the controller tree is reachable
  // from pgpModel via keyringSync -> sync.controller, so all of them are used.
  for (const name of ['map', 'register', 'mapToLocal', 'get', 'set', 'localizeDateTime']) {
    expect(l10n[name]).toBeDefined();
  }
  l10n.setLanguage('vi');
  expect(typeof l10n.localizeDateTime(new Date('2026-09-04'))).toBe('string');
});

test('lib-mvelo exposes only what the core uses, and traps the rest', async () => {
  installChromeShim({storage: memoryBackend()});
  const mvelo = require('../src/shims/lib-mvelo.js').default;
  await mvelo.storage.set('k', {v: 1});
  expect(await mvelo.storage.get('k')).toEqual({v: 1});
  expect(() => mvelo.storage.remove(42)).toThrow(/type string/);
  expect(() => mvelo.tabs.create('x')).toThrow(/not available on mobile/);
  expect(() => mvelo.windows.openPopup('x')).toThrow(/not available on mobile/);
  expect(mvelo.action.state({badge: '1'})).toBeUndefined();
  expect(mvelo.util.normalizeDomain('a.b.c.example.com')).toBe('c.example.com');
});
