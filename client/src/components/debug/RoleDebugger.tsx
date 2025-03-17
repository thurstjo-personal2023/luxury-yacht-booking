import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { syncAuthClaims, RoleSyncResponse, VALID_USER_ROLES } from '@/lib/role-verification';
import { useToast } from '@/hooks/use-toast';

interface TokenData {
  exp?: number;
  iat?: number;
  auth_time?: number;
  role?: string;
  [key: string]: any;
}

/**
 * Role Debugger Component
 * 
 * This component displays detailed information about the user's authentication state
 * and role assignments, with functionality to sync roles between Firestore and Auth.
 * 
 * For development and troubleshooting purposes.
 */
export function RoleDebugger() {
  const { user, userRole } = useAuth();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [syncingRole, setSyncingRole] = useState(false);
  const [syncResult, setSyncResult] = useState<RoleSyncResponse | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Parse an auth token to extract its payload
  const decodeJwt = (token: string): TokenData => {
    try {
      // Extract the payload part of the JWT (second part)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode JWT token:', e);
      return { error: 'Invalid token format' };
    }
  };

  // Get the current Firebase Auth token
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Only try to get token if user is logged in
    if (!user) {
      setTokenData(null);
      setAuthToken(null);
      return;
    }
    
    // Find auth token from local storage
    const auth = localStorage.getItem('firebase:authUser:' + import.meta.env.VITE_FIREBASE_API_KEY);
    if (auth) {
      try {
        const authData = JSON.parse(auth);
        if (authData.stsTokenManager?.accessToken) {
          const token = authData.stsTokenManager.accessToken;
          setAuthToken(token);
          const decoded = decodeJwt(token);
          setTokenData(decoded);
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
  }, [user, syncResult]);

  // Handle role sync
  const handleSyncRole = async () => {
    if (syncingRole) return;
    
    setSyncingRole(true);
    setSyncResult(null);
    
    try {
      const result = await syncAuthClaims();
      setSyncResult(result);
      
      if (result.success) {
        toast({
          title: "Role synchronized",
          description: result.message || "Your role has been synchronized successfully.",
          variant: "default",
        });
        
        // If token refresh is needed, prompt user to refresh the page
        if (result.refreshToken) {
          toast({
            title: "Token refresh needed",
            description: "Please refresh the page to apply your updated role.",
            variant: "destructive",
            duration: 10000,
          });
        }
      } else {
        toast({
          title: "Role sync failed",
          description: result.message || result.error || "Failed to synchronize role.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error syncing role:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while syncing your role.",
        variant: "destructive",
      });
    } finally {
      setSyncingRole(false);
    }
  };
  
  // Format a timestamp for display
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };
  
  // Get expiration time for token
  const getExpirationTime = (exp?: number) => {
    if (!exp) return 'N/A';
    
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = exp - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    // Format as minutes and seconds
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  // Determine if role is valid
  const isRoleValid = (role?: string) => {
    if (!role) return false;
    return VALID_USER_ROLES.includes(role as any);
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto mb-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldAlert className="mr-2 h-5 w-5 text-amber-500" />
          Role Debugger
        </CardTitle>
        <CardDescription>
          Troubleshoot authentication and role-based access control issues
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Alert if token and context roles don't match */}
        {tokenData?.role && userRole && tokenData.role !== userRole && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Role Mismatch Detected</AlertTitle>
            <AlertDescription>
              Your Firebase Auth token has role <Badge variant="outline">{tokenData.role}</Badge> but 
              the application context is using <Badge variant="outline">{userRole}</Badge>.
              This can cause unexpected behavior. Try syncing your role or refreshing the page.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Auth status overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Authentication Status</h3>
            <div className="flex items-center text-sm">
              <span className="font-medium mr-2">User:</span>
              <span>{user ? user.email || user.uid : 'Not authenticated'}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <span className="font-medium mr-2">Auth Context Role:</span>
              {userRole ? (
                <Badge variant={isRoleValid(userRole) ? "outline" : "destructive"}>
                  {isRoleValid(userRole) ? (
                    <ShieldCheck className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <ShieldAlert className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  {userRole}
                </Badge>
              ) : (
                <Badge variant="secondary">None</Badge>
              )}
            </div>
            
            <div className="flex items-center text-sm">
              <span className="font-medium mr-2">Token Role Claim:</span>
              {tokenData?.role ? (
                <Badge variant={isRoleValid(tokenData.role) ? "outline" : "destructive"}>
                  {isRoleValid(tokenData.role) ? (
                    <ShieldCheck className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <ShieldAlert className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  {tokenData.role}
                </Badge>
              ) : (
                <Badge variant="secondary">None</Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Token Information</h3>
            {tokenData ? (
              <>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Expires:</span>
                  <span>{getExpirationTime(tokenData?.exp)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Issued:</span>
                  <span>{formatTimestamp(tokenData?.iat)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Auth Time:</span>
                  <span>{formatTimestamp(tokenData?.auth_time)}</span>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No token data available</span>
            )}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {/* Sync button */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Role Synchronization</h3>
            <p className="text-xs text-muted-foreground">
              Sync your role between Firestore and Firebase Auth custom claims
            </p>
          </div>
          <Button 
            onClick={handleSyncRole}
            disabled={syncingRole || !user}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncingRole ? 'animate-spin' : ''}`} />
            {syncingRole ? 'Syncing...' : 'Sync Role'}
          </Button>
        </div>
        
        {/* Sync result */}
        {syncResult && (
          <Alert variant={syncResult.success ? "default" : "destructive"} className="mb-4">
            {syncResult.success ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{syncResult.success ? 'Sync Successful' : 'Sync Failed'}</AlertTitle>
            <AlertDescription>
              {syncResult.message || syncResult.error}
              {syncResult.refreshToken && (
                <div className="mt-2 font-medium">
                  Please refresh the page to apply your updated role.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Technical details accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="token-details">
            <AccordionTrigger className="text-sm">
              Advanced Token Details
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted p-3 rounded-md overflow-auto max-h-64">
                <pre className="text-xs whitespace-pre-wrap">
                  {tokenData ? JSON.stringify(tokenData, null, 2) : 'No token data available'}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}