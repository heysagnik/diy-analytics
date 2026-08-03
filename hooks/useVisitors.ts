import { useCallback, useEffect, useRef, useState } from 'react';
import type { Visitor, VisitorFiltersState, VisitorListResponse, VisitorPagination } from '@/types/visitors';

const DEFAULT_PAGINATION: VisitorPagination = { page: 1, limit: 12, total: 0, totalPages: 0 };
const DEFAULT_FILTERS: VisitorFiltersState = { country: '', lastSeen: '', search: '' };

export const useVisitors = (projectId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Visitor[]>([]);
  const [pagination, setPagination] = useState<VisitorPagination>(DEFAULT_PAGINATION);
  const [countries, setCountries] = useState<string[]>([]);
  const [filters, setFilters] = useState<VisitorFiltersState>(DEFAULT_FILTERS);
  const requestControllerRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!projectId) return;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('page', pagination.page.toString());
      searchParams.append('limit', pagination.limit.toString());
      if (filters.country) searchParams.append('country', filters.country);
      if (filters.lastSeen) searchParams.append('lastSeen', filters.lastSeen);
      if (filters.search.trim()) searchParams.append('search', filters.search.trim());

      const response = await fetch(`/api/projects/${projectId}/users?${searchParams.toString()}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: VisitorListResponse = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      setCountries(data.filters.countries || []);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      console.error('Error fetching users:', err);
      setError('Failed to load visitor telemetry.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    }
  }, [projectId, pagination.page, pagination.limit, filters.country, filters.lastSeen, filters.search]);

  useEffect(() => {
    if (projectId) void fetchUsers();
    return () => requestControllerRef.current?.abort();
  }, [projectId, fetchUsers]);

  const handlePageChange = (value: number) => {
    setPagination((prev) => ({ ...prev, page: value }));
  };

  const handleFilterChange = (name: keyof VisitorFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => setFilters(DEFAULT_FILTERS);

  const hasActiveFilters = Boolean(filters.country || filters.lastSeen || filters.search);

  return {
    loading,
    error,
    pagination,
    countries,
    filters,
    filteredUsers: users,
    hasActiveFilters,
    fetchUsers,
    handlePageChange,
    handleFilterChange,
    handleClearFilters,
  };
};
