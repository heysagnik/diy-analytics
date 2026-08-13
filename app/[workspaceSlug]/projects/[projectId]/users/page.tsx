'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { SegmentsPanel } from '@/components/analytics/visitors/SegmentsPanel';
import { VisitorDetailPanel } from '@/components/analytics/visitors/VisitorDetailPanel';
import { VisitorFilters, VisitorList } from '@/components/analytics/visitors/VisitorList';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVisitors } from '@/hooks/useVisitors';
import type { VisitorListViewState } from '@/types/visitors';

type UsersTabId = 'directory' | 'segments';

export default function UsersPage() {
  const { projectId } = useParams<{ workspaceSlug: string; projectId: string }>();

  const {
    loading,
    error,
    pagination,
    countries,
    filters,
    filteredUsers,
    hasActiveFilters,
    fetchUsers,
    handlePageChange,
    handleFilterChange,
    handleClearFilters,
  } = useVisitors(projectId);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<UsersTabId>('directory');

  const viewState: VisitorListViewState = loading
    ? 'loading'
    : error
      ? 'error'
      : filteredUsers.length === 0
        ? 'empty'
        : 'ready';

  return (
    <ProjectPageShell
      eyebrow="Audience"
      title="Visitors"
      description="Individual visitor profiles and recency/frequency segments."
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => typeof v === 'string' && setActiveTab(v as UsersTabId)}
        className="gap-4"
      >
        <TabsList className="w-max">
          <TabsIndicator />
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="animate-fade-in">
          <div className="flex flex-col gap-4">
            <VisitorFilters
              filters={filters}
              countries={countries}
              loading={loading}
              hasActiveFilters={hasActiveFilters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              onRefresh={fetchUsers}
            />

            <div className="overflow-hidden rounded-xl bg-card border border-border lg:h-[calc(100vh-320px)] lg:min-h-[500px]">
              <div className="grid grid-cols-1 lg:h-full lg:grid-cols-[380px_1fr]">
                <div className="flex flex-col min-w-[380px] lg:h-full lg:overflow-hidden">
                  <VisitorList
                    viewState={viewState}
                    users={filteredUsers}
                    error={error}
                    selectedUserId={selectedUserId}
                    hasActiveFilters={hasActiveFilters}
                    pagination={pagination}
                    onSelect={setSelectedUserId}
                    onRetry={fetchUsers}
                    onClearFilters={handleClearFilters}
                    onPageChange={handlePageChange}
                  />
                </div>

                <VisitorDetailPanel
                  embedded
                  projectId={projectId}
                  userId={selectedUserId}
                  onClose={() => setSelectedUserId(null)}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="animate-fade-in">
          <SegmentsPanel projectId={projectId} />
        </TabsContent>
      </Tabs>
    </ProjectPageShell>
  );
}
