import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { AnalyticsService } from '@/app/api/analytics/services/analyticsService';
import { EXPLORE_DIMENSIONS, ExploreService, MAX_CONDITIONS } from '@/app/api/analytics/services/exploreService';
import { FlowService } from '@/app/api/analytics/services/flowService';
import { FunnelService } from '@/app/api/analytics/services/funnelService';
import { RetentionService } from '@/app/api/analytics/services/retentionService';
import { SegmentService } from '@/app/api/analytics/services/segmentService';
import {
  ERROR_STATUSES,
  type ErrorStatus,
  errors,
  funnels,
  goals,
  projects,
  workspaceMembers,
  workspaces,
} from '@/db/schema';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';
import { dateRangeSchema, errorResult, filtersSchema, jsonResult, withProjectAccess } from './toolHelpers';

const analyticsService = new AnalyticsService();

function isErrorStatus(value: string): value is ErrorStatus {
  return (ERROR_STATUSES as readonly string[]).includes(value);
}

/**
 * Registers the read-only v1 tool set on a per-request McpServer, closing
 * over the userId resolved once at the top of the MCP route. Every
 * project-scoped tool re-validates access via withProjectAccess on each
 * call — see toolHelpers.ts.
 */
export function registerTools(server: McpServer, userId: string) {
  server.registerTool(
    'list_workspaces',
    {
      title: 'List workspaces',
      description: "List the workspaces the authenticated user belongs to, with the user's role in each.",
      inputSchema: {},
    },
    async () => {
      const rows = await db
        .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug, role: workspaceMembers.role })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, userId));
      return jsonResult(rows);
    },
  );

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List the projects in a workspace the authenticated user has access to.',
      inputSchema: { workspaceId: z.string() },
    },
    async ({ workspaceId }) => {
      if (!isValidUuid(workspaceId)) return errorResult('Invalid workspace ID');
      const [membership] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
        .limit(1);
      if (!membership) return errorResult(`Forbidden: no access to workspace ${workspaceId}`);

      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId))
        .orderBy(desc(projects.createdAt));
      return jsonResult(rows);
    },
  );

  server.registerTool(
    'get_project',
    {
      title: 'Get project',
      description: 'Get details for a single project.',
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project) return errorResult(`Project not found (${projectId})`);
      return jsonResult(project);
    },
  );

  server.registerTool(
    'get_analytics',
    {
      title: 'Get analytics',
      description:
        'Core analytics for a project over a date range: unique users, pageviews, sessions, bounce rate, top pages, sources, countries, browsers, devices, goals, web vitals, and more.',
      inputSchema: {
        projectId: z.string(),
        dateRange: dateRangeSchema.default('LAST_7_DAYS'),
        timezone: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        filters: filtersSchema,
      },
    },
    async ({ projectId, dateRange, timezone, startDate, endDate, filters }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      if (dateRange === 'CUSTOM' && (!startDate || !endDate)) {
        return errorResult('Custom date range requires startDate and endDate');
      }
      const data = await analyticsService.getAnalytics({ projectId, dateRange, timezone, startDate, endDate, filters });
      return jsonResult(data);
    },
  );

  server.registerTool(
    'get_realtime',
    {
      title: 'Get realtime visitors',
      description: 'Currently active visitor count and sessions for a project.',
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const data = await analyticsService.getRealtime(projectId);
      return jsonResult(data);
    },
  );

  server.registerTool(
    'list_goals',
    {
      title: 'List goals',
      description: 'List conversion goals configured for a project.',
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const rows = await db.select().from(goals).where(eq(goals.projectId, projectId)).orderBy(desc(goals.createdAt));
      return jsonResult(rows);
    },
  );

  server.registerTool(
    'list_funnels',
    {
      title: 'List funnels',
      description: 'List conversion funnels configured for a project.',
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const rows = await db
        .select()
        .from(funnels)
        .where(eq(funnels.projectId, projectId))
        .orderBy(desc(funnels.createdAt));
      return jsonResult(rows);
    },
  );

  server.registerTool(
    'get_funnel_analysis',
    {
      title: 'Get funnel analysis',
      description: 'Step-by-step conversion/drop-off analysis for a funnel over a date range.',
      inputSchema: {
        projectId: z.string(),
        funnelId: z.string(),
        dateRange: dateRangeSchema.default('LAST_30_DAYS'),
      },
    },
    async ({ projectId, funnelId, dateRange }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      if (!isValidUuid(funnelId)) return errorResult('Invalid funnel ID');

      const [funnel] = await db
        .select()
        .from(funnels)
        .where(and(eq(funnels.id, funnelId), eq(funnels.projectId, projectId)))
        .limit(1);
      if (!funnel) return errorResult(`Funnel not found (${funnelId})`);

      const service = new FunnelService();
      const steps = await service.getFunnelAnalysis(projectId, funnel.steps, dateRange);
      return jsonResult({ funnelId: funnel.id, name: funnel.name, steps });
    },
  );

  server.registerTool(
    'list_errors',
    {
      title: 'List errors',
      description: 'List tracked errors for a project, optionally filtered by status and release.',
      inputSchema: {
        projectId: z.string(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        release: z.string().optional(),
      },
    },
    async ({ projectId, status, limit, release }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;

      const resolvedStatus = status || 'active';
      if (!isErrorStatus(resolvedStatus)) {
        return errorResult(`status must be one of: ${ERROR_STATUSES.join(', ')}`);
      }
      const releaseCondition =
        release === undefined ? undefined : release === 'none' ? isNull(errors.release) : eq(errors.release, release);

      const rows = await db
        .select()
        .from(errors)
        .where(and(eq(errors.projectId, projectId), eq(errors.status, resolvedStatus), releaseCondition))
        .orderBy(desc(errors.lastSeenAt))
        .limit(limit ?? 50);
      return jsonResult(rows);
    },
  );

  server.registerTool(
    'get_retention',
    {
      title: 'Get retention',
      description: 'Weekly cohort retention matrix for a project.',
      inputSchema: { projectId: z.string(), weeks: z.number().int().min(2).max(26).optional() },
    },
    async ({ projectId, weeks }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const service = new RetentionService();
      const cohorts = await service.getRetentionMatrix(projectId, weeks ?? 8);
      return jsonResult({ weeks: weeks ?? 8, cohorts });
    },
  );

  server.registerTool(
    'get_flow',
    {
      title: 'Get page flow',
      description: 'Page-to-page navigation flow (Sankey-style edges) for a project over a date range.',
      inputSchema: { projectId: z.string(), dateRange: dateRangeSchema.default('LAST_30_DAYS') },
    },
    async ({ projectId, dateRange }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const service = new FlowService();
      const edges = await service.getPageFlow(projectId, dateRange);
      return jsonResult({ edges });
    },
  );

  server.registerTool(
    'get_segments',
    {
      title: 'Get audience segments',
      description: 'Auto-computed recency/frequency audience segments (e.g. champions, dormant) for a project.',
      inputSchema: { projectId: z.string(), dateRange: dateRangeSchema.default('LAST_6_MONTHS') },
    },
    async ({ projectId, dateRange }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const service = new SegmentService();
      const segments = await service.getRfSegments(projectId, dateRange);
      return jsonResult({ segments });
    },
  );

  const conditionSchema = z.union([
    z.object({ type: z.literal('dimension'), dimension: z.enum(EXPLORE_DIMENSIONS), value: z.string() }),
    z.object({ type: z.literal('pageview'), path: z.string() }),
    z.object({
      type: z.literal('event'),
      eventName: z.string(),
      propertyKey: z.string().optional(),
      propertyValue: z.string().optional(),
    }),
  ]);

  server.registerTool(
    'explore',
    {
      title: 'Explore sessions',
      description:
        'Ad-hoc session segmentation: find sessions matching a combination of dimension/pageview/event conditions.',
      inputSchema: {
        projectId: z.string(),
        dateRange: dateRangeSchema,
        combinator: z.enum(['AND', 'OR']),
        conditions: z.array(conditionSchema).min(1).max(MAX_CONDITIONS),
      },
    },
    async ({ projectId, dateRange, combinator, conditions }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const service = new ExploreService();
      const result = await service.runQuery(projectId, { dateRange, combinator, conditions });
      return jsonResult(result);
    },
  );

  server.registerTool(
    'get_event_properties',
    {
      title: 'Get event properties',
      description:
        'For a named custom event: list its property keys (no propertyKey given), or the value distribution for one property key.',
      inputSchema: {
        projectId: z.string(),
        eventName: z.string(),
        propertyKey: z.string().optional(),
        dateRange: dateRangeSchema.default('LAST_7_DAYS'),
      },
    },
    async ({ projectId, eventName, propertyKey, dateRange }) => {
      const access = await withProjectAccess(userId, projectId);
      if (!access.ok) return access.result;
      const baseOptions = { projectId, eventName, dateRange };
      const data = propertyKey
        ? await analyticsService.getEventPropertyBreakdown({ ...baseOptions, propertyKey })
        : await analyticsService.getEventPropertyKeys(baseOptions);
      return jsonResult(data);
    },
  );
}
