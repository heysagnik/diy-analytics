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
import { dateRangeSchema, filtersSchema, requireProjectAccess } from './toolHelpers';

const analyticsService = new AnalyticsService();

function isErrorStatus(value: string): value is ErrorStatus {
  return (ERROR_STATUSES as readonly string[]).includes(value);
}

export class ToolError extends Error {}

interface ToolContext {
  userId: string;
}

export interface ToolDefinition<TShape extends z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: TShape;
  handler: (args: z.infer<z.ZodObject<TShape>>, ctx: ToolContext) => Promise<unknown>;
}

function defineTool<TShape extends z.ZodRawShape>(def: ToolDefinition<TShape>): ToolDefinition<TShape> {
  return def;
}

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

export const TOOL_DEFINITIONS = [
  defineTool({
    name: 'list_workspaces',
    title: 'List workspaces',
    description: "List the workspaces the authenticated user belongs to, with the user's role in each.",
    inputSchema: {},
    async handler(_args, { userId }) {
      return db
        .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug, role: workspaceMembers.role })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, userId));
    },
  }),

  defineTool({
    name: 'list_projects',
    title: 'List projects',
    description: 'List the projects in a workspace the authenticated user has access to.',
    inputSchema: { workspaceId: z.string() },
    async handler({ workspaceId }, { userId }) {
      if (!isValidUuid(workspaceId)) throw new ToolError('Invalid workspace ID');
      const [membership] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
        .limit(1);
      if (!membership) throw new ToolError(`Forbidden: no access to workspace ${workspaceId}`);

      return db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(desc(projects.createdAt));
    },
  }),

  defineTool({
    name: 'get_project',
    title: 'Get project',
    description: 'Get details for a single project.',
    inputSchema: { projectId: z.string() },
    async handler({ projectId }, { userId }) {
      await requireProjectAccess(userId, projectId);
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project) throw new ToolError(`Project not found (${projectId})`);
      return project;
    },
  }),

  defineTool({
    name: 'get_analytics',
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
    async handler({ projectId, dateRange, timezone, startDate, endDate, filters }, { userId }) {
      await requireProjectAccess(userId, projectId);
      if (dateRange === 'CUSTOM' && (!startDate || !endDate)) {
        throw new ToolError('Custom date range requires startDate and endDate');
      }
      return analyticsService.getAnalytics({ projectId, dateRange, timezone, startDate, endDate, filters });
    },
  }),

  defineTool({
    name: 'get_realtime',
    title: 'Get realtime visitors',
    description: 'Currently active visitor count and sessions for a project.',
    inputSchema: { projectId: z.string() },
    async handler({ projectId }, { userId }) {
      await requireProjectAccess(userId, projectId);
      return analyticsService.getRealtime(projectId);
    },
  }),

  defineTool({
    name: 'list_goals',
    title: 'List goals',
    description: 'List conversion goals configured for a project.',
    inputSchema: { projectId: z.string() },
    async handler({ projectId }, { userId }) {
      await requireProjectAccess(userId, projectId);
      return db.select().from(goals).where(eq(goals.projectId, projectId)).orderBy(desc(goals.createdAt));
    },
  }),

  defineTool({
    name: 'list_funnels',
    title: 'List funnels',
    description: 'List conversion funnels configured for a project.',
    inputSchema: { projectId: z.string() },
    async handler({ projectId }, { userId }) {
      await requireProjectAccess(userId, projectId);
      return db.select().from(funnels).where(eq(funnels.projectId, projectId)).orderBy(desc(funnels.createdAt));
    },
  }),

  defineTool({
    name: 'get_funnel_analysis',
    title: 'Get funnel analysis',
    description: 'Step-by-step conversion/drop-off analysis for a funnel over a date range.',
    inputSchema: {
      projectId: z.string(),
      funnelId: z.string(),
      dateRange: dateRangeSchema.default('LAST_30_DAYS'),
    },
    async handler({ projectId, funnelId, dateRange }, { userId }) {
      await requireProjectAccess(userId, projectId);
      if (!isValidUuid(funnelId)) throw new ToolError('Invalid funnel ID');

      const [funnel] = await db
        .select()
        .from(funnels)
        .where(and(eq(funnels.id, funnelId), eq(funnels.projectId, projectId)))
        .limit(1);
      if (!funnel) throw new ToolError(`Funnel not found (${funnelId})`);

      const service = new FunnelService();
      const steps = await service.getFunnelAnalysis(projectId, funnel.steps, dateRange);
      return { funnelId: funnel.id, name: funnel.name, steps };
    },
  }),

  defineTool({
    name: 'list_errors',
    title: 'List errors',
    description: 'List tracked errors for a project, optionally filtered by status and release.',
    inputSchema: {
      projectId: z.string(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      release: z.string().optional(),
    },
    async handler({ projectId, status, limit, release }, { userId }) {
      await requireProjectAccess(userId, projectId);

      const resolvedStatus = status || 'active';
      if (!isErrorStatus(resolvedStatus)) {
        throw new ToolError(`status must be one of: ${ERROR_STATUSES.join(', ')}`);
      }
      const releaseCondition =
        release === undefined ? undefined : release === 'none' ? isNull(errors.release) : eq(errors.release, release);

      return db
        .select()
        .from(errors)
        .where(and(eq(errors.projectId, projectId), eq(errors.status, resolvedStatus), releaseCondition))
        .orderBy(desc(errors.lastSeenAt))
        .limit(limit ?? 50);
    },
  }),

  defineTool({
    name: 'get_retention',
    title: 'Get retention',
    description: 'Weekly cohort retention matrix for a project.',
    inputSchema: { projectId: z.string(), weeks: z.number().int().min(2).max(26).optional() },
    async handler({ projectId, weeks }, { userId }) {
      await requireProjectAccess(userId, projectId);
      const service = new RetentionService();
      const cohorts = await service.getRetentionMatrix(projectId, weeks ?? 8);
      return { weeks: weeks ?? 8, cohorts };
    },
  }),

  defineTool({
    name: 'get_flow',
    title: 'Get page flow',
    description: 'Page-to-page navigation flow (Sankey-style edges) for a project over a date range.',
    inputSchema: { projectId: z.string(), dateRange: dateRangeSchema.default('LAST_30_DAYS') },
    async handler({ projectId, dateRange }, { userId }) {
      await requireProjectAccess(userId, projectId);
      const service = new FlowService();
      const edges = await service.getPageFlow(projectId, dateRange);
      return { edges };
    },
  }),

  defineTool({
    name: 'get_segments',
    title: 'Get audience segments',
    description: 'Auto-computed recency/frequency audience segments (e.g. champions, dormant) for a project.',
    inputSchema: { projectId: z.string(), dateRange: dateRangeSchema.default('LAST_6_MONTHS') },
    async handler({ projectId, dateRange }, { userId }) {
      await requireProjectAccess(userId, projectId);
      const service = new SegmentService();
      const segments = await service.getRfSegments(projectId, dateRange);
      return { segments };
    },
  }),

  defineTool({
    name: 'explore',
    title: 'Explore sessions',
    description:
      'Ad-hoc session segmentation: find sessions matching a combination of dimension/pageview/event conditions.',
    inputSchema: {
      projectId: z.string(),
      dateRange: dateRangeSchema,
      combinator: z.enum(['AND', 'OR']),
      conditions: z.array(conditionSchema).min(1).max(MAX_CONDITIONS),
    },
    async handler({ projectId, dateRange, combinator, conditions }, { userId }) {
      await requireProjectAccess(userId, projectId);
      const service = new ExploreService();
      return service.runQuery(projectId, { dateRange, combinator, conditions });
    },
  }),

  defineTool({
    name: 'get_event_properties',
    title: 'Get event properties',
    description:
      'For a named custom event: list its property keys (no propertyKey given), or the value distribution for one property key.',
    inputSchema: {
      projectId: z.string(),
      eventName: z.string(),
      propertyKey: z.string().optional(),
      dateRange: dateRangeSchema.default('LAST_7_DAYS'),
    },
    async handler({ projectId, eventName, propertyKey, dateRange }, { userId }) {
      await requireProjectAccess(userId, projectId);
      const baseOptions = { projectId, eventName, dateRange };
      return propertyKey
        ? analyticsService.getEventPropertyBreakdown({ ...baseOptions, propertyKey })
        : analyticsService.getEventPropertyKeys(baseOptions);
    },
  }),
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous input shapes across tools, consumed generically by both adapters
] as unknown as ToolDefinition<any>[];
