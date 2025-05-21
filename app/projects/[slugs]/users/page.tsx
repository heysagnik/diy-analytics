'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useParams } from 'next/navigation';
import CountryFlag from 'react-country-flag';

// Import Phosphor icons - fixed ArrowClockwiseIcon to ArrowClockwise
import { ArrowClockwiseIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, GlobeIcon, InfoIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';

interface User {
  userId: string;
  country: string;
  lastSeen: string;
  browser: string;
  device: string;
  os: string;
  pathCount: number;
  activityCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse {
  users: User[];
  pagination: Pagination;
  filters: {
    countries: string[];
  };
}

// Helper function to format relative time
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
};

// Helper function to get activity indicator
const getActivityIndicator = (activityCount: number) => {
  if (activityCount > 15) {
    return (
      <div className="flex">
        {Array(3).fill('•').map((dot, i) => (
          <div key={i} className="text-yellow-400 text-2xl leading-none">•</div>
        ))}
      </div>
    );
  } else if (activityCount > 8) {
    return (
      <div className="flex">
        {Array(2).fill('•').map((dot, i) => (
          <div key={i} className="text-yellow-400 text-2xl leading-none">•</div>
        ))}
      </div>
    );
  } else if (activityCount > 3) {
    return <div className="text-yellow-400 text-2xl leading-none">•</div>;
  } else {
    return <div className="text-yellow-400 opacity-30 text-2xl leading-none">•</div>;
  }
};

export default function UsersPage() {
  const params = useParams<{ slugs: string }>();
  const projectId = params?.slugs;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [countries, setCountries] = useState<string[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    country: '',
    lastSeen: '',
    search: '',
  });
  
  const fetchUsers = useCallback(async () => { // Wrapped fetchUsers with useCallback
    setLoading(true);
    setError(null);
    try {
      // Add logging
      console.log("Fetching users with params:", {
        projectId,
        page: pagination.page,
        filters
      });
      
      const searchParams = new URLSearchParams();
      searchParams.append('page', pagination.page.toString());
      searchParams.append('limit', pagination.limit.toString());
      
      if (filters.country) {
        searchParams.append('country', filters.country);
      }
      
      if (filters.lastSeen) {
        searchParams.append('lastSeen', filters.lastSeen);
      }
      
      const response = await fetch(`/api/projects/${projectId}/users?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: ApiResponse = await response.json();
      
      // Debug the response
      console.log("API Response:", data);
      console.log("Users count:", data.users?.length || 0);
      
      setUsers(data.users);
      setPagination(data.pagination);
      setCountries(data.filters.countries);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId, pagination.page, pagination.limit, filters]); // Added dependencies for useCallback
  
  useEffect(() => {
    if (projectId) {
      fetchUsers();
    }
  }, [projectId, fetchUsers]); // Added fetchUsers to dependency array
  
  const handlePageChange = (value: number) => {
    setPagination({ ...pagination, page: value });
  };
  
  const handleFilterChange = (name: string, value: string) => {
    setFilters({ ...filters, [name]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to first page when changing filters
  };
  
  const handleClearFilters = () => {
    setFilters({
      country: '',
      lastSeen: '',
      search: '',
    });
  };
  
  const filteredUsers = users.filter(user => {
    if (filters.search) {
      return user.userId.toLowerCase().includes(filters.search.toLowerCase()) ||
             (user.country && user.country.toLowerCase().includes(filters.search.toLowerCase())) ||
             (user.browser && user.browser.toLowerCase().includes(filters.search.toLowerCase())) ||
             (user.device && user.device.toLowerCase().includes(filters.search.toLowerCase())) ||
             (user.os && user.os.toLowerCase().includes(filters.search.toLowerCase()));
    }
    return true;
  });
  
  return (
    <div className="p-4 md:p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center">
         
          Users
        </h1>
        <p className="text-gray-500 text-sm mt-1">Track and analyze your website visitors</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 md:p-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-grow">
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Search users by ID, country, browser..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <MagnifyingGlassIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                {filters.search && (
                  <button 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 p-1 rounded-full"
                    onClick={() => handleFilterChange('search', '')}
                    aria-label="Clear search"
                  >
                    <XIcon size={16} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Country Select */}
            <div className="md:w-48">
              <div className="relative">
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  aria-label="Filter by country"
                >
                  <option value="">All Countries</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <CaretDownIcon size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            </div>
            
            {/* Time Period Select */}
            <div className="md:w-48">
              <div className="relative">
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                  value={filters.lastSeen}
                  onChange={(e) => handleFilterChange('lastSeen', e.target.value)}
                  aria-label="Filter by time period"
                >
                  <option value="">Any Time</option>
                  <option value="lastHour">Last Hour</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="lastWeek">Last Week</option>
                </select>
                <CaretDownIcon size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            </div>
            
            <button 
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-sm"
              onClick={fetchUsers}
              aria-label="Refresh data"
            >
              <ArrowClockwiseIcon size={16} />
              Refresh
            </button>
          </div>
          
          {/* Applied Filters */}
          {(filters.country || filters.lastSeen || filters.search) && (
            <div className="mb-4 bg-blue-50 p-2 rounded-lg border border-blue-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-blue-700 ml-1">Filters:</span>
                
                {filters.country && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-200">
                    Country: {filters.country}
                    <button 
                      onClick={() => handleFilterChange('country', '')}
                      className="ml-1.5 hover:bg-blue-100 rounded-full p-0.5"
                      aria-label="Remove country filter"
                    >
                        <XIcon size={12} />
                    </button>
                  </span>
                )}
                
                {filters.lastSeen && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-200">
                    Time: {filters.lastSeen.replace(/([A-Z])/g, ' $1').trim()}
                    <button 
                      onClick={() => handleFilterChange('lastSeen', '')}
                      className="ml-1.5 hover:bg-blue-100 rounded-full p-0.5"
                      aria-label="Remove time filter"
                    >
                      <XIcon size={12} />
                    </button>
                  </span>
                )}
                
                {filters.search && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-200">
                    Search: {filters.search}
                    <button 
                      onClick={() => handleFilterChange('search', '')}
                      className="ml-1.5 hover:bg-blue-100 rounded-full p-0.5"
                      aria-label="Remove search term"
                    >
                        <XIcon size={12} />
                    </button>
                  </span>
                )}
                
                <button 
                  className="text-xs text-blue-700 hover:text-blue-800 font-medium ml-auto underline"
                  onClick={handleClearFilters}
                  aria-label="Clear all filters"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative h-12 w-12 mb-3">
                <div className="animate-spin absolute border-4 border-blue-200 border-t-blue-600 rounded-full h-full w-full"></div>
                
              </div>
              <span className="text-sm text-gray-600 font-medium">Loading user data...</span>
              <span className="text-xs text-gray-400 mt-1">This may take a moment</span>
            </div>
          ) : (
            <>
              {/* User Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User ID
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Seen
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Browser
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Device
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          OS
                        </th>
                        {/* <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" title="Number of pages visited">
                          Pages
                        </th> */}
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" title="Level of user activity">
                          Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <tr key={user.userId} className="hover:bg-gray-50">
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div className="flex items-center" title={`Full ID: ${user.userId}`}>
                                <span className="text-sm text-gray-900 font-medium">{user.userId.substring(0, 8)}</span>
                                <InfoIcon  size={16} className="ml-1 text-gray-400" />
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {user.country ? (
                                <div className="flex items-center">
                                  <CountryFlag countryCode={user.country} svg style={{ marginRight: 8, width: '16px' }} />
                                  <span className="text-sm text-gray-900">{user.country}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">Unknown</span>
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900" title={new Date(user.lastSeen).toLocaleString()}>
                                {formatTimeAgo(user.lastSeen)}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{user.browser || '--'}</span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{user.device || '--'}</span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{user.os || '--'}</span>
                            </td>
                            {/* <td className="px-3 py-4 whitespace-nowrap text-right">
                              <span className="text-sm text-gray-900 font-medium">{user.pathCount}</span>
                            </td> */}
                            <td className="px-3 py-4 whitespace-nowrap text-right" title={`${user.activityCount} interactions`}>
                              {getActivityIndicator(user.activityCount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-3 py-10 text-sm text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <GlobeIcon size={32} className="text-gray-300 mb-2" weight="duotone" />
                              <span>No users found with the selected filters.</span>
                              {(filters.country || filters.lastSeen || filters.search) && (
                                <button 
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                  onClick={handleClearFilters}
                                >
                                  Clear all filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-500 order-2 sm:order-1">
                  Showing {filteredUsers.length} of {pagination.total} users
                </span>
                
                {pagination.totalPages > 1 && (
                  <div className="flex items-center space-x-1 order-1 sm:order-2">
                    <button
                      className={`px-2 py-1 rounded-md ${
                        pagination.page === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                      aria-label="Previous page"
                    >
                      <CaretLeftIcon size={16} />
                    </button>
                    
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(pageNum => {
                        return pageNum === 1 || 
                               pageNum === pagination.totalPages || 
                               (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1);
                      })
                      .map((pageNum, i, arr) => (
                        <React.Fragment key={pageNum}>
                          {i > 0 && arr[i-1] !== pageNum - 1 && (
                            <span className="px-2 py-1 text-gray-400">...</span>
                          )}
                          <button
                            className={`min-w-[32px] h-8 rounded-md flex items-center justify-center text-sm ${
                              pageNum === pagination.page
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => handlePageChange(pageNum)}
                            aria-label={`Page ${pageNum}`}
                            aria-current={pageNum === pagination.page ? "page" : undefined}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      ))}
                      
                    <button
                      className={`px-2 py-1 rounded-md ${
                        pagination.page === pagination.totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                      aria-label="Next page"
                    >
                      <CaretRightIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}