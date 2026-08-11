import { type NextRequest, NextResponse } from 'next/server';
import {
  EXPLORE_DIMENSIONS,
  type ExploreCondition,
  ExploreService,
  MAX_CONDITIONS,
} from '@/app/api/analytics/services/exploreService';
import { DATE_RANGES } from '@/app/api/analytics/types';
import { requireProjectAccess } from '@/lib/serverAuth';
import { isValidUuid } from '@/lib/uuid';

const MAX_STRING_LENGTH = 255;

function isBoundedString(value: unknown, maxLength = MAX_STRING_LENGTH): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function parseCondition(raw: unknown): ExploreCondition | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;

  if (c.type === 'dimension') {
    if (!EXPLORE_DIMENSIONS.includes(c.dimension as (typeof EXPLORE_DIMENSIONS)[number])) return null;
    if (!isBoundedString(c.value)) return null;
    return { type: 'dimension', dimension: c.dimension as (typeof EXPLORE_DIMENSIONS)[number], value: c.value };
  }

  if (c.type === 'pageview') {
    if (!isBoundedString(c.path, 1024)) return null;
    return { type: 'pageview', path: c.path };
  }

  if (c.type === 'event') {
    if (!isBoundedString(c.eventName, 128)) return null;
    if (c.propertyKey !== undefined && !isBoundedString(c.propertyKey, 128)) return null;
    if (c.propertyValue !== undefined && !isBoundedString(c.propertyValue, 255)) return null;
    return {
      type: 'event',
      eventName: c.eventName,
      propertyKey: c.propertyKey as string | undefined,
      propertyValue: c.propertyValue as string | undefined,
    };
  }

  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();
    const { dateRange, combinator, conditions } = body;

    if (!DATE_RANGES[dateRange]) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    if (combinator !== 'AND' && combinator !== 'OR') {
      return NextResponse.json({ error: 'combinator must be "AND" or "OR"' }, { status: 400 });
    }
    if (!Array.isArray(conditions) || conditions.length === 0 || conditions.length > MAX_CONDITIONS) {
      return NextResponse.json({ error: `conditions must be an array of 1-${MAX_CONDITIONS} items` }, { status: 400 });
    }

    const parsedConditions = conditions.map(parseCondition);
    if (parsedConditions.some((c) => c === null)) {
      return NextResponse.json({ error: 'One or more conditions are invalid' }, { status: 400 });
    }

    const service = new ExploreService();
    const result = await service.runQuery(id, {
      dateRange,
      combinator,
      conditions: parsedConditions as ExploreCondition[],
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Explore query error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run query' },
      { status: 500 },
    );
  }
}
