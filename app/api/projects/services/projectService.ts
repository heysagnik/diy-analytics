import { and, eq } from 'drizzle-orm';
import { projects } from '@/db/schema';
import { db } from '@/lib/db';
import { normalizeProjectUrl } from '@/utils/url';

export interface CreateProjectInput {
  name: string;
  url: string;
  workspaceId: string;
}

export interface UpdateProjectInput {
  name?: string;
  url?: string;
  publicMode?: boolean;
  excludedIPs?: string[];
  excludedPaths?: string[];
  timezone?: string | null;
  additionalDomains?: string[];
}

function normalizeAdditionalDomains(domains: string[], primaryDomain: string): string[] | null {
  const normalized = new Set<string>();
  for (const raw of domains) {
    const result = normalizeProjectUrl(raw);
    if (!result) return null;
    if (result.domain === primaryDomain) continue;
    normalized.add(result.domain);
  }
  return [...normalized];
}

/**
 * Both create and update funnel through here so `domain` is derived from
 * `url` exactly once, in one place — the old Mongoose pre-save/
 * pre-findOneAndUpdate hooks did this implicitly for every write; Drizzle
 * has no schema-level hook equivalent, so callers must not duplicate this
 * logic in route handlers (easy to update one path and forget the other).
 */
export async function createProject(input: CreateProjectInput) {
  const normalized = normalizeProjectUrl(input.url);
  if (!normalized) return null;

  const [project] = await db
    .insert(projects)
    .values({
      name: input.name.trim(),
      workspaceId: input.workspaceId,
      url: normalized.hostname,
      domain: normalized.domain,
    })
    .returning();
  return project;
}

export async function updateProject(id: string, workspaceId: string, input: UpdateProjectInput) {
  const updateData: Partial<typeof projects.$inferInsert> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.publicMode !== undefined) updateData.publicMode = input.publicMode;
  if (input.excludedIPs !== undefined) updateData.excludedIPs = input.excludedIPs;
  if (input.excludedPaths !== undefined) updateData.excludedPaths = input.excludedPaths;
  if (input.url !== undefined) {
    const normalized = normalizeProjectUrl(input.url);
    if (!normalized) return { error: 'invalid_url' as const };
    updateData.url = normalized.hostname;
    updateData.domain = normalized.domain;
  }

  if (input.additionalDomains !== undefined) {
    let primaryDomain = updateData.domain;
    if (primaryDomain === undefined) {
      const [existing] = await db
        .select({ domain: projects.domain })
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      primaryDomain = existing?.domain ?? undefined;
    }
    const normalized = normalizeAdditionalDomains(input.additionalDomains, primaryDomain ?? '');
    if (!normalized) return { error: 'invalid_domain' as const };
    updateData.additionalDomains = normalized;
  }

  if (Object.keys(updateData).length === 0) {
    return { error: 'no_fields' as const };
  }

  updateData.updatedAt = new Date();

  const [project] = await db
    .update(projects)
    .set(updateData)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .returning();
  return { project: project ?? null };
}
