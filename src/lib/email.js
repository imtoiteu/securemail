/**
 * Copyright (C) 2026 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {goog} from '../modules/closure-library/closure/goog/emailaddress';

const EMAIL_LOCAL = "[+a-zA-Z0-9_.!#$%&'*\\/=?^`{|}~-]+";
const EMAIL_DOMAIN = '([a-zA-Z0-9-]+\\.)+[a-zA-Z0-9]{2,63}';
const EMAIL_BODY = `${EMAIL_LOCAL}@${EMAIL_DOMAIN}`;

const ANCHORED_EMAIL_RE = new RegExp(`^${EMAIL_BODY}$`);
// Safe to share: only consumed via String.prototype.match(/g), which doesn't retain lastIndex.
const UNANCHORED_EMAIL_RE = new RegExp(EMAIL_BODY, 'g');

export function isValidAddress(address) {
  if (typeof address !== 'string') {
    return false;
  }
  return ANCHORED_EMAIL_RE.test(address);
}

export function parseAddress(address) {
  const result = parseAddressSafe(address);
  if (!result) {
    throw new Error('Parsing email address failed.');
  }
  return result;
}

export function parseAddressSafe(address) {
  try {
    const emailAddress = goog.format.EmailAddress.parse(address);
    if (!emailAddress.isValid()) {
      return null;
    }
    return {email: emailAddress.getAddress(), name: emailAddress.getName()};
  } catch {
    return null;
  }
}

// Never returns null. email is '' for invalid input. Used by callers that need
// the parsed name even when the address is invalid (e.g. OpenPGP user IDs).
export function parseAddressLoose(address) {
  try {
    const emailAddress = goog.format.EmailAddress.parse(address);
    return {
      email: emailAddress.isValid() ? emailAddress.getAddress() : '',
      name: emailAddress.getName() || ''
    };
  } catch {
    return {email: '', name: ''};
  }
}

export function parseAddressList(text) {
  if (!text) {
    return [];
  }
  return goog.format.EmailAddress.parseList(text)
  .filter(addr => addr.isValid())
  .map(addr => ({email: addr.getAddress(), name: addr.getName()}));
}

export function formatAddress(email, name) {
  return new goog.format.EmailAddress(email, name).toString();
}

// position='last' returns the trailing match, useful for Gmail-style titles
// where the active account address is appended after the subject.
export function extractAddressFromText(text, {position = 'last'} = {}) {
  if (typeof text !== 'string') {
    return null;
  }
  const matches = text.match(UNANCHORED_EMAIL_RE);
  if (!matches || !matches.length) {
    return null;
  }
  return position === 'first' ? matches[0] : matches[matches.length - 1];
}

export function findKeyByEmail(keys, email) {
  return keys.find(key => key.email && key.email.toLowerCase() === email.toLowerCase());
}

// Pending recipients are explicitly NOT errors — they're "we don't know yet".
export function hasAnyUnresolvedRecipient(recipients, keys) {
  return recipients.some(r => !r.lookupPending && !findKeyByEmail(keys, r.email));
}

export function splitAddress(address) {
  if (typeof address !== 'string') {
    return null;
  }
  const idx = address.indexOf('@');
  if (idx <= 0 || idx === address.length - 1) {
    return null;
  }
  const localPart = address.slice(0, idx);
  const domain = address.slice(idx + 1);
  if (domain.includes('@')) {
    return null;
  }
  return {localPart, domain};
}
