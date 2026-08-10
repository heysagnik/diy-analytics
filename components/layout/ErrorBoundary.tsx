'use client';

import { Warning } from '@phosphor-icons/react';
import React, { type ErrorInfo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="m-4">
          <Alert variant="destructive">
            <Warning />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>This part of the page couldn&apos;t load. Please refresh and try again.</AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
