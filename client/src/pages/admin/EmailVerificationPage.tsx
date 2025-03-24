import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getAuth, sendEmailVerification, onAuthStateChanged, signOut } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Email Verification Page Component
 * 
 * This component handles the email verification process for new administrators
 * It displays verification status and guides the user through the verification process
 */
const EmailVerificationPage: React.FC = () => {
  // State
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Get auth from Firebase
  const auth = getAuth();
  
  // Check if user is logged in and verification status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(false);
      
      if (!currentUser) {
        // No user is signed in, redirect to login
        navigate('/admin-login');
        return;
      }
      
      setUser(currentUser);
      
      // If user is already verified, proceed to next step
      if (currentUser.emailVerified) {
        try {
          // Update profile to reflect verified email status
          await fetch('/api/admin/update-verification-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: currentUser.uid,
              emailVerified: true,
            }),
          });
          
          // Continue to phone verification
          navigate('/admin/verify-phone');
        } catch (error) {
          console.error('Error updating verification status:', error);
          setErrorMessage('Failed to update verification status. Please try again.');
        }
      } else if (!verificationSent) {
        // Send verification email if not yet sent
        await handleSendVerificationEmail();
      }
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [auth, navigate]);
  
  // Check verification status at intervals
  useEffect(() => {
    if (!user || user.emailVerified) return;
    
    const checkVerificationStatus = async () => {
      setVerifying(true);
      try {
        // Force token refresh to get updated verification status
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          // Email has been verified, update state
          setUser({...user, emailVerified: true});
          
          // Update profile to reflect verified email status
          await fetch('/api/admin/update-verification-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: auth.currentUser.uid,
              emailVerified: true,
            }),
          });
          
          toast({
            title: 'Email Verified',
            description: 'Your email has been successfully verified',
          });
          
          // Continue to phone verification
          navigate('/admin/verify-phone');
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      } finally {
        setVerifying(false);
      }
    };
    
    // Check initially
    checkVerificationStatus();
    
    // Then check every 10 seconds
    const interval = setInterval(checkVerificationStatus, 10000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [user, auth, navigate]);
  
  // Handle sending verification email
  const handleSendVerificationEmail = async () => {
    if (!auth.currentUser || resending) return;
    
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox and click the verification link',
      });
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      setErrorMessage(
        error.message || 'Failed to send verification email. Please try again.'
      );
      toast({
        title: 'Error',
        description: 'Failed to send verification email',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
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
          <p className="mt-4 text-muted-foreground">Loading verification status...</p>
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
              You need to be logged in to verify your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/admin/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render verification UI
  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            Verify your email address to continue the registration process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.emailVerified ? (
            <div className="flex flex-col items-center text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-medium text-green-600">Your email has been verified!</p>
              <p className="text-sm text-muted-foreground">
                You'll be redirected to the next step automatically...
              </p>
              <Spinner size="sm" />
            </div>
          ) : (
            <>
              <Alert variant="default" className="bg-muted">
                <AlertDescription className="flex flex-col space-y-2">
                  <p>We've sent a verification email to:</p>
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm">
                    Please check your inbox and click the verification link to continue.
                  </p>
                </AlertDescription>
              </Alert>
              
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p>Didn't receive the email? Check your spam folder or click below to resend.</p>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendVerificationEmail}
                disabled={resending}
              >
                {resending ? <Spinner className="mr-2" size="sm" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Checking for verification...
                  {verifying && <Spinner className="ml-2 inline" size="sm" />}
                </p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="ghost"
            className="text-sm"
            onClick={handleSignOut}
          >
            Sign out and start over
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailVerificationPage;