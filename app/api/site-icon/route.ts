import { type NextRequest, NextResponse } from 'next/server';
import { assertSafeWebhookUrl } from '@/lib/ssrfGuard';

const MAX_HTML_BYTES = 300_000;
const FETCH_TIMEOUT_MS = 5_000;

const iconCache = new Map<string, { expiresAt: number; url: string | null }>();
const ICON_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface IconCandidate {
  url: string;
  score: number;
}

function parseIconLinks(html: string, pageUrl: URL): IconCandidate[] {
  const candidates: IconCandidate[] = [];
  const linkTagRegex = /<link\b[^>]*>/gi;
  const attr = (tag: string, name: string): string | undefined =>
    tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];

  for (const [tag] of html.matchAll(linkTagRegex)) {
    const rel = attr(tag, 'rel')?.toLowerCase();
    const href = attr(tag, 'href');
    if (!rel || !href || !rel.includes('icon')) continue;

    let resolved: URL;
    try {
      resolved = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;

    const sizes = attr(tag, 'sizes');
    const declaredWidth = sizes ? Number(sizes.split(/[xX]/)[0]) || 0 : 0;
    const isAppleTouch = rel.includes('apple-touch-icon');
    const score = (isAppleTouch ? 500 : 0) + declaredWidth;

    candidates.push({ url: resolved.toString(), score });
  }

  return candidates;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DIYAnalyticsIconBot/1.0)', ...init.headers },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtmlHead(pageUrl: URL): Promise<string> {
  const res = await fetchWithTimeout(pageUrl.toString(), {});
  if (!res?.ok || !res.body) return '';

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let bytesRead = 0;
  while (bytesRead < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (html.includes('</head>')) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

async function verifyImageUrl(url: string): Promise<boolean> {
  try {
    await assertSafeWebhookUrl(url);
  } catch {
    return false;
  }
  const res = await fetchWithTimeout(url, { method: 'GET' });
  return !!res && res.ok && (res.headers.get('content-type') || '').startsWith('image/');
}

async function resolveIcon(domain: string): Promise<string | null> {
  let pageUrl: URL;
  try {
    pageUrl = new URL(`https://${domain}/`);
    await assertSafeWebhookUrl(pageUrl.toString());
  } catch {
    return null;
  }

  const html = await fetchHtmlHead(pageUrl);
  const candidates: IconCandidate[] = html ? parseIconLinks(html, pageUrl) : [];
  candidates.push(
    { url: `${pageUrl.origin}/apple-touch-icon.png`, score: 500 },
    { url: `${pageUrl.origin}/apple-touch-icon-precomposed.png`, score: 490 },
    { url: `${pageUrl.origin}/favicon.ico`, score: 1 },
  );
  candidates.sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    if (await verifyImageUrl(candidate.url)) return candidate.url;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
  }

  const cached = iconCache.get(domain);
  const isFresh = !!cached && cached.expiresAt > Date.now();
  const iconUrl = isFresh ? cached.url : await resolveIcon(domain);
  if (!isFresh) {
    iconCache.set(domain, { expiresAt: Date.now() + ICON_CACHE_TTL_MS, url: iconUrl });
  }

  if (!iconUrl) {
    return NextResponse.json({ error: 'No icon found' }, { status: 404 });
  }
  return NextResponse.redirect(iconUrl, { status: 302 });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
