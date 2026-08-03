import { normalizeProjectUrl } from './url';

describe('normalizeProjectUrl', () => {
  it('normalizes scheme, casing, trailing slash, and www domain', () => {
    expect(normalizeProjectUrl('  HTTP://WWW.Example.COM.  ')).toEqual({
      href: 'http://www.example.com/',
      hostname: 'www.example.com',
      domain: 'example.com',
    });
  });

  it('assumes https for a host without a scheme and preserves a port', () => {
    expect(normalizeProjectUrl('example.com:8443/path')).toEqual({
      href: 'https://example.com:8443/path',
      hostname: 'example.com',
      domain: 'example.com',
    });
  });

  it.each(['', 'not a url', 'ftp://example.com', 'https://user:pass@example.com'])(
    'rejects invalid project URL %p',
    (value) => {
      expect(normalizeProjectUrl(value)).toBeNull();
    },
  );

  it('accepts localhost with an explicit port', () => {
    expect(normalizeProjectUrl('http://localhost:3000')).toMatchObject({
      href: 'http://localhost:3000/',
      hostname: 'localhost',
      domain: 'localhost',
    });
  });
});
