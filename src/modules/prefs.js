/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {isFirefox} from '../lib/browser';
import {defaultsInitialized} from './defaults';

export let prefs = {};
const updateHandlers = [];
let watchListBuffer = null;

export async function init() {
  const preferences = await getPreferences();
  prefs = preferences;
  return preferences;
}

/**
 * Update preferences
 * @param  {Object} obj preferences object or properties of it
 */
export async function update(obj) {
  const preferences = await getPreferences();
  prefs = preferences;
  // notifiy update handlers
  updateHandlers.forEach(fn => fn(prefs, obj));
  if (obj.security) {
    Object.assign(prefs.security, obj.security);
  }
  if (obj.general) {
    Object.assign(prefs.general, obj.general);
  }
  if (obj.keyserver) {
    Object.assign(prefs.keyserver, obj.keyserver);
  }
  if (obj.provider) {
    Object.assign(prefs.provider, obj.provider);
  }
  await setPreferences(prefs);
}

/**
 * Register for preferences updates
 * @param {Function} fn handler
 */
export function addUpdateHandler(fn) {
  updateHandlers.push(fn);
}

export function getSecurityBackground() {
  return {
    bgIcon: prefs.security.bgIcon,
    bgColor: prefs.security.bgColor
  };
}

export async function getWatchList() {
  await defaultsInitialized;
  if (!watchListBuffer) {
    watchListBuffer = await mvelo.storage.get('mvelo.watchlist') ?? [];
  }
  return watchListBuffer;
}

// Firefox-only. Warm path is sync localStorage (microtask-only chain to
// addListener for event-page wakeup). Any cold path reloads — addListener
// after a macrotask would miss the queued wakeup event.
export async function getWatchListCache() {
  const cached = localStorage.getItem('mvelo.watchlist.cache');
  if (cached) {
    return JSON.parse(cached);
  }
  // Cold path: ensure the cache is populated so the next init's warm path hits.
  await defaultsInitialized;
  if (!localStorage.getItem('mvelo.watchlist.cache')) {
    const watchList = await mvelo.storage.get('mvelo.watchlist');
    if (watchList) {
      localStorage.setItem('mvelo.watchlist.cache', JSON.stringify(watchList));
    }
  }
  window.location.reload();
  await new Promise(() => {}); // page is reloading
}

export async function setWatchList(watchList) {
  await mvelo.storage.set('mvelo.watchlist', watchList);
  if (isFirefox) {
    localStorage.setItem('mvelo.watchlist.cache', JSON.stringify(watchList));
  }
  watchListBuffer = watchList;
}

export function getPreferences() {
  return mvelo.storage.get('mvelo.preferences');
}

export function setPreferences(preferences) {
  return mvelo.storage.set('mvelo.preferences', preferences);
}

export async function getSessionPref(key) {
  const {[key]: value} = await chrome.storage.session.get(key);
  return value;
}

export async function setSessionPref(key, value) {
  if (value === undefined) {
    await chrome.storage.session.remove(key);
  } else {
    await chrome.storage.session.set({[key]: value});
  }
}

