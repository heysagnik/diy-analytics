import { SourceMapConsumer } from 'source-map';
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from './ssrfGuard';

export interface ResolvedSourceLocation {
  source: string;
  line: number;
  column: number;
  name: string | null;
  context: string | null;
}

const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const SOURCE_MAPPING_URL_RE = /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/g;
const CONTEXT_LINES = 3;

interface CacheEntry {
  mapText: string | null;
  cachedAt: number;
}

// Resolved source maps are fetched fresh per project deploy; caching by
// source URL avoids re-downloading the same map for every error occurrence
// viewed in a session. Same pattern as TrackingService.projectCache.
const mapCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchBounded(url: string): Promise<string | null> {
  await assertSafeWebhookUrl(url);
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength > MAX_FETCH_BYTES) return null;
  const text = await res.text();
  if (Buffer.byteLength(text) > MAX_FETCH_BYTES) return null;
  return text;
}

function lastSourceMappingUrl(jsText: string): string | null {
  let match: RegExpExecArray | null;
  let last: string | null = null;
  SOURCE_MAPPING_URL_RE.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex-exec-loop idiom
  while ((match = SOURCE_MAPPING_URL_RE.exec(jsText)) !== null) {
    last = match[1];
  }
  return last;
}

async function fetchMapText(sourceUrl: string): Promise<string | null> {
  const cached = mapCache.get(sourceUrl);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.mapText;
  }

  let mapText: string | null = null;
  try {
    if (sourceUrl.endsWith('.map')) {
      mapText = await fetchBounded(sourceUrl);
    } else {
      const jsText = await fetchBounded(sourceUrl);
      const mappingUrl = jsText ? lastSourceMappingUrl(jsText) : null;
      if (mappingUrl && !mappingUrl.startsWith('data:')) {
        const mapUrl = new URL(mappingUrl, sourceUrl).toString();
        mapText = await fetchBounded(mapUrl);
      }
    }
  } catch (e) {
    if (!(e instanceof UnsafeWebhookUrlError)) throw e;
    mapText = null;
  }

  mapCache.set(sourceUrl, { mapText, cachedAt: Date.now() });
  return mapText;
}

/**
 * Resolves a minified stack frame (sourceUrl/line/col, 1-indexed line as
 * browsers report it) to its original source location, by fetching the
 * deployed JS file's `sourceMappingURL` and the map it points to. Returns
 * null when the source isn't reachable or carries no source map — this is
 * a best-effort convenience, not a stored/authoritative record.
 */
export async function resolveSourceLocation(
  sourceUrl: string,
  line: number,
  column: number,
): Promise<ResolvedSourceLocation | null> {
  const mapText = await fetchMapText(sourceUrl);
  if (!mapText) return null;

  return SourceMapConsumer.with(mapText, sourceUrl, (consumer) => {
    const position = consumer.originalPositionFor({ line, column });
    if (!position.source) return null;

    const content = consumer.sourceContentFor(position.source, true);
    const context =
      content && position.line
        ? content
            .split('\n')
            .slice(Math.max(0, position.line - 1 - CONTEXT_LINES), position.line + CONTEXT_LINES)
            .join('\n')
        : null;

    return {
      source: position.source,
      line: position.line ?? line,
      column: position.column ?? column,
      name: position.name,
      context,
    };
  });
}
