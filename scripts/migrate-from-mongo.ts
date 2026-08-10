/**
 * One-time export/import: copies existing MongoDB data into the new
 * Postgres schema. Run via `npm run db:migrate-from-mongo` AFTER applying
 * Postgres migrations (`npm run db:migrate`).
 *
 * Not idempotent/resumable — if a run fails partway or you need to rerun
 * it, truncate the target Postgres tables first (or pass --force to skip
 * the "target already has data" guard). See docs/migrating-from-mongodb.md.
 *
 * Sessions are NOT migrated — every user re-authenticates once after
 * cutover. Session tokens are short-lived (30 days) and carry no
 * meaningful continuity across an infrastructure migration.
 */

import { appendFileSync, writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import {
  alerts,
  dailyRollups,
  events,
  funnels,
  goals,
  pageViews,
  projects,
  users,
  workspaceMembers,
  workspaces,
} from '@/db/schema';
import { db } from '@/lib/db';
import { normalizeProjectUrl } from '@/utils/url';
import MongoAlert from './mongo-legacy/Alert';
import MongoDailyRollup from './mongo-legacy/DailyRollup';
import MongoEvent from './mongo-legacy/Event';
import MongoFunnel from './mongo-legacy/Funnel';
import MongoGoal from './mongo-legacy/Goal';
import MongoPageView from './mongo-legacy/PageView';
import MongoProject from './mongo-legacy/Project';
import MongoUser from './mongo-legacy/User';
import MongoWorkspace from './mongo-legacy/Workspace';
import MongoWorkspaceMember from './mongo-legacy/WorkspaceMember';

const ERROR_LOG_PATH = 'migration-errors.log';
const BATCH_SIZE = 2000;
const FORCE = process.argv.includes('--force');

function logError(context: string, id: unknown, error: unknown) {
  const line = `[${new Date().toISOString()}] ${context} id=${String(id)}: ${error instanceof Error ? error.message : String(error)}\n`;
  appendFileSync(ERROR_LOG_PATH, line);
}

async function connectMongo() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diy-analytics';
  const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'diy-analytics';
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DATABASE });
}

async function assertTargetIsEmpty() {
  if (FORCE) return;
  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (existing) {
    throw new Error(
      'Target Postgres "users" table already has data. Re-running this script would create duplicates. ' +
        'Truncate the target tables first, or pass --force to proceed anyway.',
    );
  }
}

async function migrateUsers(): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  const docs = await MongoUser.find().select('+passwordHash').lean();
  for (const doc of docs) {
    try {
      const [row] = await db
        .insert(users)
        .values({
          email: doc.email,
          name: doc.name,
          passwordHash: doc.passwordHash,
          emailVerifiedAt: doc.emailVerifiedAt ?? null,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        })
        .returning({ id: users.id });
      idMap.set(String(doc._id), row.id);
    } catch (error) {
      logError('user', doc._id, error);
    }
  }
  console.log(`users: migrated ${idMap.size}/${docs.length}`);
  return idMap;
}

async function migrateWorkspaces(): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  const docs = await MongoWorkspace.find().lean();
  for (const doc of docs) {
    try {
      const [row] = await db
        .insert(workspaces)
        .values({
          name: doc.name,
          slug: doc.slug,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        })
        .returning({ id: workspaces.id });
      idMap.set(String(doc._id), row.id);
    } catch (error) {
      logError('workspace', doc._id, error);
    }
  }
  console.log(`workspaces: migrated ${idMap.size}/${docs.length}`);
  return idMap;
}

async function migrateWorkspaceMembers(
  userIdMap: Map<string, string>,
  workspaceIdMap: Map<string, string>,
): Promise<number> {
  const docs = await MongoWorkspaceMember.find().lean();
  let migrated = 0;
  for (const doc of docs) {
    const userId = userIdMap.get(String(doc.userId));
    const workspaceId = workspaceIdMap.get(String(doc.workspaceId));
    if (!userId || !workspaceId) {
      logError('workspace_member', doc._id, new Error('missing mapped userId/workspaceId'));
      continue;
    }
    try {
      await db.insert(workspaceMembers).values({
        userId,
        workspaceId,
        role: doc.role,
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      });
      migrated++;
    } catch (error) {
      logError('workspace_member', doc._id, error);
    }
  }
  console.log(`workspace_members: migrated ${migrated}/${docs.length}`);
  return migrated;
}

async function migrateProjects(workspaceIdMap: Map<string, string>): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  const docs = await MongoProject.find().lean();
  for (const doc of docs) {
    const workspaceId = workspaceIdMap.get(String(doc.workspaceId));
    if (!workspaceId) {
      logError('project', doc._id, new Error('missing mapped workspaceId'));
      continue;
    }
    // Recompute domain from url via the same normalizeProjectUrl the app
    // now uses going forward, rather than trusting whatever was stored in
    // Mongo — guarantees consistency with the new single source of truth.
    const normalized = normalizeProjectUrl(doc.url);
    try {
      const [row] = await db
        .insert(projects)
        .values({
          name: doc.name,
          workspaceId,
          url: normalized?.hostname ?? doc.url,
          domain: normalized?.domain ?? doc.domain ?? null,
          trackingCode: doc.trackingCode,
          publicMode: doc.publicMode ?? false,
          timezone: doc.timezone ?? null,
          excludedIPs: doc.excludedIPs ?? [],
          excludedPaths: doc.excludedPaths ?? [],
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        })
        .returning({ id: projects.id });
      idMap.set(String(doc._id), row.id);
    } catch (error) {
      logError('project', doc._id, error);
    }
  }
  console.log(`projects: migrated ${idMap.size}/${docs.length}`);
  return idMap;
}

async function migrateGoals(projectIdMap: Map<string, string>): Promise<number> {
  const docs = await MongoGoal.find().lean();
  let migrated = 0;
  for (const doc of docs) {
    const projectId = projectIdMap.get(String(doc.projectId));
    if (!projectId) {
      logError('goal', doc._id, new Error('missing mapped projectId'));
      continue;
    }
    try {
      await db.insert(goals).values({
        projectId,
        name: doc.name,
        type: doc.type,
        matchValue: doc.matchValue,
        createdAt: doc.createdAt ?? new Date(),
      });
      migrated++;
    } catch (error) {
      logError('goal', doc._id, error);
    }
  }
  console.log(`goals: migrated ${migrated}/${docs.length}`);
  return migrated;
}

async function migrateAlerts(projectIdMap: Map<string, string>): Promise<number> {
  const docs = await MongoAlert.find().lean();
  let migrated = 0;
  for (const doc of docs) {
    const projectId = projectIdMap.get(String(doc.projectId));
    if (!projectId) {
      logError('alert', doc._id, new Error('missing mapped projectId'));
      continue;
    }
    try {
      await db.insert(alerts).values({
        projectId,
        name: doc.name,
        metric: doc.metric,
        thresholdType: doc.thresholdType,
        thresholdValue: doc.thresholdValue,
        webhookUrl: doc.webhookUrl,
        lastTriggeredAt: doc.lastTriggeredAt ?? null,
        createdAt: doc.createdAt ?? new Date(),
      });
      migrated++;
    } catch (error) {
      logError('alert', doc._id, error);
    }
  }
  console.log(`alerts: migrated ${migrated}/${docs.length}`);
  return migrated;
}

async function migrateFunnels(projectIdMap: Map<string, string>): Promise<number> {
  const docs = await MongoFunnel.find().lean();
  let migrated = 0;
  for (const doc of docs) {
    const projectId = projectIdMap.get(String(doc.projectId));
    if (!projectId) {
      logError('funnel', doc._id, new Error('missing mapped projectId'));
      continue;
    }
    try {
      // Funnel steps copy straight into the new jsonb column — no remap
      // needed, the array shape is identical.
      await db.insert(funnels).values({
        projectId,
        name: doc.name,
        steps: doc.steps,
        createdAt: doc.createdAt ?? new Date(),
      });
      migrated++;
    } catch (error) {
      logError('funnel', doc._id, error);
    }
  }
  console.log(`funnels: migrated ${migrated}/${docs.length}`);
  return migrated;
}

/** Streamed/chunked — pageviews/events can be the largest collections by far. */
async function migratePageViews(projectIdMap: Map<string, string>): Promise<number> {
  const cursor = MongoPageView.find().lean().cursor();
  let batch: (typeof pageViews.$inferInsert)[] = [];
  let migrated = 0;
  let total = 0;

  for await (const doc of cursor) {
    total++;
    const projectId = projectIdMap.get(String(doc.projectId));
    if (!projectId) {
      logError('pageview', doc._id, new Error('missing mapped projectId'));
      continue;
    }
    batch.push({
      projectId,
      url: doc.url,
      path: doc.path,
      referrer: doc.referrer ?? null,
      source: doc.source ?? 'Direct',
      browser: doc.browser ?? null,
      browserVersion: doc.browserVersion ?? null,
      os: doc.os ?? null,
      osVersion: doc.osVersion ?? null,
      device: doc.device ?? null,
      deviceVendor: doc.deviceVendor ?? null,
      deviceModel: doc.deviceModel ?? null,
      country: doc.country ?? null,
      region: doc.region ?? null,
      city: doc.city ?? null,
      sessionId: doc.sessionId,
      userId: doc.userId ?? null,
      userAgent: doc.userAgent ?? null,
      utmSource: doc.utmSource ?? null,
      utmMedium: doc.utmMedium ?? null,
      utmCampaign: doc.utmCampaign ?? null,
      utmTerm: doc.utmTerm ?? null,
      utmContent: doc.utmContent ?? null,
      timestamp: doc.timestamp ?? new Date(),
    });
    if (batch.length >= BATCH_SIZE) {
      try {
        await db.insert(pageViews).values(batch);
        migrated += batch.length;
      } catch (error) {
        logError('pageview-batch', `~${doc._id}`, error);
      }
      batch = [];
    }
  }
  if (batch.length > 0) {
    try {
      await db.insert(pageViews).values(batch);
      migrated += batch.length;
    } catch (error) {
      logError('pageview-batch', 'final', error);
    }
  }
  console.log(`pageviews: migrated ${migrated}/${total}`);
  return migrated;
}

async function migrateEvents(projectIdMap: Map<string, string>): Promise<number> {
  const cursor = MongoEvent.find().lean().cursor();
  let batch: (typeof events.$inferInsert)[] = [];
  let migrated = 0;
  let total = 0;

  for await (const doc of cursor) {
    total++;
    const projectId = projectIdMap.get(String(doc.projectId));
    if (!projectId) {
      logError('event', doc._id, new Error('missing mapped projectId'));
      continue;
    }
    batch.push({
      projectId,
      name: doc.name,
      url: doc.url,
      path: doc.path,
      data: doc.data ?? null,
      sessionId: doc.sessionId,
      userId: doc.userId ?? null,
      country: doc.country ?? null,
      region: doc.region ?? null,
      city: doc.city ?? null,
      browser: doc.browser ?? null,
      browserVersion: doc.browserVersion ?? null,
      os: doc.os ?? null,
      osVersion: doc.osVersion ?? null,
      device: doc.device ?? null,
      deviceVendor: doc.deviceVendor ?? null,
      deviceModel: doc.deviceModel ?? null,
      referrer: doc.referrer ?? null,
      source: doc.source ?? 'Direct',
      utmSource: doc.utmSource ?? null,
      utmMedium: doc.utmMedium ?? null,
      utmCampaign: doc.utmCampaign ?? null,
      utmTerm: doc.utmTerm ?? null,
      utmContent: doc.utmContent ?? null,
      timestamp: doc.timestamp ?? new Date(),
    });
    if (batch.length >= BATCH_SIZE) {
      try {
        await db.insert(events).values(batch);
        migrated += batch.length;
      } catch (error) {
        logError('event-batch', `~${doc._id}`, error);
      }
      batch = [];
    }
  }
  if (batch.length > 0) {
    try {
      await db.insert(events).values(batch);
      migrated += batch.length;
    } catch (error) {
      logError('event-batch', 'final', error);
    }
  }
  console.log(`events: migrated ${migrated}/${total}`);
  return migrated;
}

async function migrateDailyRollups(projectIdMap: Map<string, string>): Promise<number> {
  const docs = await MongoDailyRollup.find().lean();
  let migrated = 0;
  for (const doc of docs) {
    const projectId = projectIdMap.get(String(doc.projectId));
    if (!projectId) {
      logError('daily_rollup', doc._id, new Error('missing mapped projectId'));
      continue;
    }
    try {
      // userIds are opaque tracker-assigned identities, never Mongo
      // ObjectIds — copy as-is, no remap needed.
      await db.insert(dailyRollups).values({
        projectId,
        date: doc.date,
        pageViews: doc.pageViews ?? 0,
        sessions: doc.sessions ?? 0,
        bounces: doc.bounces ?? 0,
        sessionDurationSec: doc.sessionDurationSec ?? 0,
        durationSessionCount: doc.durationSessionCount ?? 0,
        userIds: doc.userIds ?? [],
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      });
      migrated++;
    } catch (error) {
      logError('daily_rollup', doc._id, error);
    }
  }
  console.log(`daily_rollups: migrated ${migrated}/${docs.length}`);
  return migrated;
}

async function printRowCountComparison() {
  const [mongoCounts, pgCounts] = await Promise.all([
    Promise.all([
      MongoUser.countDocuments(),
      MongoWorkspace.countDocuments(),
      MongoWorkspaceMember.countDocuments(),
      MongoProject.countDocuments(),
      MongoGoal.countDocuments(),
      MongoAlert.countDocuments(),
      MongoFunnel.countDocuments(),
      MongoPageView.countDocuments(),
      MongoEvent.countDocuments(),
      MongoDailyRollup.countDocuments(),
    ]),
    Promise.all([
      db.$count(users),
      db.$count(workspaces),
      db.$count(workspaceMembers),
      db.$count(projects),
      db.$count(goals),
      db.$count(alerts),
      db.$count(funnels),
      db.$count(pageViews),
      db.$count(events),
      db.$count(dailyRollups),
    ]),
  ]);

  const labels = [
    'users',
    'workspaces',
    'workspace_members',
    'projects',
    'goals',
    'alerts',
    'funnels',
    'pageviews',
    'events',
    'daily_rollups',
  ];
  console.log('\nRow-count comparison (Mongo -> Postgres):');
  labels.forEach((label, i) => {
    const mark = mongoCounts[i] === pgCounts[i] ? 'OK' : 'MISMATCH';
    console.log(
      `  ${label.padEnd(20)} ${String(mongoCounts[i]).padStart(8)} -> ${String(pgCounts[i]).padStart(8)}  [${mark}]`,
    );
  });
}

async function main() {
  writeFileSync(ERROR_LOG_PATH, `Migration started ${new Date().toISOString()}\n`);

  await connectMongo();
  await assertTargetIsEmpty();

  const userIdMap = await migrateUsers();
  const workspaceIdMap = await migrateWorkspaces();
  await migrateWorkspaceMembers(userIdMap, workspaceIdMap);
  const projectIdMap = await migrateProjects(workspaceIdMap);
  await migrateGoals(projectIdMap);
  await migrateAlerts(projectIdMap);
  await migrateFunnels(projectIdMap);
  await migratePageViews(projectIdMap);
  await migrateEvents(projectIdMap);
  await migrateDailyRollups(projectIdMap);

  await printRowCountComparison();

  console.log(`\nDone. See ${ERROR_LOG_PATH} for any skipped rows.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
