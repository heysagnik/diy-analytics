import { useState } from 'react';
import { ToastProps } from '../types/settings';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const newToast = { type, message };
    setToasts([...toasts, newToast]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter(t => t !== newToast));
    }, 5000);
  };

  return { toasts, showToast };
};