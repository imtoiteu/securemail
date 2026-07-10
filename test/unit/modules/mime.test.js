// emailjs-mime-builder ships as ESM and is only used by the build helpers in mime.js;
// these tests cover the parse helpers, so we stub the builder to avoid the ESM transform.
jest.mock('emailjs-mime-builder', () => ({__esModule: true, default: jest.fn()}));

import {parseMessage, parseSignedMessage} from '../../../src/modules/mime';
import {Uint8Array2str} from '../../../src/lib/util';
import * as l10n from '../../../src/lib/l10n';

jest.mock('../../../src/lib/lib-mvelo', () => ({
  __esModule: true,
  default: {
    util: {
      // For these tests we want to observe what was passed into the sanitize/autoLink helpers,
      // so we have them return their input verbatim.
      sanitizeHTML: jest.fn(async html => html),
      text2autoLinkHtml: jest.fn(async text => `<auto>${text}</auto>`)
    }
  }
}));

const utf8Binary = str => Uint8Array2str(new TextEncoder().encode(str));

beforeAll(() => {
  l10n.mapToLocal();
});

describe('parseMessage routing', () => {
  it('routes input that starts with a MIME header to the MIME path', async () => {
    const headers = 'Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n';
    const body = 'Hallo ÄÖÜ 한국어';
    const raw = headers + utf8Binary(body);
    const {message, attachments} = await parseMessage(raw, 'text');
    expect(message).toBe('Hallo ÄÖÜ 한국어');
    expect(attachments).toEqual([]);
  });

  it('routes non-MIME input to the inline path', async () => {
    const {message, attachments} = await parseMessage(utf8Binary('plain ÄÖÜ 한국어'), 'text');
    expect(message).toBe('plain ÄÖÜ 한국어');
    expect(attachments).toEqual([]);
  });
});

describe('parseInline (via parseMessage)', () => {
  it('decodes a binary string of UTF-8 bytes for text encoding', async () => {
    const {message} = await parseMessage(utf8Binary('plain Ä'), 'text');
    expect(message).toBe('plain Ä');
  });

  it('strips legacy HTML when text encoding is requested', async () => {
    const {message} = await parseMessage(utf8Binary('<p>Hallo ÄÖÜ</p>'), 'text');
    expect(message).toBe('Hallo ÄÖÜ\n');
  });

  it('passes plain text through text2autoLinkHtml when html encoding is requested', async () => {
    const mvelo = require('../../../src/lib/lib-mvelo').default;
    mvelo.util.text2autoLinkHtml.mockClear();
    const {message} = await parseMessage(utf8Binary('Hallo ÄÖÜ 한국어'), 'html');
    expect(mvelo.util.text2autoLinkHtml).toHaveBeenCalledWith('Hallo ÄÖÜ 한국어');
    expect(message).toBe('<auto>Hallo ÄÖÜ 한국어</auto>');
  });
});

describe('parseMIME (via parseMessage)', () => {
  it('round-trips UTF-8 multibyte chars through 8bit text/plain', async () => {
    const headers = 'Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n';
    const body = 'Hallo\n\nÄÖÜ\n\n한국어';
    const raw = headers + utf8Binary(body);
    const {message} = await parseMessage(raw, 'text');
    expect(message).toBe('Hallo\n\nÄÖÜ\n\n한국어');
  });

  it('round-trips UTF-8 multibyte chars through quoted-printable', async () => {
    const raw =
      'Content-Type: text/plain; charset=UTF-8\r\n' +
      'Content-Transfer-Encoding: quoted-printable\r\n' +
      '\r\n' +
      'Hallo\r\n\r\n=C3=84=C3=96=C3=9C\r\n\r\n=ED=95=9C=EA=B5=AD=EC=96=B4';
    const {message} = await parseMessage(raw, 'text');
    expect(message).toBe('Hallo\n\nÄÖÜ\n\n한국어');
  });

  it('falls back to text2autoLinkHtml when html is requested but only text parts exist', async () => {
    const mvelo = require('../../../src/lib/lib-mvelo').default;
    mvelo.util.text2autoLinkHtml.mockClear();
    const headers = 'Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n';
    const raw = headers + utf8Binary('Hallo ÄÖÜ');
    const {message} = await parseMessage(raw, 'html');
    expect(mvelo.util.text2autoLinkHtml).toHaveBeenCalledWith('Hallo ÄÖÜ');
    expect(message).toBe('<auto>Hallo ÄÖÜ</auto>');
  });
});

describe('parseSignedMessage', () => {
  it('returns the raw signed body (binary, CRLF preserved) alongside the decoded text part', async () => {
    const innerBody = 'Hallo ÄÖÜ';
    const inner = `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${utf8Binary(innerBody)}\r\n`;
    const raw = [
      'Content-Type: multipart/signed; boundary="b1"; protocol="application/pgp-signature"; micalg=pgp-sha512\r\n\r\n',
      `--b1\r\n${inner}--b1\r\n`,
      'Content-Type: application/pgp-signature; name=signature.asc\r\n',
      'Content-Disposition: attachment; filename=signature.asc\r\n\r\n',
      '-----BEGIN PGP SIGNATURE-----\r\n=fake\r\n-----END PGP SIGNATURE-----\r\n',
      '--b1--\r\n'
    ].join('');
    const {message, signedMessage, attachments} = await parseSignedMessage(raw, 'text');
    expect(message).toContain('Hallo ÄÖÜ');
    expect(signedMessage).toMatch(/^Content-Type: text\/plain; charset=UTF-8\r\n/);
    // CRLF line endings preserved — required for the signature to verify
    expect(signedMessage).toMatch(/\r\n\r\n/);
    expect(attachments).toEqual([]);
  });
});
