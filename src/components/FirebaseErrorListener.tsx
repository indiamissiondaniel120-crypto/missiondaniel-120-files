'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      // In development, this will show a detailed toast. 
      // In production, you might log this to a service.
      toast({
        variant: 'destructive',
        title: 'Database Permission Error',
        description: error.message || 'You do not have permission to perform this action.',
      });
      
      // We throw the error so it can be captured by the Next.js error overlay in development
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
