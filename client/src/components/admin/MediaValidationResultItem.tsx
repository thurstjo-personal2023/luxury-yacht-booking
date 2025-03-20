/**
 * Media Validation Result Item Component
 * 
 * This component displays a single invalid media item and provides
 * controls to resolve the issue.
 */
import React from 'react';
import { InvalidMediaItem } from '../../types/media-validation';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface MediaValidationResultItemProps {
  item: InvalidMediaItem;
  onResolve: (item: InvalidMediaItem) => void;
  isResolving: boolean;
}

export const MediaValidationResultItem: React.FC<MediaValidationResultItemProps> = ({
  item,
  onResolve,
  isResolving
}) => {
  const handleResolve = () => {
    onResolve(item);
  };

  return (
    <Card className="mb-4 border border-red-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex justify-between">
          <span>
            <Badge variant="outline" className="mr-2">
              {item.collectionId}
            </Badge>
            <Badge variant="outline">{item.documentId}</Badge>
          </span>
          <Badge variant="destructive">{item.reason}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm grid grid-cols-1 gap-2">
          <div>
            <span className="font-semibold">Field:</span> {item.fieldPath}
          </div>
          <div>
            <span className="font-semibold">URL:</span> {item.url}
          </div>
          <div>
            <span className="font-semibold">Error:</span> {item.error}
          </div>
          {item.statusCode && (
            <div>
              <span className="font-semibold">Status:</span> {item.statusCode}
            </div>
          )}
          {item.responseData && (
            <div>
              <span className="font-semibold">Response:</span>{' '}
              <code className="text-xs bg-gray-100 p-1 rounded">
                {item.responseData}
              </code>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleResolve} 
          disabled={isResolving}
          size="sm"
          variant="outline"
        >
          {isResolving ? 'Resolving...' : 'Resolve'}
        </Button>
      </CardFooter>
    </Card>
  );
};