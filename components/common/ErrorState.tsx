import React from 'react';
import { Warning } from '@phosphor-icons/react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <Warning size={32} className="text-red-600" />
      </div>
      <h2 className="text-xl font-medium mb-2 text-center">Something went wrong</h2>
      <p className="text-gray-600 mb-4 text-center max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}