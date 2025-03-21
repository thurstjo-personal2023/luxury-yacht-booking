import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';

export function SessionTimer() {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const { adminUser, refreshSession, sessionTimeout, adminSignOut } = useAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Calculate the percentage of time remaining
  const progressPercentage = timeRemaining !== null && totalTime > 0
    ? Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100))
    : 100;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Set the total session time
    if (sessionTimeout) {
      setTotalTime(sessionTimeout);
      setTimeRemaining(sessionTimeout);
    }

    // Start the timer
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        
        const newTime = prev - 1;
        
        // Show warning when 20% of time remains
        if (newTime <= sessionTimeout * 0.2 && newTime > 0 && !showWarning) {
          setShowWarning(true);
          toast({
            title: 'Session Expiring Soon',
            description: 'Your session is about to expire due to inactivity.',
            duration: 10000,
          });
        }
        
        // Handle session expiration
        if (newTime <= 0) {
          clearInterval(timer);
          handleSessionExpired();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    // Reset timer on user activity
    const resetTimer = () => {
      if (adminUser) {
        setTimeRemaining(sessionTimeout);
        setShowWarning(false);
      }
    };

    // Listen for user activity
    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Clean up
    return () => {
      clearInterval(timer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [adminUser, sessionTimeout, showWarning, toast]);

  // Handle session refresh button click
  const handleRefreshSession = async () => {
    try {
      await refreshSession();
      setTimeRemaining(sessionTimeout);
      setShowWarning(false);
      
      toast({
        title: 'Session Extended',
        description: 'Your session has been refreshed.',
      });
    } catch (error) {
      console.error('Failed to refresh session:', error);
      toast({
        title: 'Session Refresh Failed',
        description: 'Unable to extend your session. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle session expiration
  const handleSessionExpired = async () => {
    try {
      // Sign out the user
      await adminSignOut();
      
      // Show toast notification
      toast({
        title: 'Session Expired',
        description: 'Your session has expired due to inactivity.',
        variant: 'destructive',
      });
      
      // Redirect to login page
      setLocation('/admin-login');
    } catch (error) {
      console.error('Error handling session expiration:', error);
    }
  };

  // Don't render if no session or user
  if (!adminUser || timeRemaining === null) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium">Session timeout</div>
        <div 
          className={`text-sm ${showWarning ? 'text-red-500 font-bold animate-pulse' : ''}`}
        >
          {timeRemaining >= 0 ? formatTime(timeRemaining) : '00:00'}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Progress 
          value={progressPercentage} 
          className={`flex-1 ${showWarning ? 'bg-red-200' : ''}`}
          // Different colors based on remaining time
          style={{
            '--progress-background': showWarning ? 'rgb(254, 202, 202)' : '',
            '--progress-foreground': showWarning ? 'rgb(239, 68, 68)' : '',
          } as any}
        />
        
        <Button 
          size="icon"
          variant="outline"
          className="h-7 w-7 shrink-0"
          onClick={handleRefreshSession}
          title="Refresh Session"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}