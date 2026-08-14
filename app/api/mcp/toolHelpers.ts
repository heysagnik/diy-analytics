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

export class ToolAccessError extends Error {}

export async function requireProjectAccess(
  userId: string,
  projectId: string,
  minimumRole: 'viewer' | 'member' | 'admin' = 'viewer',
): Promise<void> {
  const access = await checkProjectRole(userId, projectId, minimumRole);
  if ('error' in access) {
    throw new ToolAccessError(`${access.error} (project ${projectId})`);
  }
}
