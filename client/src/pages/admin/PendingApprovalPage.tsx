import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface ApprovalStatus {
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
  requestedAt?: Date;
  reviewedAt?: Date;
}

/**
 * Pending Approval Page Component
 * 
 * This component displays the approval status for new administrators
 * It handles the waiting period between verification and approval
 */
const PendingApprovalPage: React.FC = () => {
  // State
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Get auth from Firebase
  const auth = getAuth();
  
  // Check if user is logged in and approval status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(false);
      
      if (!currentUser) {
        // No user is signed in, redirect to login
        navigate('/admin-login');
        return;
      }
      
      // If email or phone is not verified, go back to verification
      if (!currentUser.emailVerified) {
        navigate(`/admin-email-verification/${currentUser.uid}`);
        return;
      }
      
      setUser(currentUser);
      
      // Check initial approval status
      await checkApprovalStatus(currentUser.uid);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [auth, navigate]);
  
  // Check approval status at intervals
  useEffect(() => {
    if (!user) return;
    
    // Initial check
    checkApprovalStatus(user.uid);
    
    // Set up interval to check status every 30 seconds
    const interval = setInterval(() => {
      checkApprovalStatus(user.uid);
    }, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [user]);
  
  // Function to check approval status
  const checkApprovalStatus = async (uid: string) => {
    setChecking(true);
    try {
      const response = await axios.get(`/api/admin/approval-status/${uid}`);
      
      setApprovalStatus(response.data);
      
      // If approved, redirect to MFA setup
      if (response.data.status === 'approved') {
        // Delay a bit so user can see the approved message
        setTimeout(() => {
          navigate(`/admin-mfa-setup/${user.uid}`);
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
      setErrorMessage('Failed to check approval status. Please try again later.');
    } finally {
      setChecking(false);
    }
  };
  
  // Manual check approval status button handler
  const handleManualCheck = () => {
    if (!user) return;
    checkApprovalStatus(user.uid);
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
  
  // Format date for display
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };
  
  // Format time elapsed
  const getTimeElapsed = (startDate: Date | string | undefined) => {
    if (!startDate) return 'N/A';
    
    const start = new Date(startDate).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - start) / (1000 * 60)); // minutes
    
    if (elapsed < 60) {
      return `${elapsed} minute${elapsed === 1 ? '' : 's'}`;
    } else if (elapsed < 1440) { // less than a day
      const hours = Math.floor(elapsed / 60);
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    } else {
      const days = Math.floor(elapsed / 1440);
      return `${days} day${days === 1 ? '' : 's'}`;
    }
  };
  
  // Calculate estimated wait time (fictional for now)
  const getEstimatedWaitTime = () => {
    return '1-2 business days';
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Checking approval status...</p>
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
              You need to be logged in to check your approval status
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
  
  // Render approval status UI
  return (
    <div className="container max-w-lg mx-auto py-10">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Administrator Approval</CardTitle>
          <CardDescription>
            Your account is pending approval by a Super Administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {approvalStatus?.status === 'pending' && (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="rounded-full bg-amber-100 p-3">
                <Clock className="h-10 w-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-medium">Approval Pending</h3>
              <p className="text-muted-foreground">
                Your administrator account is waiting for approval.
              </p>
              
              <div className="w-full space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground text-right">Submitted:</p>
                  <p>{formatDate(approvalStatus.requestedAt)}</p>
                  
                  <p className="text-muted-foreground text-right">Time elapsed:</p>
                  <p>{getTimeElapsed(approvalStatus.requestedAt)}</p>
                  
                  <p className="text-muted-foreground text-right">Estimated wait:</p>
                  <p>{getEstimatedWaitTime()}</p>
                </div>
                
                <Alert variant="default" className="bg-muted">
                  <AlertDescription>
                    <p className="text-sm">
                      A Super Administrator will review your account details. 
                      You'll receive an email notification once your account is approved.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManualCheck}
                  disabled={checking}
                >
                  {checking ? <Spinner className="mr-2" size="sm" /> : null}
                  {checking ? 'Checking...' : 'Check Status Now'}
                </Button>
              </div>
            </div>
          )}
          
          {approvalStatus?.status === 'approved' && (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-medium">Account Approved!</h3>
              <p className="text-muted-foreground">
                Your administrator account has been approved.
              </p>
              
              <div className="w-full space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground text-right">Approved by:</p>
                  <p>{approvalStatus.reviewedBy || 'N/A'}</p>
                  
                  <p className="text-muted-foreground text-right">Approved on:</p>
                  <p>{formatDate(approvalStatus.reviewedAt)}</p>
                </div>
                
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <AlertDescription>
                    <p className="text-sm">
                      You'll be redirected to set up Multi-Factor Authentication (MFA) for your account.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <Spinner className="mx-auto" />
                <p className="text-sm text-muted-foreground">Redirecting to MFA setup...</p>
              </div>
            </div>
          )}
          
          {approvalStatus?.status === 'rejected' && (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-xl font-medium">Account Rejected</h3>
              <p className="text-muted-foreground">
                Unfortunately, your administrator account request was not approved.
              </p>
              
              <div className="w-full space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground text-right">Reviewed by:</p>
                  <p>{approvalStatus.reviewedBy || 'N/A'}</p>
                  
                  <p className="text-muted-foreground text-right">Reviewed on:</p>
                  <p>{formatDate(approvalStatus.reviewedAt)}</p>
                </div>
                
                {approvalStatus.reviewNotes && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <div className="text-sm space-y-2">
                        <p className="font-medium">Rejection reason:</p>
                        <p>{approvalStatus.reviewNotes}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <p className="text-sm text-muted-foreground">
                  Please contact your supervisor or the IT department for further assistance.
                </p>
              </div>
            </div>
          )}
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

export default PendingApprovalPage;