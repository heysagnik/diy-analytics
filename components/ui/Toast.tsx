import React from 'react';
import { ToastProps } from '../../types/settings';
import { CheckCircleIcon, WarningCircleIcon, CaretDownIcon } from '@phosphor-icons/react';

interface ToastContainerProps {
  toasts: ToastProps[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => (
  <div className="fixed bottom-4 right-4 w-80 z-50 space-y-2">
    {toasts.map((toast, index) => (
      <div 
        key={index}
        className={`rounded-md p-3 shadow-md flex items-start gap-2 animate-fade-in transition-opacity ${
          toast.type === 'success' ? 'bg-green-50 text-green-800' :
          toast.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}
      >
        {toast.type === 'success' && <CheckCircleIcon size={18} weight="fill" />}
        {toast.type === 'error' && <WarningCircleIcon size={18} weight="fill" />}
        {toast.type === 'info' && <CaretDownIcon size={18} weight="fill" />}
        <p className="text-sm">{toast.message}</p>
      </div>
    ))}
  </div>
);