export interface NormalizedProjectUrl {
  href: string;
  hostname: string;
  domain: string;
}

const SCHEME_PATTERN = /^([a-z][a-z\d+.-]*):/i;
const HOST_LABEL_PATTERN = /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i;

function isValidHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '');

  if (host === 'localhost' || (host.startsWith('[') && host.endsWith(']'))) {
    return true;
  }

  const labels = host.split('.');
  return labels.length > 1 && labels.every((label) => HOST_LABEL_PATTERN.test(label));
}

export function normalizeProjectUrl(value: string): NormalizedProjectUrl | null {
  const input = value.trim();
  // biome-ignore lint/suspicious/noControlCharactersInRegex: deliberately rejects raw control characters in URLs
  if (!input || /[\s\\]|[\u0000-\u001f\u007f]/.test(input)) return null;

  const schemeMatch = input.match(SCHEME_PATTERN);
  const looksLikeHostWithPort = /^[^/?#]+:\d+(?:[/?#]|$)/.test(input);
  const scheme = looksLikeHostWithPort ? undefined : schemeMatch?.[1]?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return null;

  try {
    const url = new URL(scheme ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
    if (url.username || url.password || !isValidHostname(url.hostname)) return null;

    const hostname = url.hostname.replace(/\.$/, '');
    url.hostname = hostname;

    return {
      href: url.href,
      hostname,
      domain: hostname.replace(/^www\./i, ''),
    };
  } catch {
    return null;
  }
}
