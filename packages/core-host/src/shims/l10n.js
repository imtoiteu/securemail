/**
 * Replaces lib/l10n.js, which reads chrome.i18n.
 * Messages come from mailvelope/locales/{en,vi}/messages.json, injected by the app.
 */
export const map = {};
let messages = {};
const registered = new Set();

export function setMessages(next) { messages = next || {}; }

export function register(ids) { for (const id of ids) registered.add(id); }

function raw(id) {
  return messages[id]?.message ?? id;
}

export function mapToLocal() {
  for (const id of registered) map[id] = raw(id);
}

export function get(id, substitutions) {
  let text = raw(id);
  if (substitutions) {
    const list = Array.isArray(substitutions) ? substitutions : [substitutions];
    list.forEach((value, i) => {
      text = text.split(`$${i + 1}`).join(String(value));
    });
  }
  return text;
}
