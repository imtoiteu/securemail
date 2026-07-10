// Coverage for the background startup chain in src/modules/defaults.js +
// src/modules/prefs.js. Verifies that defaults.init() and the
// defaultsInitialized gate behave correctly for every storage state, and that
// gate consumers (initScriptInjection-style) can race the init chain without
// blocking.

import defaultsJson from '../../../src/res/defaults.json';

const STARTUP_TIMEOUT_MS = 500;

async function withTimeout(promise, label, ms = STARTUP_TIMEOUT_MS) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: startup chain hung > ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, guard]);
  } finally {
    clearTimeout(timer);
  }
}

// Wire chrome.storage.local.get/set against a plain object so each test can
// pre-seed state and observe writes. The default mock in service-worker-env.js
// always returns {} for every key, which only ever exercises the new-install
// branch.
function seedStorage(initial = {}) {
  const store = {...initial};
  chrome.storage.local.get.mockImplementation(key =>
    Promise.resolve(key in store ? {[key]: store[key]} : {}));
  chrome.storage.local.set.mockImplementation(obj => {
    Object.assign(store, obj);
    return Promise.resolve();
  });
  return store;
}

const SEEDED_WATCH_LIST = [
  {site: 'Example', active: true, https_only: true, frames: [{scan: true, frame: '*.example.com', api: true}]}
];

const SEEDED_PREFS = version => ({
  version,
  security: {bgIcon: 'icon.png', bgColor: 'blue', hide_armored_header: false},
  general: {prefer_gnupg: true},
  provider: {gmail_integration: true},
  keyserver: {autocrypt_lookup: false, key_binding: true, mvelo_tofu_lookup: true, oks_lookup: true, wkd_lookup: true}
});

describe('defaults.init() — per-branch correctness + gate opens', () => {
  beforeEach(() => {
    jest.resetModules();
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
  });

  it('no-op branch (matching version) — resolves and opens the gate', async () => {
    seedStorage({
      'mvelo.preferences': SEEDED_PREFS(defaultsJson.version),
      'mvelo.watchlist': SEEDED_WATCH_LIST
    });
    const defaults = require('../../../src/modules/defaults');
    await withTimeout(defaults.init(), 'no-op');
    await expect(defaults.defaultsInitialized).resolves.toBeUndefined();
  });

  it('new-install branch (empty storage) — writes watch list + prefs and opens the gate', async () => {
    const store = seedStorage({});
    const defaults = require('../../../src/modules/defaults');
    await withTimeout(defaults.init(), 'new-install');
    expect(store['mvelo.watchlist']).toBeDefined();
    expect(Array.isArray(store['mvelo.watchlist'])).toBe(true);
    expect(store['mvelo.preferences'].version).toBe(defaultsJson.version);
    await expect(defaults.defaultsInitialized).resolves.toBeUndefined();
  });

  it('migration branch (mismatched version) — updates version, merges watch list, opens the gate', async () => {
    // mergeWatchlist goes through prefs.getWatchList(), which itself awaits
    // defaultsInitialized. The gate must therefore be opened before the merge
    // runs, so that internal consumers of getWatchList don't block init.
    const store = seedStorage({
      'mvelo.preferences': SEEDED_PREFS('old-version'),
      'mvelo.watchlist': SEEDED_WATCH_LIST
    });
    const defaults = require('../../../src/modules/defaults');
    await withTimeout(defaults.init(), 'migration');
    expect(store['mvelo.preferences'].version).toBe(defaultsJson.version);
    await expect(defaults.defaultsInitialized).resolves.toBeUndefined();
  });
});

describe('background main() startup-chain smoke', () => {
  // Mirrors the parallelism in src/background.js: initScriptInjection() runs
  // without await before await initModel(). A consumer of the
  // defaultsInitialized gate and the init() call that opens it must both
  // settle for every storage state.

  beforeEach(() => {
    jest.resetModules();
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
  });

  it.each([
    ['empty storage (new install)', () => ({})],
    ['matching version (no-op)', () => ({
      'mvelo.preferences': SEEDED_PREFS(defaultsJson.version),
      'mvelo.watchlist': SEEDED_WATCH_LIST
    })],
    ['mismatched version (migration)', () => ({
      'mvelo.preferences': SEEDED_PREFS('old-version'),
      'mvelo.watchlist': SEEDED_WATCH_LIST
    })]
  ])('main() race settles for %s', async (label, makeFixture) => {
    seedStorage(makeFixture());
    const defaults = require('../../../src/modules/defaults');
    const prefs = require('../../../src/modules/prefs');

    // Same shape as background.js main(): a gate consumer running in
    // parallel with the call that opens the gate.
    const consumer = prefs.getWatchList();
    const producer = defaults.init();

    await withTimeout(Promise.all([producer, consumer]), label);

    const watchList = await prefs.getWatchList();
    expect(Array.isArray(watchList)).toBe(true);
  });
});
