/**
 * Replaces lib/lib-mvelo.js. The desktop original wraps chrome.storage, tabs,
 * windows and the offscreen document. On mobile only storage and the two
 * sanitising helpers are reachable from src/modules — verified by grep.
 */
import DOMPurify from 'dompurify';
import {encodeHTML} from '../../../../../mailvelope/src/lib/util';
import autoLink from '../../../../../mailvelope/src/lib/autolink';

const mvelo = {};
export default mvelo;

function unavailable(name) {
  return () => { throw new Error(`mvelo.${name} is not available on mobile`); };
}

mvelo.storage = {
  get(id) { return chrome.storage.local.get(id).then(items => items[id]); },
  set(id, obj) { return chrome.storage.local.set({[id]: obj}); },
  remove(id) {
    if (typeof id !== 'string') throw new Error('id needs to be of type string');
    return chrome.storage.local.remove(id);
  }
};

// Toolbar badge has no mobile equivalent.
mvelo.action = {state() {}};

mvelo.util = {
  // The WebView has a real DOM, so DOMPurify runs directly and the desktop's
  // chrome.offscreen document is not needed at all.
  async sanitizeHTML(html) {
    return DOMPurify.sanitize(html);
  },
  async text2autoLinkHtml(text) {
    return mvelo.util.sanitizeHTML(autoLink(text, {defaultProtocol: 'https', escapeFn: encodeHTML}));
  },
  normalizeDomain(hostname) { return hostname.split('.').slice(-3).join('.'); }
};

mvelo.tabs = {
  getActive: unavailable('tabs.getActive'), query: unavailable('tabs.query'),
  create: unavailable('tabs.create'), activate: unavailable('tabs.activate'),
  loadAppTab: unavailable('tabs.loadAppTab'), loadTab: unavailable('tabs.loadTab')
};

mvelo.windows = {
  openPopup: unavailable('windows.openPopup'), getPopup: unavailable('windows.getPopup')
};
