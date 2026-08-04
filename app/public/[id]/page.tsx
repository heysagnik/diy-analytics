import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/Project";
import { AnalyticsService } from "@/app/api/analytics/services/analyticsService";
import { createEmptyAnalyticsData } from "@/utils/analytics";
import type { AnalyticsData, DateRange } from "@/types/analytics";
import { Card } from "@/components/ui/card";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
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
        <Card className="max-w-md w-full p-8 text-center animate-fade-in">
          <div className="icon-chip size-12 mx-auto mb-4">
            <LockSimpleIcon size={22} weight="bold" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground mb-1 text-balance">
            Public dashboard is disabled
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            The owner of <strong className="text-foreground font-medium">{project.name}</strong> hasn&apos;t turned
            on public access. Ask them to enable it in their dashboard settings.
          </p>
        </Card>
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
