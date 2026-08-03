import { useCallback } from 'react';
import { toast } from 'sonner';

export const useToast = () => {
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  }, []);

  return { showToast };
};
