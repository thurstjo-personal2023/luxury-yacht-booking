import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { verifyUserRole, isValidUserRole, VALID_USER_ROLES } from '@/lib/role-verification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, RefreshCw, Info, ShieldCheck, ShieldOff, Globe } from 'lucide-react';

/**
 * Role Debugger Component
 * 
 * This component provides a comprehensive view of the user's role status,
 * including claims from Firebase Auth, role in Firestore, and any mismatches
 * between the two. It also offers tools to manually sync roles and verify claims.
 */
export function RoleDebugger() {
  const { user, userRole, refreshUserRole } = useAuth();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState<Date | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [authClaims, setAuthClaims] = useState<any>(null);
  const [firestoreRole, setFirestoreRole] = useState<string | null>(null);
  const [hasMismatch, setHasMismatch] = useState<boolean>(false);
  
  // Fetch auth token claims and role status on component mount
  useEffect(() => {
    if (user) {
      fetchAuthClaims();
      verifyRoleStatus();
    }
  }, [user, userRole]);
  
  // Helper to fetch auth claims from token
  const fetchAuthClaims = async () => {
    try {
      const token = await user?.getIdTokenResult();
      
      if (token) {
        setAuthClaims({
          role: token.claims.role || null,
          emailVerified: token.claims.email_verified || false,
          exp: token.expirationTime,
          // Include other relevant claims here
        });
      }
    } catch (error) {
      console.error('Error fetching auth claims:', error);
    }
  };
  
  // Verify role status and check for mismatches
  const verifyRoleStatus = async () => {
    if (!user) return;
    
    setIsVerifying(true);
    
    try {
      // Call server endpoint to check role data
      const response = await fetch('/api/user/sync-auth-claims', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVerificationResult(data);
        setFirestoreRole(data.firestoreRole);
        setHasMismatch(data.mismatchDetected || false);
      } else {
        toast({
          title: "Verification failed",
          description: "Could not verify role status with server",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying role status:', error);
    } finally {
      setIsVerifying(false);
      setLastVerified(new Date());
    }
  };
  
  // Deep role verification using our enhanced verification logic
  const performDeepVerification = async () => {
    if (!user) return;
    
    setIsVerifying(true);
    
    try {
      // Use the enhanced verification utility
      const result = await verifyUserRole(userRole);
      
      setVerificationResult({
        ...verificationResult,
        deepVerification: result
      });
      
      // Update mismatch status
      if (result.hasRole === false) {
        setHasMismatch(true);
      }
      
      toast({
        title: result.hasRole ? "Role verified" : "Role verification failed",
        description: result.message || "Deep verification complete",
        variant: result.hasRole ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error in deep verification:', error);
      toast({
        title: "Verification error",
        description: "An error occurred during deep role verification",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
      setLastVerified(new Date());
    }
  };
  
  // Force a sync between Auth claims and Firestore
  const syncRoleWithFirestore = async () => {
    if (!user) return;
    
    setIsVerifying(true);
    
    try {
      // Call server endpoint to sync roles
      const response = await fetch('/api/user/sync-auth-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ forceSync: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: "Role sync complete",
          description: data.message || "Your role has been synchronized",
        });
        
        // Refresh token to get updated claims
        await user.getIdToken(true);
        
        // Update local state
        await refreshUserRole();
        await fetchAuthClaims();
        await verifyRoleStatus();
      } else {
        const errorData = await response.json();
        toast({
          title: "Sync failed",
          description: errorData.message || "Failed to sync role with Firestore",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error syncing role:', error);
      toast({
        title: "Sync error",
        description: "An error occurred while syncing your role",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
      setLastVerified(new Date());
    }
  };
  
  // Helper to determine role validity status
  const isRoleValid = (role: string | null | undefined): boolean => {
    if (!role) return false;
    return isValidUserRole(role);
  };
  
  // Helper for formatting timestamps
  const formatTimestamp = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };
  
  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Authentication required</AlertTitle>
        <AlertDescription>
          You need to be signed in to access the role debugger.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Role Status</CardTitle>
              <CardDescription>
                Current status of your user role across the application
              </CardDescription>
            </div>
            <Badge variant={hasMismatch ? "destructive" : "outline"}>
              {hasMismatch ? 'Mismatch Detected' : 'Status OK'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Role Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Firebase Auth</div>
                <div className="flex items-center">
                  {authClaims?.role ? (
                    <>
                      <Badge variant={isRoleValid(authClaims.role) ? "default" : "destructive"} className="mr-2">
                        {authClaims.role}
                      </Badge>
                      {isRoleValid(authClaims.role) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </>
                  ) : (
                    <Badge variant="outline">No role claim</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {authClaims?.exp 
                    ? `Token expires: ${new Date(authClaims.exp).toLocaleString()}`
                    : 'Token expiry information not available'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Firestore Database</div>
                <div className="flex items-center">
                  {firestoreRole ? (
                    <>
                      <Badge variant={isRoleValid(firestoreRole) ? "secondary" : "destructive"} className="mr-2">
                        {firestoreRole}
                      </Badge>
                      {isRoleValid(firestoreRole) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </>
                  ) : (
                    <Badge variant="outline">Role not found</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  From harmonized_users collection
                </div>
              </div>
            </div>
            
            {/* Application Status */}
            <div className="pt-2 border-t">
              <div className="text-sm font-medium mb-2">Application Status</div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">
                    useAuth() hook
                  </Badge>
                  {userRole ? (
                    <Badge variant={isRoleValid(userRole) ? "default" : "destructive"}>
                      {userRole}
                    </Badge>
                  ) : (
                    <Badge variant="outline">No role</Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Last verified: {formatTimestamp(lastVerified)}
                </div>
              </div>
            </div>
            
            {/* Consistency Check */}
            {authClaims && firestoreRole && (
              <div className="pt-2 border-t">
                <div className="text-sm font-medium mb-2">Consistency Check</div>
                <div className="flex items-center">
                  {authClaims.role === firestoreRole ? (
                    <div className="flex items-center text-green-600">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      <span className="text-sm">Auth claims and Firestore role are in sync</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <ShieldOff className="h-4 w-4 mr-2" />
                      <span className="text-sm">Mismatch detected between Auth claims and Firestore</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Valid Roles Information */}
            <div className="pt-2 border-t">
              <div className="text-sm font-medium mb-2">Valid Roles</div>
              <div className="flex flex-wrap gap-2">
                {VALID_USER_ROLES.map(role => (
                  <Badge key={role} variant={userRole === role ? "default" : "outline"}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Debug Information */}
            {verificationResult && (
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium">Debug Information</div>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-muted p-2 rounded-md overflow-auto max-h-32">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(verificationResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-xs text-muted-foreground flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            User ID: {user.uid}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={verifyRoleStatus} 
              disabled={isVerifying}
            >
              {isVerifying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Verify Status
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={performDeepVerification} 
              disabled={isVerifying}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Deep Verification
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={syncRoleWithFirestore} 
              disabled={isVerifying}
            >
              {isVerifying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Role
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}