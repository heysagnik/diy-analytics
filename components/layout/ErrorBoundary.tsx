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
        <div className="m-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-destructive">
            <Warning size={20} weight="bold" />
            <h3 className="font-medium text-sm">Something went wrong</h3>
          </div>
          <p className="text-sm text-destructive/80">
            This part of the page couldn&apos;t load. Please refresh and try again.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
