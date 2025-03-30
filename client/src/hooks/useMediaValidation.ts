
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
}

export function useMediaValidation(url?: string) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['media-validation', url],
    queryFn: async () => {
      if (!url) return null;
      
      const response = await fetch('/api/media/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error('Validation request failed');
      }
      
      return response.json();
    },
    enabled: !!url,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  useEffect(() => {
    setIsValidating(isLoading);
    if (data) {
      setValidationResult(data);
    }
  }, [data, isLoading]);

  return {
    isValidating,
    validationResult,
    validateMediaUrl: async (url: string) => {
      setIsValidating(true);
      try {
        const response = await fetch('/api/media/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        const result = await response.json();
        setValidationResult(result);
        return result;
      } catch (error) {
        const result = {
          isValid: false,
          error: 'Validation failed'
        };
        setValidationResult(result);
        return result;
      } finally {
        setIsValidating(false);
      }
    }
  };
}
