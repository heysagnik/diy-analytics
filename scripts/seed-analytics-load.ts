import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { events, pageViews, projects } from '@/db/schema';
import { db } from '@/lib/db';

const PROJECT_ID_FLAG = '--project-id';
const PAGEVIEW_COUNT_FLAG = '--pageviews';
const DAYS_FLAG = '--days';
const BATCH_SIZE = 500;

const COUNTRIES = ['US', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'JP', 'NL'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
const OS_LIST = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
const DEVICES = ['desktop', 'mobile', 'tablet'];
const PATHS = ['/', '/pricing', '/docs', '/blog', '/about', '/docs/getting-started', '/features', '/contact'];
const SOURCES = ['Direct', 'google.com', 'twitter.com', 'github.com', 'producthunt.com'];
const UTM_SOURCES = [null, 'google', 'twitter', 'newsletter'];
const UTM_MEDIUMS = [null, 'cpc', 'social', 'email'];
const UTM_CAMPAIGNS = [null, 'launch', 'summer_sale', 'referral'];
const EVENT_NAMES = ['signup_completed', 'button_click', 'video_played', 'form_submitted'];

function parseFlag(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  const value = Number(process.argv[idx + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimestampInLastDays(days: number): Date {
  const now = Date.now();
  const offset = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
}

interface SessionProfile {
  sessionId: string;
  userId: string;
  country: string;
  browser: string;
  os: string;
  device: string;
  source: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

function makeSessionProfile(): SessionProfile {
  return {
    sessionId: randomUUID(),
    userId: randomUUID(),
    country: pick(COUNTRIES),
    browser: pick(BROWSERS),
    os: pick(OS_LIST),
    device: pick(DEVICES),
    source: pick(SOURCES),
    utmSource: pick(UTM_SOURCES),
    utmMedium: pick(UTM_MEDIUMS),
    utmCampaign: pick(UTM_CAMPAIGNS),
  };
}

async function insertInBatches<T extends Record<string, unknown>>(
  table: typeof pageViews | typeof events,
  rows: T[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(table).values(batch as never);
    console.log(`  inserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function main() {
  const projectId = process.argv[process.argv.indexOf(PROJECT_ID_FLAG) + 1];
  if (!projectId) {
    console.error(
      `Usage: tsx scripts/seed-analytics-load.ts ${PROJECT_ID_FLAG} <uuid> [${PAGEVIEW_COUNT_FLAG} 300000] [${DAYS_FLAG} 90]`,
    );
    process.exit(1);
  }

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    console.error(`No project found with id ${projectId}`);
    process.exit(1);
  }

  const targetPageviews = parseFlag(PAGEVIEW_COUNT_FLAG, 300_000);
  const days = parseFlag(DAYS_FLAG, 90);

  console.log(`Seeding ~${targetPageviews} pageviews across ${days} days for project ${projectId}`);

  const pageviewRows: (typeof pageViews.$inferInsert)[] = [];
  const eventRows: (typeof events.$inferInsert)[] = [];

  while (pageviewRows.length < targetPageviews) {
    const profile = makeSessionProfile();
    const pageCount = 1 + Math.floor(Math.random() * 8);
    let ts = randomTimestampInLastDays(days).getTime();

    for (let i = 0; i < pageCount; i++) {
      if (i > 0) ts += (5 + Math.random() * 295) * 1000;
      const path = pick(PATHS);
      pageviewRows.push({
        projectId,
        url: `https://example.com${path}`,
        path,
        referrer: profile.source === 'Direct' ? null : `https://${profile.source}/`,
        source: profile.source,
        browser: profile.browser,
        browserVersion: String(90 + Math.floor(Math.random() * 30)),
        os: profile.os,
        osVersion: '1.0',
        device: profile.device,
        deviceVendor: profile.device === 'mobile' ? 'Apple' : null,
        deviceModel: profile.device === 'mobile' ? 'iPhone' : null,
        country: profile.country,
        region: null,
        city: null,
        sessionId: profile.sessionId,
        userId: profile.userId,
        userAgent: 'seed-script',
        utmSource: profile.utmSource,
        utmMedium: profile.utmMedium,
        utmCampaign: profile.utmCampaign,
        utmTerm: null,
        utmContent: null,
        timestamp: new Date(ts),
      });
    }

    if (Math.random() < 0.15) {
      eventRows.push({
        projectId,
        name: pick(EVENT_NAMES),
        url: `https://example.com${pick(PATHS)}`,
        path: pick(PATHS),
        data: { plan: pick(['free', 'pro', 'team']) },
        sessionId: profile.sessionId,
        userId: profile.userId,
        country: profile.country,
        region: null,
        city: null,
        browser: profile.browser,
        browserVersion: null,
        os: profile.os,
        osVersion: null,
        device: profile.device,
        deviceVendor: null,
        deviceModel: null,
        referrer: null,
        source: profile.source,
        utmSource: profile.utmSource,
        utmMedium: profile.utmMedium,
        utmCampaign: profile.utmCampaign,
        utmTerm: null,
        utmContent: null,
        timestamp: new Date(ts),
      });
    }

    if (Math.random() < 0.05) {
      eventRows.push({
        projectId,
        name: '__web_vital',
        url: `https://example.com${pick(PATHS)}`,
        path: pick(PATHS),
        data: { metric: pick(['LCP', 'CLS', 'INP']), value: Math.round(Math.random() * 3000), path: pick(PATHS) },
        sessionId: profile.sessionId,
        userId: profile.userId,
        country: profile.country,
        region: null,
        city: null,
        browser: profile.browser,
        browserVersion: null,
        os: profile.os,
        osVersion: null,
        device: profile.device,
        deviceVendor: null,
        deviceModel: null,
        referrer: null,
        source: profile.source,
        utmSource: profile.utmSource,
        utmMedium: profile.utmMedium,
        utmCampaign: profile.utmCampaign,
        utmTerm: null,
        utmContent: null,
        timestamp: new Date(ts),
      });
    }
  }

  console.log(`Generated ${pageviewRows.length} pageviews, ${eventRows.length} events. Inserting...`);
  await insertInBatches(pageViews, pageviewRows);
  await insertInBatches(events, eventRows);

  console.log('Done.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
