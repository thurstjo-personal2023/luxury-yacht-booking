import { useState, useEffect } from 'react';
import { useAdminAuth, formatSessionTime } from '@/hooks/use-admin-auth';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionTimerProps {
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export function SessionTimer({ 
  className = '', 
  showProgress = true,
  compact = false 
}: SessionTimerProps) {
  const { 
    sessionTimeRemaining, 
    refreshSession, 
    isSessionExpiringSoon 
  } = useAdminAuth();
  
  // The total session length in seconds (for progress bar)
  const [totalSessionLength] = useState(15 * 60); // 15 minutes
  
  // Calculate progress percentage
  const progressPercentage = Math.max(
    0, 
    Math.min(100, (sessionTimeRemaining / totalSessionLength) * 100)
  );
  
  // Handle refresh button click
  const handleRefresh = () => {
    refreshSession();
  };
  
  // Format time remaining
  const formattedTime = formatSessionTime(sessionTimeRemaining);
  
  // Set progress color based on time remaining
  const getProgressColor = () => {
    if (isSessionExpiringSoon) return 'bg-destructive'; // Red for expiring soon
    if (sessionTimeRemaining < totalSessionLength / 2) return 'bg-orange-500'; // Orange for halfway
    return 'bg-green-500'; // Green for healthy session
  };
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Clock className="h-4 w-4" />
        <span className={`font-mono ${isSessionExpiringSoon ? 'text-destructive font-bold' : ''}`}>
          {formattedTime}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={handleRefresh}
          title="Refresh Session"
        >
          <RefreshCcw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Session</span>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className={`text-sm font-mono ${isSessionExpiringSoon ? 'text-destructive font-bold' : ''}`}
          >
            {formattedTime}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleRefresh}
            title="Refresh Session"
          >
            <RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {showProgress && (
        <Progress 
          value={progressPercentage} 
          className="h-1"
          indicatorClassName={getProgressColor()}
        />
      )}
    </div>
  );
}