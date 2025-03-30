
import React from 'react';
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';
import { useMediaValidation } from '@/hooks/useMediaValidation';
import { Tooltip } from '@/components/ui/tooltip';

interface MediaValidationIndicatorProps {
  url: string;
}

export const MediaValidationIndicator: React.FC<MediaValidationIndicatorProps> = ({ url }) => {
  const { isValidating, validationResult } = useMediaValidation(url);

  if (isValidating) {
    return (
      <Tooltip content="Validating media...">
        <div className="absolute top-2 left-2 bg-white/80 rounded-full p-1">
          <AlertCircleIcon className="h-4 w-4 text-yellow-500 animate-pulse" />
        </div>
      </Tooltip>
    );
  }

  if (!validationResult) {
    return null;
  }

  return (
    <Tooltip content={validationResult.isValid ? "Media validated" : validationResult.error}>
      <div className="absolute top-2 left-2 bg-white/80 rounded-full p-1">
        {validationResult.isValid ? (
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
        ) : (
          <XCircleIcon className="h-4 w-4 text-red-500" />
        )}
      </div>
    </Tooltip>
  );
};
