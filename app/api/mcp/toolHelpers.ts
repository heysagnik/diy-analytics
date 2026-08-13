import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DATE_RANGES } from '@/app/api/analytics/types';
import { checkProjectRole } from '@/lib/serverAuth';

export const dateRangeSchema = z.enum(Object.keys(DATE_RANGES) as [string, ...string[]]);

export const filtersSchema = z
  .object({
    country: z.array(z.string()).optional(),
    browser: z.array(z.string()).optional(),
    device: z.array(z.string()).optional(),
    source: z.array(z.string()).optional(),
    page: z.array(z.string()).optional(),
    utmSource: z.array(z.string()).optional(),
    utmMedium: z.array(z.string()).optional(),
    utmCampaign: z.array(z.string()).optional(),
    os: z.array(z.string()).optional(),
    city: z.array(z.string()).optional(),
  })
  .optional();

export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/**
 * Every project-scoped tool re-checks membership on every call — a key's
 * user may lose/gain project access between calls within a long-lived MCP
 * client session, so access is never cached across tool invocations.
 */
export async function withProjectAccess(
  userId: string,
  projectId: string,
  minimumRole: 'viewer' | 'member' | 'admin' = 'viewer',
): Promise<{ ok: true } | { ok: false; result: CallToolResult }> {
  const access = await checkProjectRole(userId, projectId, minimumRole);
  if ('error' in access) {
    return { ok: false, result: errorResult(`${access.error} (project ${projectId})`) };
  }
  return { ok: true };
}
