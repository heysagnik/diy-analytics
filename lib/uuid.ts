const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed string passed straight into a `uuid` column comparison throws
// a raw "invalid input syntax for type uuid" Postgres error instead of
// gracefully no-matching (which Mongo's ObjectId cast did) — callers must
// pre-validate to return a clean 400 instead.
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
