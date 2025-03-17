import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { RoleDebugger } from '@/components/debug/RoleDebugger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Info, Settings, Shield, Users } from 'lucide-react';
import { VALID_USER_ROLES } from '@/lib/role-verification';

/**
 * Role Debug Page
 * 
 * This page provides tools for debugging role-based access control issues.
 * It shows detailed information about the user's authentication state,
 * role assignments, and provides tools to diagnose and fix common problems.
 * 
 * For development and administrative use only.
 */
export default function RoleDebugPage() {
  const { user, userRole } = useAuth();
  const [tokenData, setTokenData] = useState<any>(null);

  // Get Firebase token from localStorage on page load
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error('Firebase API key not found in environment variables');
      return;
    }
    
    const auth = localStorage.getItem(`firebase:authUser:${apiKey}`);
    if (auth) {
      try {
        const authData = JSON.parse(auth);
        if (authData.stsTokenManager?.accessToken) {
          const token = authData.stsTokenManager.accessToken;
          
          // Decode token to extract claims
          const decodedToken = decodeJwt(token);
          setTokenData(decodedToken);
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
  }, []);

  // Helper function to decode JWT token
  const decodeJwt = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return null;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Role Debugger</h1>
        </div>
        
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">
            Development Tool
          </Badge>
          
          {userRole && (
            <Badge variant="secondary">
              {userRole}
            </Badge>
          )}
        </div>
      </div>

      {!user && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Not authenticated</AlertTitle>
          <AlertDescription>
            You need to sign in to use the role debugger.
            <div className="mt-2">
              <Button asChild>
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {user && (
        <Tabs defaultValue="debugger" className="space-y-6">
          <TabsList>
            <TabsTrigger value="debugger">
              <Shield className="h-4 w-4 mr-2" />
              Role Debugger
            </TabsTrigger>
            <TabsTrigger value="token">
              <Settings className="h-4 w-4 mr-2" />
              Token Explorer
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Users className="h-4 w-4 mr-2" />
              Role Configuration
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="debugger" className="space-y-6">
            <RoleDebugger />
          </TabsContent>
          
          <TabsContent value="token" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Firebase Auth Token</CardTitle>
                <CardDescription>
                  Explore your current Firebase Authentication token and its claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tokenData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">General Information</h3>
                        <dl className="space-y-1">
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">User ID:</dt>
                            <dd className="text-sm">{tokenData.user_id || tokenData.sub || 'N/A'}</dd>
                          </div>
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">Email:</dt>
                            <dd className="text-sm">{tokenData.email || 'N/A'}</dd>
                          </div>
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">Role:</dt>
                            <dd className="text-sm">{tokenData.role || 'Not set'}</dd>
                          </div>
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">Issued at:</dt>
                            <dd className="text-sm">{formatTimestamp(tokenData.iat)}</dd>
                          </div>
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">Expires:</dt>
                            <dd className="text-sm">{formatTimestamp(tokenData.exp)}</dd>
                          </div>
                        </dl>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Verification</h3>
                        <dl className="space-y-1">
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">Email verified:</dt>
                            <dd className="text-sm">{tokenData.email_verified ? 'Yes' : 'No'}</dd>
                          </div>
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">Auth time:</dt>
                            <dd className="text-sm">{formatTimestamp(tokenData.auth_time)}</dd>
                          </div>
                          <div className="flex">
                            <dt className="w-32 font-medium text-sm">Valid role:</dt>
                            <dd className="text-sm">
                              {tokenData.role && VALID_USER_ROLES.includes(tokenData.role) 
                                ? 'Yes' 
                                : 'No - invalid role format'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Raw Token Claims</h3>
                      <div className="bg-muted p-3 rounded-md overflow-auto max-h-64">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(tokenData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-muted-foreground">No token data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Configuration</CardTitle>
                <CardDescription>
                  Overview of the role-based access control system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h3 className="text-sm font-medium mb-2">Available Roles</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center mb-2">
                      <Badge>consumer</Badge>
                      <span className="ml-2 text-sm font-medium">Customer Role</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Standard user role for customers who browse and book yachts. Has access to consumer dashboard,
                      wishlist, bookings, and profile management.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center mb-2">
                      <Badge>producer</Badge>
                      <span className="ml-2 text-sm font-medium">Yacht Owner/Provider Role</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Role for yacht owners and experience providers. Can manage yacht listings, bookings,
                      and view analytics in the producer dashboard.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center mb-2">
                      <Badge>partner</Badge>
                      <span className="ml-2 text-sm font-medium">Partner/Add-on Provider Role</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Role for service partners who provide add-ons for yacht experiences. 
                      Has access to the partner dashboard and add-on management.
                    </p>
                  </div>
                </div>
                
                <h3 className="text-sm font-medium mt-6 mb-2">Role Determination Process</h3>
                <ol className="space-y-2 list-decimal list-inside text-sm">
                  <li>Firebase Auth custom claims are the primary source of role information</li>
                  <li>The <code>role</code> claim is set when a user registers or changes roles</li>
                  <li>If Auth claims are missing or invalid, the application attempts to sync with Firestore</li>
                  <li>Firestore collection <code>harmonized_users</code> contains the definitive role</li>
                  <li>Role validation occurs during login, route changes, and other key events</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

import { Badge } from '@/components/ui/badge';