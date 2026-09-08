/**
 * Localization with a user-selectable language.
 *
 * Upstream resolved every string through chrome.i18n, which is locked to the
 * browser UI language. Secure Mail ships English and Vietnamese and lets the
 * user choose, so both message catalogues are bundled and consulted first.
 *
 * The choice is read from localStorage rather than chrome.storage because
 * `map` is populated synchronously at module load, before any await can run.
 * localStorage is per-origin, so every extension page (options, editor,
 * password dialog, key generation, recovery sheet) shares one setting.
 *
 * Content scripts run in the host page's origin, where that localStorage is
 * not ours, so they keep following the browser language. They render only a
 * few button labels; everything the user reads at length lives in extension
 * pages.
 */
import enMessages from '../../locales/en/messages.json';
import viMessages from '../../locales/vi/messages.json';

export const LOCALE_STORE_KEY = 'securemail.locale';
export const SUPPORTED_LOCALES = ['en', 'vi'];

const CATALOGUES = {en: enMessages, vi: viMessages};

export let map = {};

function onExtensionPage() {
  try {
    return location.protocol === 'chrome-extension:' || location.protocol === 'moz-extension:';
  } catch (e) {
    return false;
  }
}

/**
 * '' or null means "follow the browser". Content scripts always follow the
 * browser, because the localStorage they can see belongs to the website.
 */
export function getLocale() {
  if (!onExtensionPage()) {
    return '';
  }
  try {
    const stored = localStorage.getItem(LOCALE_STORE_KEY);
    return SUPPORTED_LOCALES.includes(stored) ? stored : '';
  } catch (e) {
    return '';
  }
}

export function setLocale(locale) {
  if (!onExtensionPage()) {
    return;
  }
  try {
    if (SUPPORTED_LOCALES.includes(locale)) {
      localStorage.setItem(LOCALE_STORE_KEY, locale);
    } else {
      localStorage.removeItem(LOCALE_STORE_KEY);
    }
  } catch (e) {
    // Storage unavailable; fall back to the browser language.
  }
}

export function register(ids) {
  for (const id of ids) {
    map[id] = true;
  }
}

export function mapToLocal() {
  map = getMessages(Object.keys(map));
}

/**
 * Resolution order: chosen catalogue, then English, then chrome.i18n (which
 * covers any locale we do not bundle), then the key itself so a missing
 * string is visible rather than blank.
 */
function resolve(id, substitutions) {
  const locale = getLocale();
  let template = locale && CATALOGUES[locale]?.[id]?.message;
  if (!template && locale) {
    template = CATALOGUES.en?.[id]?.message;
  }
  if (!template) {
    const fromBrowser = chrome.i18n.getMessage(id, substitutions);
    if (fromBrowser) {
      return fromBrowser;
    }
  }
  if (!template) {
    return id;
  }
  if (substitutions !== undefined && substitutions !== null) {
    const list = Array.isArray(substitutions) ? substitutions : [substitutions];
    list.forEach((value, index) => {
      template = template.split(`$${index + 1}`).join(String(value));
    });
  }
  return template;
}

export function get(id, substitutions) {
  return resolve(id, substitutions);
}

function getMessages(ids) {
  const result = {};
  for (const id of ids) {
    result[id] = resolve(id);
  }
  return result;
}

export function set(ids) {
  register(ids);
  mapToLocal();
}

function getLanguage() {
  return getLocale() || chrome.i18n.getUILanguage();
}

export function localizeDateTime(date, options = {}) {
  return date.toLocaleDateString(getLanguage(), options);
}
