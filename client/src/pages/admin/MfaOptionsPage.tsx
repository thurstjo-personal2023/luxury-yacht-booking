import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Smartphone, KeyRound } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getVerificationStatus, getNextVerificationStep } from '@/services/admin/verification-service';

// Import MFA setup components
import MfaSetupPage from './MfaSetupPage';
import AuthenticatorSetup from '@/components/admin/AuthenticatorSetup';

/**
 * MFA Options Page Component
 * 
 * This component allows administrators to choose between different MFA methods
 * - Phone-based MFA (SMS verification)
 * - Authenticator app MFA (TOTP)
 */
const MfaOptionsPage: React.FC = () => {
  // Get UID from URL params
  const params = useParams<{ uid: string }>();
  const uid = params?.uid;
  
  // State
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<string>('phone');
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Get auth from Firebase
  const auth = getAuth();
  
  // Check user status and MFA status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(false);
      
      if (!currentUser) {
        // No user is signed in, redirect to login
        navigate('/admin-login');
        return;
      }
      
      // If email is not verified, redirect to email verification
      if (!currentUser.emailVerified) {
        navigate(`/admin-email-verification/${currentUser.uid}`);
        return;
      }
      
      setUser(currentUser);
      
      try {
        // Get verification status to check if we should be on this page
        const verificationStatus = await getVerificationStatus(currentUser.uid);
        setStatus(verificationStatus);
        
        // Check if the user is approved and ready for MFA setup
        if (!verificationStatus.isApproved) {
          // Redirect to the correct verification step
          const nextStep = getNextVerificationStep(verificationStatus, currentUser.uid);
          navigate(nextStep);
          return;
        }
        
        // Check if MFA is already enabled
        if (verificationStatus.isMfaEnabled) {
          setSetupComplete(true);
          // Redirect to dashboard after a delay
          setTimeout(() => {
            navigate('/admin-dashboard');
          }, 2000);
          return;
        }
        
        // Check if the user already has multifactor auth enabled
        if ((currentUser as any).multiFactor?.enrolledFactors?.length > 0 || verificationStatus.totpMfaEnabled) {
          setSetupComplete(true);
          // Redirect to dashboard after a delay
          setTimeout(() => {
            navigate('/admin-dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking MFA status:', error);
        setError('Failed to check MFA status. Please try reloading the page.');
      }
    });
    
    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, [auth, navigate, uid]);
  
  // Handle MFA setup completion
  const handleMfaSetupComplete = (success: boolean) => {
    if (success) {
      setSetupComplete(true);
      toast({
        title: 'MFA Setup Complete',
        description: 'Multi-Factor Authentication has been successfully set up',
      });
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/admin-dashboard');
      }, 2000);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin-login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading MFA options...</p>
        </div>
      </div>
    );
  }
  
  // User not logged in
  if (!user) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to set up Multi-Factor Authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/admin-login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // MFA setup complete
  if (setupComplete) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">MFA Setup Complete</CardTitle>
            <CardDescription>
              Your account now has an additional layer of security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Shield className="h-12 w-12 text-green-500" />
              <p className="font-medium text-green-600">Multi-Factor Authentication is enabled!</p>
              <p className="text-sm text-muted-foreground">
                You'll be redirected to the admin dashboard...
              </p>
              <Spinner size="sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render MFA options UI
  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Set Up Multi-Factor Authentication</CardTitle>
          <CardDescription className="text-center">
            Add an extra layer of security to your administrator account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="default" className="bg-muted">
            <AlertDescription>
              <p className="text-sm">
                Multi-Factor Authentication (MFA) requires you to verify your identity through an additional 
                method when signing in, protecting your account even if your password is compromised.
              </p>
            </AlertDescription>
          </Alert>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="phone" onValueChange={setSelectedTab} value={selectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">
                <Smartphone className="mr-2 h-4 w-4" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="authenticator">
                <KeyRound className="mr-2 h-4 w-4" />
                Authenticator App
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="phone" className="pt-4">
              {/* Phone-based MFA */}
              {uid && <MfaSetupPage uid={uid} onComplete={handleMfaSetupComplete} />}
            </TabsContent>
            
            <TabsContent value="authenticator" className="pt-4">
              {/* Authenticator app MFA */}
              {uid && (
                <AuthenticatorSetup 
                  userId={uid} 
                  onComplete={handleMfaSetupComplete}
                  onCancel={() => setSelectedTab('phone')}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="ghost"
            className="text-sm"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MfaOptionsPage;