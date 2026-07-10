import {
  findKeyByEmail,
  formatAddress,
  hasAnyUnresolvedRecipient,
  isValidAddress,
  parseAddress,
  parseAddressList,
  parseAddressLoose,
  parseAddressSafe,
  extractAddressFromText,
  splitAddress
} from '../../../src/lib/email';

describe('isValidAddress', () => {
  it('accepts a plain address', () => {
    expect(isValidAddress('alice@example.com')).toBe(true);
  });

  it('accepts +-addressing', () => {
    expect(isValidAddress('alice+work@example.com')).toBe(true);
  });

  it('accepts addresses with special local-part chars', () => {
    expect(isValidAddress("user.name+tag!#$%&'*=?^_`{|}~-@example.co")).toBe(true);
  });

  it('rejects an address without a domain', () => {
    expect(isValidAddress('alice@')).toBe(false);
  });

  it('rejects a non-email string', () => {
    expect(isValidAddress('not an email')).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(isValidAddress(undefined)).toBe(false);
    expect(isValidAddress(null)).toBe(false);
    expect(isValidAddress(42)).toBe(false);
  });

  it('rejects a too-short TLD', () => {
    expect(isValidAddress('alice@example.c')).toBe(false);
  });
});

describe('parseAddress', () => {
  it('parses "Name <addr>" form', () => {
    expect(parseAddress('Alice <alice@example.com>')).toEqual({email: 'alice@example.com', name: 'Alice'});
  });

  it('parses a bare address', () => {
    expect(parseAddress('alice@example.com')).toEqual({email: 'alice@example.com', name: ''});
  });

  it('throws on invalid input', () => {
    expect(() => parseAddress('not an email')).toThrow();
  });
});

describe('parseAddressSafe', () => {
  it('returns null on invalid input', () => {
    expect(parseAddressSafe('not an email')).toBeNull();
  });

  it('returns parsed result on valid input', () => {
    expect(parseAddressSafe('alice@example.com')).toEqual({email: 'alice@example.com', name: ''});
  });
});

describe('parseAddressLoose', () => {
  it('returns name even when address is invalid', () => {
    expect(parseAddressLoose('Alice Wonderland')).toEqual({email: '', name: 'Alice Wonderland'});
  });

  it('returns parsed result on valid input', () => {
    expect(parseAddressLoose('Alice <alice@example.com>')).toEqual({email: 'alice@example.com', name: 'Alice'});
  });

  it('returns empty values on completely unparseable input', () => {
    expect(parseAddressLoose('')).toEqual({email: '', name: ''});
  });
});

describe('parseAddressList', () => {
  it('returns an empty list for empty/falsy input', () => {
    expect(parseAddressList('')).toEqual([]);
    expect(parseAddressList(undefined)).toEqual([]);
  });

  it('parses a comma-separated list', () => {
    expect(parseAddressList('a@x.co, b@y.co')).toEqual([
      {email: 'a@x.co', name: ''},
      {email: 'b@y.co', name: ''}
    ]);
  });

  it('handles "Last, First" <addr> patterns without splitting on the name comma', () => {
    expect(parseAddressList('"Doe, John" <john@example.com>, jane@example.com')).toEqual([
      {email: 'john@example.com', name: 'Doe, John'},
      {email: 'jane@example.com', name: ''}
    ]);
  });

  it('skips invalid entries', () => {
    expect(parseAddressList('a@x.co, garbage')).toEqual([
      {email: 'a@x.co', name: ''}
    ]);
  });
});

describe('formatAddress', () => {
  it('formats name and email', () => {
    expect(formatAddress('alice@example.com', 'Alice')).toBe('Alice <alice@example.com>');
  });

  it('formats just the email when name is empty', () => {
    expect(formatAddress('alice@example.com', '')).toBe('alice@example.com');
  });

  it('quotes names containing a comma', () => {
    expect(formatAddress('john@example.com', 'Doe, John')).toBe('"Doe, John" <john@example.com>');
  });
});

describe('extractAddressFromText', () => {
  it('returns null when no address is present', () => {
    expect(extractAddressFromText('hello there')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(extractAddressFromText(undefined)).toBeNull();
  });

  it('returns the only address by default', () => {
    expect(extractAddressFromText('foo alice@example.com bar')).toBe('alice@example.com');
  });

  it('returns the last address when multiple are present', () => {
    expect(extractAddressFromText('a@x.co - b@y.co - c@z.co')).toBe('c@z.co');
  });

  it('returns the first address when position=first', () => {
    expect(extractAddressFromText('a@x.co - b@y.co', {position: 'first'})).toBe('a@x.co');
  });

  it('preserves +-addressing in the extracted address', () => {
    const title = 'Inbox (5) - alice+work@example.com - Gmail';
    expect(extractAddressFromText(title, {position: 'last'})).toBe('alice+work@example.com');
  });
});

describe('findKeyByEmail', () => {
  const keys = [
    {email: 'alice@example.com', keyId: 'A1'},
    {email: 'bob@example.com', keyId: 'B1'},
    {keyId: 'NOEMAIL'}
  ];

  it('returns the key matching the email', () => {
    expect(findKeyByEmail(keys, 'alice@example.com')).toBe(keys[0]);
  });

  it('matches case-insensitively in both directions', () => {
    expect(findKeyByEmail(keys, 'ALICE@EXAMPLE.COM')).toBe(keys[0]);
    expect(findKeyByEmail([{email: 'ALICE@example.com'}], 'alice@EXAMPLE.com')).toEqual({email: 'ALICE@example.com'});
  });

  it('returns undefined when no key matches', () => {
    expect(findKeyByEmail(keys, 'nobody@example.com')).toBeUndefined();
  });

  it('skips keys without an email field', () => {
    expect(findKeyByEmail(keys, 'NOEMAIL')).toBeUndefined();
  });

  it('returns undefined for an empty keys array', () => {
    expect(findKeyByEmail([], 'alice@example.com')).toBeUndefined();
  });
});

describe('hasAnyUnresolvedRecipient', () => {
  const keys = [{email: 'alice@example.com', keyId: 'A1'}];

  it('returns false when every recipient has a matching key', () => {
    expect(hasAnyUnresolvedRecipient([{email: 'alice@example.com'}], keys)).toBe(false);
  });

  it('returns true when a recipient has no matching key', () => {
    expect(hasAnyUnresolvedRecipient([{email: 'bob@example.com'}], keys)).toBe(true);
  });

  it('treats pending lookups as resolved', () => {
    expect(hasAnyUnresolvedRecipient([{email: 'bob@example.com', lookupPending: true}], keys)).toBe(false);
  });

  it('matches recipient email against keys case-insensitively', () => {
    expect(hasAnyUnresolvedRecipient([{email: 'ALICE@example.com'}], keys)).toBe(false);
  });

  it('returns false for an empty recipient list', () => {
    expect(hasAnyUnresolvedRecipient([], keys)).toBe(false);
  });

  it('returns true when at least one recipient in a mixed list is unresolved', () => {
    expect(hasAnyUnresolvedRecipient(
      [{email: 'alice@example.com'}, {email: 'bob@example.com'}],
      keys
    )).toBe(true);
  });
});

describe('splitAddress', () => {
  it('splits a normal address', () => {
    expect(splitAddress('alice@example.com')).toEqual({localPart: 'alice', domain: 'example.com'});
  });

  it('returns null when there is no @', () => {
    expect(splitAddress('alice')).toBeNull();
  });

  it('returns null when @ is at the start', () => {
    expect(splitAddress('@example.com')).toBeNull();
  });

  it('returns null when @ is at the end', () => {
    expect(splitAddress('alice@')).toBeNull();
  });

  it('returns null on multiple @', () => {
    expect(splitAddress('a@b@c.com')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(splitAddress(undefined)).toBeNull();
  });
});
