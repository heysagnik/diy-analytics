/**
 * Shared CORS header set for the public, cross-origin endpoints (tracking
 * beacon + tracker script) — these are meant to be embedded on third-party
 * sites, so `*` is intentional here, unlike the app's own authenticated
 * API routes.
 */
export const PUBLIC_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
} as const;
