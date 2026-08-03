'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { VisitorFilters, VisitorList, VisitorDetailPanel } from '@/components/analytics/visitors';
import { useVisitors } from '@/hooks/useVisitors';
import type { VisitorListViewState } from '@/types/visitors';
import ProjectPageShell from '@/components/project/ProjectPageShell';

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

  const viewState: VisitorListViewState = loading ? 'loading' : error ? 'error' : filteredUsers.length === 0 ? 'empty' : 'ready';

  return (
    <ProjectPageShell
      eyebrow="Audience"
      title="Visitors"
      description="Individual visitor profiles — sessions from the same person are grouped together."
    >
        <div className="space-y-4">
          <VisitorFilters
            filters={filters}
            countries={countries}
            loading={loading}
            hasActiveFilters={hasActiveFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            onRefresh={fetchUsers}
          />

          <div className="overflow-hidden rounded-xl bg-card border border-border lg:h-[calc(100vh-280px)] lg:min-h-[500px]">
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
    </ProjectPageShell>
  );
}
