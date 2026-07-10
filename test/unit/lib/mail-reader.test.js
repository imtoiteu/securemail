import * as mailreader from '../../../src/lib/mail-reader';
import {Uint8Array2str, str2Uint8Array} from '../../../src/lib/util';

/**
 * `emailjs-mime-parser` accepts a JS binary string where every char code is one byte —
 * that is the wire-format contract Mailvelope now feeds it from `decryptMessage`. Helper
 * builds such a string from a Unicode string by encoding to UTF-8 first.
 */
function utf8Binary(str) {
  return Uint8Array2str(new TextEncoder().encode(str));
}

function btoaBinary(bytes) {
  let bin = '';
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin);
}

describe('mail-reader.parse — ported legacy cases', () => {
  it('parses text', () => {
    const bodyParts = mailreader.parse([{
      type: 'text',
      raw: 'Content-Type: text/plain; charset=ISO-8859-1\r\n\r\nasdasd\r\n'
    }]);
    expect(typeof bodyParts[0].content).toBe('string');
    expect(bodyParts[0].content).toBe('asdasd');
  });

  it('parses empty text', () => {
    const bodyParts = mailreader.parse([{
      type: 'text',
      raw: 'Content-Type: text/plain\r\nContent-Transfer-Encoding: 7bit\r\n\r\n'
    }]);
    expect(typeof bodyParts[0].content).toBe('string');
    expect(bodyParts[0].content).toBe('');
  });

  it('parses html', () => {
    const bodyParts = mailreader.parse([{
      type: 'html',
      raw: 'Content-Type: text/html; charset="UTF-8"\r\n\r\n<pre>PGP MESSAGE</pre>\r\n'
    }]);
    expect(typeof bodyParts[0].content).toBe('string');
    expect(bodyParts[0].content).toBe('<pre>PGP MESSAGE</pre>');
  });

  it('parses empty html', () => {
    const bodyParts = mailreader.parse([{
      type: 'html',
      raw: 'Content-Type: text/html; charset="UTF-8"\r\n\r\n'
    }]);
    expect(typeof bodyParts[0].content).toBe('string');
    expect(bodyParts[0].content).toBe('');
  });

  it('parses attachment', () => {
    const bodyParts = mailreader.parse([{
      type: 'attachment',
      raw: 'Content-Type: text/plain; name="nyS76EP.jpg"\r\nContent-Disposition: attachment; filename="nyS76EP.jpg"\r\nContent-Id: <9EC769A2-4AF4-4D47-A0AB-96CEA7CA5878>\r\n\r\nasdasd\r\n'
    }]);
    expect(bodyParts[0].content).toBeInstanceOf(Uint8Array);
    expect(bodyParts[0].content.length).toBe(7);
    expect(Uint8Array2str(bodyParts[0].content)).toBe('asdasd\n');
    expect(bodyParts[0].raw).toBeUndefined();
    expect(bodyParts[0].filename).toBe('nyS76EP.jpg');
    expect(bodyParts[0].mimeType).toBeDefined();
    expect(bodyParts[0].id).toBe('9EC769A2-4AF4-4D47-A0AB-96CEA7CA5878');
  });

  it('parses attachment without content-id', () => {
    const bodyParts = mailreader.parse([{
      type: 'attachment',
      raw: 'Content-Type: text/plain; name="nyS76EP.jpg"\r\nContent-Disposition: attachment; filename="nyS76EP.jpg"\r\n\r\nasdasd\r\n'
    }]);
    expect(bodyParts[0].content).toBeInstanceOf(Uint8Array);
    expect(bodyParts[0].content.length).toBe(7);
    expect(Uint8Array2str(bodyParts[0].content)).toBe('asdasd\n');
    expect(bodyParts[0].raw).toBeUndefined();
    expect(bodyParts[0].filename).toBe('nyS76EP.jpg');
    expect(bodyParts[0].mimeType).toBeDefined();
    expect(bodyParts[0].id).toBeUndefined();
  });

  it('parses attachment without content-type', () => {
    const bodyParts = mailreader.parse([{
      type: 'attachment',
      raw: 'Content-Disposition: attachment; filename="nyS76EP.jpg"\r\nContent-Id: <9EC769A2-4AF4-4D47-A0AB-96CEA7CA5878>\r\n\r\nasdasd\r\n'
    }]);
    expect(bodyParts[0].content).toBeInstanceOf(Uint8Array);
    expect(bodyParts[0].content.length).toBe(7);
    expect(Uint8Array2str(bodyParts[0].content)).toBe('asdasd\n');
    expect(bodyParts[0].raw).toBeUndefined();
    expect(bodyParts[0].filename).toBe('nyS76EP.jpg');
    expect(bodyParts[0].mimeType).toBeDefined();
    expect(bodyParts[0].id).toBe('9EC769A2-4AF4-4D47-A0AB-96CEA7CA5878');
  });

  it('parses empty attachment', () => {
    const bodyParts = mailreader.parse([{
      type: 'attachment',
      raw: 'Content-Disposition: attachment; filename="nyS76EP.jpg"\r\n\r\n'
    }]);
    expect(bodyParts[0].content).toBeInstanceOf(Uint8Array);
    expect(bodyParts[0].content.length).toBe(0);
    expect(Uint8Array2str(bodyParts[0].content)).toBe('');
    expect(bodyParts[0].raw).toBeUndefined();
    expect(bodyParts[0].filename).toBe('nyS76EP.jpg');
    expect(bodyParts[0].mimeType).toBeDefined();
  });

  it('parses encrypted multipart wrapper', () => {
    const raw =
      'Content-Type: multipart/encrypted;\r\n' +
      ' boundary="----sinikael-?=_3-13993193614470.10911058727651834"\r\n' +
      'Content-Description: OpenPGP encrypted message\r\n' +
      '\r\n' +
      '------sinikael-?=_3-13993193614470.10911058727651834\r\n' +
      'Content-Type: application/pgp-encrypted\r\n' +
      'Content-Transfer-Encoding: 7bit\r\n' +
      '\r\n' +
      'Version: 1\r\n' +
      '------sinikael-?=_3-13993193614470.10911058727651834\r\n' +
      'Content-Type: application/octet-stream; name=encrypted.asc\r\n' +
      'Content-Disposition: inline; filename=encrypted.asc\r\n' +
      'Content-Transfer-Encoding: 7bit\r\n' +
      '\r\n' +
      '-----BEGIN PGP MESSAGE-----\r\n' +
      'Version: OpenPGP.js v0.5.1\r\n' +
      '\r\n' +
      'wcBMA2zS5V9YHvW4AQf+Octest==\r\n' +
      '=fake\r\n' +
      '-----END PGP MESSAGE-----\r\n' +
      '------sinikael-?=_3-13993193614470.10911058727651834--\r\n';
    const bodyParts = mailreader.parse([{type: 'encrypted', raw}]);
    expect(bodyParts[0].content).not.toBe('');
    expect(bodyParts[0].content).toMatch(/^-----BEGIN PGP MESSAGE-----/);
    expect(bodyParts[0].raw).toBeUndefined();
  });

  it('parses empty encrypted multipart wrapper', () => {
    const raw =
      'Content-Type: multipart/encrypted;\r\n' +
      ' boundary="----sinikael-?=_3-13993193614470.10911058727651834"\r\n' +
      'Content-Description: OpenPGP encrypted message\r\n' +
      '\r\n' +
      '------sinikael-?=_3-13993193614470.10911058727651834--\r\n';
    const bodyParts = mailreader.parse([{type: 'encrypted', raw}]);
    expect(Array.isArray(bodyParts[0].content)).toBe(true);
    expect(bodyParts[0].content).toEqual([]);
    expect(bodyParts[0].raw).toBeUndefined();
  });

  it('parses signed multipart wrapper', () => {
    const raw =
      'Content-Type: multipart/signed; boundary="Apple-Mail=_C94D8F86-2AA4-4D9A-A975-F51C8A2937B6"; protocol="application/pgp-signature"; micalg=pgp-sha512\r\n' +
      '\r\n' +
      '--Apple-Mail=_C94D8F86-2AA4-4D9A-A975-F51C8A2937B6\r\n' +
      'Content-Transfer-Encoding: 7bit\r\n' +
      'Content-Type: text/plain;\r\n' +
      '    charset=us-ascii\r\n' +
      '\r\n' +
      'this is some signed stuff!\r\n' +
      '\r\n' +
      '--Apple-Mail=_C94D8F86-2AA4-4D9A-A975-F51C8A2937B6\r\n' +
      'Content-Transfer-Encoding: 7bit\r\n' +
      'Content-Disposition: attachment;\r\n' +
      '    filename=signature.asc\r\n' +
      'Content-Type: application/pgp-signature;\r\n' +
      '    name=signature.asc\r\n' +
      'Content-Description: Message signed with OpenPGP using GPGMail\r\n' +
      '\r\n' +
      '-----BEGIN PGP SIGNATURE-----\r\n' +
      'Comment: GPGTools - https://gpgtools.org\r\n' +
      '\r\n' +
      'iQEcBAEBCgAGBQJTaJgoAAoJEOHUm+Va/GWKreEI\r\n' +
      '=iMlU\r\n' +
      '-----END PGP SIGNATURE-----\r\n' +
      '\r\n' +
      '--Apple-Mail=_C94D8F86-2AA4-4D9A-A975-F51C8A2937B6--\r\n';
    const bodyParts = mailreader.parse([{type: 'signed', raw}]);
    expect(bodyParts[0].signedMessage).toBeDefined();
    expect(bodyParts[0].signedMessage).toMatch(/^Content-Transfer-Encoding/);
    expect(bodyParts[0].signedMessage).toMatch(/this is some signed stuff!/);
    expect(bodyParts[0].signature).toBeDefined();
    expect(bodyParts[0].signature).toMatch(/^-----BEGIN PGP SIGNATURE-----/);
    expect(bodyParts[0].content).not.toEqual([]);
    expect(bodyParts[0].content).toEqual([{type: 'text', content: 'this is some signed stuff!'}]);
    expect(bodyParts[0].raw).toBeUndefined();
  });
});

describe('mail-reader.parse — UTF-8 multibyte regression (issue #893)', () => {
  it('decodes text/plain charset=UTF-8 with 8bit transfer encoding', () => {
    // Build the raw input as a binary string of UTF-8 bytes (this is the contract
    // emailjs-mime-parser is designed for, and what Mailvelope now passes to it).
    const headers = 'Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n';
    const body = 'Hallo\n\nÄÖÜ\n\n한국어';
    const raw = headers + utf8Binary(body);
    const bodyParts = mailreader.parse([{type: 'text', raw}]);
    expect(bodyParts[0].content).toBe('Hallo\n\nÄÖÜ\n\n한국어');
  });

  it('decodes text/plain charset=UTF-8 with quoted-printable', () => {
    const raw =
      'Content-Type: text/plain; charset=UTF-8\r\n' +
      'Content-Transfer-Encoding: quoted-printable\r\n' +
      '\r\n' +
      'Hallo\r\n\r\n=C3=84=C3=96=C3=9C\r\n\r\n=ED=95=9C=EA=B5=AD=EC=96=B4';
    const bodyParts = mailreader.parse([{type: 'text', raw}]);
    expect(bodyParts[0].content).toBe('Hallo\n\nÄÖÜ\n\n한국어');
  });

  it('decodes text/plain charset=UTF-8 with base64', () => {
    const body = 'Hallo\n\nÄÖÜ\n\n한국어';
    const bytes = new TextEncoder().encode(body);
    const b64 = btoaBinary(bytes);
    const raw =
      'Content-Type: text/plain; charset=UTF-8\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      `\r\n${
        b64}`;
    const bodyParts = mailreader.parse([{type: 'text', raw}]);
    expect(bodyParts[0].content).toBe('Hallo\n\nÄÖÜ\n\n한국어');
  });

  // NOTE: ISO-8859-1 round-trip is exercised end-to-end by the production code via the
  // native TextDecoder (which decodes all WHATWG-spec charsets). The Jest service-worker
  // env replaces TextDecoder with a UTF-8-only polyfill (test/unit/__mocks__/service-worker-env.js),
  // so we cannot assert here; the production behavior is validated by the integration tests.

  it('decodes text/html charset=UTF-8 with 8bit transfer encoding', () => {
    const headers = 'Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n';
    const body = '<p>Hallo ÄÖÜ 한국어</p>';
    const raw = headers + utf8Binary(body);
    const bodyParts = mailreader.parse([{type: 'html', raw}]);
    expect(bodyParts[0].content).toBe('<p>Hallo ÄÖÜ 한국어</p>');
  });

  it('decodes a multipart/signed wrapper with UTF-8 8bit inner text part', () => {
    const innerBody = 'Hallo ÄÖÜ 한국어';
    const inner =
      'Content-Type: text/plain; charset=UTF-8\r\n' +
      'Content-Transfer-Encoding: 8bit\r\n' +
      `\r\n${
        utf8Binary(innerBody)
      }\r\n`;
    const raw =
      'Content-Type: multipart/signed; boundary="b1"; protocol="application/pgp-signature"; micalg=pgp-sha512\r\n' +
      '\r\n' +
      `--b1\r\n${
        inner
      }--b1\r\n` +
      'Content-Type: application/pgp-signature; name=signature.asc\r\n' +
      'Content-Disposition: attachment; filename=signature.asc\r\n' +
      '\r\n' +
      '-----BEGIN PGP SIGNATURE-----\r\n=fake\r\n-----END PGP SIGNATURE-----\r\n' +
      '--b1--\r\n';
    const bodyParts = mailreader.parse([{type: 'signed', raw}]);
    // signedMessage must keep the raw bytes (binary string) so signature verification can succeed
    expect(bodyParts[0].signedMessage).toMatch(/^Content-Type: text\/plain; charset=UTF-8/);
    expect(bodyParts[0].content).toEqual([{type: 'text', content: 'Hallo ÄÖÜ 한국어'}]);
  });

  it('preserves armored ciphertext through a multipart/encrypted wrapper', () => {
    const armored = '-----BEGIN PGP MESSAGE-----\r\nVersion: x\r\n\r\nabc\r\n=def\r\n-----END PGP MESSAGE-----\r\n';
    const raw =
      'Content-Type: multipart/encrypted;\r\n' +
      ' boundary="b1"; protocol="application/pgp-encrypted"\r\n' +
      '\r\n' +
      '--b1\r\n' +
      'Content-Type: application/pgp-encrypted\r\n' +
      'Content-Transfer-Encoding: 7bit\r\n' +
      '\r\n' +
      'Version: 1\r\n' +
      '--b1\r\n' +
      'Content-Type: application/octet-stream; name=encrypted.asc\r\n' +
      'Content-Disposition: inline; filename=encrypted.asc\r\n' +
      'Content-Transfer-Encoding: 7bit\r\n' +
      `\r\n${
        armored
      }--b1--\r\n`;
    const bodyParts = mailreader.parse([{type: 'encrypted', raw}]);
    expect(typeof bodyParts[0].content).toBe('string');
    expect(bodyParts[0].content).toMatch(/^-----BEGIN PGP MESSAGE-----/);
  });

  it('round-trips a binary attachment unchanged', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0xC3, 0x84, 0xC3, 0x96]); // PNG magic + Ä Ö bytes
    const b64 = btoaBinary(bytes);
    const raw =
      'Content-Type: image/png; name="x.png"\r\n' +
      'Content-Disposition: attachment; filename="x.png"\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      `\r\n${
        b64}\r\n`;
    const bodyParts = mailreader.parse([{type: 'attachment', raw}]);
    expect(bodyParts[0].content).toBeInstanceOf(Uint8Array);
    expect(Array.from(bodyParts[0].content)).toEqual(Array.from(bytes));
    expect(bodyParts[0].filename).toBe('x.png');
    expect(bodyParts[0].mimeType).toBe('image/png');
  });
});

// Sanity: ensure the helper itself is correct.
describe('utf8Binary helper', () => {
  it('produces a binary string of UTF-8 bytes', () => {
    const bin = utf8Binary('Ä');
    expect(bin.length).toBe(2);
    expect(bin.charCodeAt(0)).toBe(0xC3);
    expect(bin.charCodeAt(1)).toBe(0x84);
  });

  it('round-trips via str2Uint8Array + TextDecoder', () => {
    const bin = utf8Binary('Hallo ÄÖÜ 한국어');
    expect(new TextDecoder('utf-8').decode(str2Uint8Array(bin))).toBe('Hallo ÄÖÜ 한국어');
  });
});
