import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/Project";
import { AnalyticsService } from "@/app/api/analytics/services/analyticsService";
import { createEmptyAnalyticsData } from "@/utils/analytics";
import type { AnalyticsData, DateRange } from "@/types/analytics";
import PublicDashboardClient from "./PublicDashboardClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicDashboardPage({ params }: PageProps) {
  const { id } = await params;

  await connectToDatabase();
  const project = (await Project.findById(id).lean<{
    _id: { toString(): string };
    name: string;
    url: string;
    domain?: string;
    trackingCode: string;
    publicMode?: boolean;
  }>());

  if (!project) {
    notFound();
  }

  if (project.publicMode !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-surface rounded-xl border border-border p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-secondary text-muted-foreground mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-.552.448-1 1-1h3m-6 6v-5m-3 4V8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground mb-1">Public dashboard is disabled</h1>
          <p className="text-sm text-muted-foreground">
            The owner of <strong>{project.name}</strong> hasn't turned on public access. Ask them to enable
            it in their dashboard settings.
          </p>
        </div>
      </div>
    );
  }

  const DEFAULT_RANGE: DateRange = "Last 30 days";
  let initialData: AnalyticsData;
  try {
    const service = new AnalyticsService();
    const data = await service.getAnalytics({ projectId: id, dateRange: "LAST_30_DAYS" });
    initialData = data;
  } catch (err) {
    console.error("Public dashboard initial load failed:", err);
    initialData = createEmptyAnalyticsData(DEFAULT_RANGE);
  }

  return (
    <PublicDashboardClient
      projectId={id}
      project={{
        name: project.name,
        url: project.url,
        domain: project.domain,
      }}
      initialData={initialData}
      initialRange={DEFAULT_RANGE}
    />
  );
}
