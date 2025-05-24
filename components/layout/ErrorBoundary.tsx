"use client";

import React, { ErrorInfo } from 'react';
import { Warning } from '@phosphor-icons/react';

interface ErrorBoundaryProps {
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches errors in its child component tree
 * and displays a fallback UI instead of crashing the entire app
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 m-4 border rounded-md bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <Warning size={24} />
            <h3 className="font-medium">Something went wrong</h3>
          </div>
          <p className="text-sm text-red-600">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
} 