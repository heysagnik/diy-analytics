import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { VisitorFiltersState, VisitorListResponse, VisitorPagination } from '@/types/visitors';

const DEFAULT_PAGINATION_STATE = { page: 1, limit: 12 };
const DEFAULT_FILTERS: VisitorFiltersState = { country: '', lastSeen: '', search: '' };
const EMPTY_PAGINATION: VisitorPagination = { page: 1, limit: 12, total: 0, totalPages: 0 };

async function fetchVisitors(
  projectId: string,
  page: number,
  limit: number,
  filters: VisitorFiltersState,
  signal: AbortSignal,
): Promise<VisitorListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('limit', limit.toString());
  if (filters.country) searchParams.append('country', filters.country);
  if (filters.lastSeen) searchParams.append('lastSeen', filters.lastSeen);
  if (filters.search.trim()) searchParams.append('search', filters.search.trim());

  const response = await fetch(`/api/projects/${projectId}/users?${searchParams.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export const useVisitors = (projectId: string | undefined) => {
  const [{ page, limit }, setPagination] = useState(DEFAULT_PAGINATION_STATE);
  const [filters, setFilters] = useState<VisitorFiltersState>(DEFAULT_FILTERS);

  const query = useQuery<VisitorListResponse, Error>({
    queryKey: ['visitors', projectId, page, limit, filters],
    queryFn: ({ signal }) => fetchVisitors(projectId as string, page, limit, filters, signal),
    enabled: Boolean(projectId),
    // Keep the previous page's rows visible while the next page loads,
    // instead of flashing back to a loading state on every pagination click.
    placeholderData: keepPreviousData,
  });

  const handlePageChange = (value: number) => {
    setPagination((prev) => ({ ...prev, page: value }));
  };

  const handleFilterChange = (name: keyof VisitorFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = Boolean(filters.country || filters.lastSeen || filters.search);

  return {
    loading: query.isLoading,
    error: query.isError ? 'Failed to load visitor telemetry.' : null,
    pagination: query.data?.pagination ?? EMPTY_PAGINATION,
    countries: query.data?.filters.countries ?? [],
    filters,
    filteredUsers: query.data?.users ?? [],
    hasActiveFilters,
    fetchUsers: () => query.refetch(),
    handlePageChange,
    handleFilterChange,
    handleClearFilters,
  };
};
