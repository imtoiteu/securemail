import {html2textIfHtml} from '../../../src/lib/util';

describe('html2textIfHtml', () => {
  it('returns plain text unchanged', () => {
    expect(html2textIfHtml('Hello world')).toBe('Hello world');
  });

  it('preserves multibyte UTF-8 in plain text', () => {
    expect(html2textIfHtml('Hallo ÄÖÜ 한국어')).toBe('Hallo ÄÖÜ 한국어');
  });

  it('returns empty string unchanged', () => {
    expect(html2textIfHtml('')).toBe('');
  });

  it('strips HTML when <br> is present', () => {
    expect(html2textIfHtml('line one<br>line two')).toBe('line one\nline two');
  });

  it('strips HTML when block-closing </p> is present', () => {
    expect(html2textIfHtml('<p>paragraph one</p><p>paragraph two</p>')).toBe('paragraph one\nparagraph two\n');
  });

  it('strips HTML when </div> is present', () => {
    expect(html2textIfHtml('<div>foo</div><div>bar</div>')).toBe('foo\nbar\n');
  });

  it('strips HTML when </li> / </ul> are present', () => {
    expect(html2textIfHtml('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb\n\n');
  });

  it('does not strip when only non-listed inline tags are present', () => {
    expect(html2textIfHtml('<span>plain</span>')).toBe('<span>plain</span>');
  });
});
