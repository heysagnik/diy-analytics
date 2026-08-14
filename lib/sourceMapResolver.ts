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

export interface StackFrame {
  sourceUrl: string;
  line: number;
  column: number;
  functionName: string | null;
}

export interface ResolvedStackFrame extends StackFrame {
  resolved: ResolvedSourceLocation | null;
}

// V8-style frame: "    at fnName (https://host/app.js:12:34)" or, for
// top-level/anonymous frames, "    at https://host/app.js:12:34".
const STACK_FRAME_RE = /at\s+(?:(.+?)\s+\()?(https?:\/\/[^\s)]+):(\d+):(\d+)\)?/;

const MAX_STACK_FRAMES = 15;

/** Parses a raw `error.stack` string into frames, skipping the leading
 * "Error: message" line and any frame that isn't a resolvable http(s) URL
 * (native/anonymous frames). */
export function parseStackFrames(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  for (const raw of stack.split('\n').slice(1)) {
    const match = STACK_FRAME_RE.exec(raw.trim());
    if (!match) continue;
    const [, functionName, sourceUrl, lineStr, colStr] = match;
    frames.push({
      sourceUrl,
      line: Number(lineStr),
      column: Number(colStr),
      functionName: functionName?.trim() || null,
    });
    if (frames.length >= MAX_STACK_FRAMES) break;
  }
  return frames;
}

/**
 * Resolves every frame in a stack trace, not just the top one — frames
 * sharing a source file reuse the same cached map (see mapCache above), so
 * a typical multi-frame stack from one bundle costs one fetch, not N.
 */
export async function resolveStackFrames(stack: string): Promise<ResolvedStackFrame[]> {
  const frames = parseStackFrames(stack);
  const results: ResolvedStackFrame[] = [];
  for (const frame of frames) {
    const resolved = await resolveSourceLocation(frame.sourceUrl, frame.line, frame.column).catch(() => null);
    results.push({ ...frame, resolved });
  }
  return results;
}
