import {extractAddressFromText} from '../../../src/lib/email';

jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/content-scripts/attachmentFrame', () => jest.fn().mockImplementation(() => ({
  id: 'mock-id',
  mainType: 'aFrame',
  attachTo: jest.fn()
})));

describe('Gmail title parsing via extractAddressFromText', () => {
  it('returns the only address when the title contains a single email', () => {
    expect(extractAddressFromText('Inbox (5) - alice@example.com - Gmail')).toBe('alice@example.com');
  });

  it('returns the last address when the subject contains an earlier email', () => {
    const title = "Re: Hello bob@old.com, here's the report - alice@example.com - Gmail";
    expect(extractAddressFromText(title)).toBe('alice@example.com');
  });

  it('handles compose titles', () => {
    expect(extractAddressFromText('Compose Mail - alice@example.com - Gmail')).toBe('alice@example.com');
  });

  it('returns null when no email is present in the title', () => {
    expect(extractAddressFromText('Inbox - Gmail')).toBeNull();
  });

  it('preserves +-addressing in the extracted address', () => {
    expect(extractAddressFromText('Inbox - alice+work@example.com - Gmail')).toBe('alice+work@example.com');
  });
});
