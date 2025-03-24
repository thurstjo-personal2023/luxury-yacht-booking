import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { getAuth, onAuthStateChanged, signOut, PhoneAuthProvider, PhoneMultiFactorGenerator, multiFactor } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertTriangle, Phone } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RecaptchaVerifier } from 'firebase/auth';
import { getVerificationStatus, getNextVerificationStep, updateMfaStatus } from '@/services/admin/verification-service';

// Define phone number schema
const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .min(9, { message: 'Phone number must have at least 9 digits' })
    .max(15, { message: 'Phone number must have at most 15 digits' })
    .regex(/^\+?[0-9]+$/, { message: 'Phone number must contain only digits and an optional + prefix' })
});

const otpSchema = z.object({
  otp: z
    .string()
    .min(6, { message: 'OTP must be at least 6 digits' })
    .max(6, { message: 'OTP must be exactly 6 digits' })
    .regex(/^[0-9]+$/, { message: 'OTP must contain only digits' })
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

/**
 * MFA Setup Page Component
 * 
 * This component handles the Multi-Factor Authentication setup process for new administrators
 * It uses Firebase MFA with phone authentication
 */
const MfaSetupPage: React.FC = () => {
  // Get UID from URL params
  const params = useParams<{ uid: string }>();
  const uid = params?.uid;
  
  // State
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [status, setStatus] = useState<any>(null);
  
  // Get auth from Firebase
  const auth = getAuth();
  
  // Phone form setup
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });
  
  // OTP form setup
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });
  
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
        if (currentUser.multiFactor?.enrolledFactors?.length > 0) {
          // Update the status in backend to reflect MFA is set up
          await updateMfaStatus(currentUser.uid, true);
          
          setSetupComplete(true);
          // Redirect to dashboard after a delay
          setTimeout(() => {
            navigate('/admin-dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking MFA status:', error);
        setErrorMessage('Failed to check MFA status. Please try reloading the page.');
      }
    });
    
    // Set up reCAPTCHA verifier
    if (!recaptchaVerifier && typeof window !== 'undefined') {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          // reCAPTCHA solved, allow sending OTP
          setSendingOtp(false);
        },
        'expired-callback': () => {
          // Reset the reCAPTCHA
          setErrorMessage('reCAPTCHA has expired. Please refresh the page and try again.');
        }
      });
      
      setRecaptchaVerifier(verifier);
    }
    
    // Cleanup function
    return () => {
      unsubscribe();
      recaptchaVerifier?.clear();
    };
  }, [auth, navigate, uid]);
  
  // Handle phone number submission
  const onPhoneSubmit = async (data: PhoneFormValues) => {
    if (!user || !recaptchaVerifier) return;
    
    // Format phone number if needed
    let phoneNumber = data.phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      // Assume UAE number if no country code
      phoneNumber = '+971' + phoneNumber.replace(/^0+/, '');
    }
    
    setSendingOtp(true);
    setErrorMessage(null);
    
    try {
      // Start enrolling a new second factor with a phone number
      const session = await user.multiFactor.getSession();
      
      // Specify the phone number and pass the verification ID
      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: session
      };
      
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        recaptchaVerifier
      );
      
      setVerificationId(verificationId);
      
      toast({
        title: 'Verification Code Sent',
        description: `We've sent a code to ${phoneNumber}`,
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      // Handle specific errors
      if (error.code === 'auth/invalid-phone-number') {
        setErrorMessage('Invalid phone number format. Please enter a valid phone number.');
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMessage('Too many requests. Please try again later.');
      } else {
        setErrorMessage(error.message || 'Failed to send verification code');
      }
      
      toast({
        title: 'Error',
        description: 'Failed to send verification code',
        variant: 'destructive',
      });
      
      // Reset reCAPTCHA
      recaptchaVerifier.clear();
      const newVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          setSendingOtp(false);
        },
        'expired-callback': () => {
          setErrorMessage('reCAPTCHA has expired. Please refresh the page and try again.');
        }
      });
      setRecaptchaVerifier(newVerifier);
    } finally {
      setSendingOtp(false);
    }
  };
  
  // Handle OTP verification
  const onOtpSubmit = async (data: OtpFormValues) => {
    if (!user || !verificationId) return;
    
    setVerifying(true);
    setErrorMessage(null);
    
    try {
      // Create the credential using the verification ID and OTP
      const cred = PhoneAuthProvider.credential(verificationId, data.otp);
      
      // Complete enrollment of the second factor with the verification credential
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await user.multiFactor.enroll(multiFactorAssertion, "Mobile Phone");
      
      // Update MFA status in the backend
      await updateMfaStatus(user.uid, true);
      
      setSetupComplete(true);
      
      toast({
        title: 'MFA Setup Complete',
        description: 'Multi-Factor Authentication has been successfully set up',
      });
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/admin-dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      // Handle specific errors
      if (error.code === 'auth/invalid-verification-code') {
        setErrorMessage('Invalid verification code. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        setErrorMessage('Verification code has expired. Please request a new one.');
        setVerificationId(null);
      } else {
        setErrorMessage(error.message || 'Failed to verify code');
      }
      
      toast({
        title: 'Setup Failed',
        description: 'Failed to set up Multi-Factor Authentication',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
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
  
  // Handle retry
  const handleRetry = () => {
    setVerificationId(null);
    setErrorMessage(null);
    
    // Reset reCAPTCHA
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      const newVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          setSendingOtp(false);
        },
        'expired-callback': () => {
          setErrorMessage('reCAPTCHA has expired. Please refresh the page and try again.');
        }
      });
      setRecaptchaVerifier(newVerifier);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading MFA setup...</p>
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
              <CheckCircle className="h-12 w-12 text-green-500" />
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
  
  // Render MFA setup UI
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
                Multi-Factor Authentication (MFA) requires you to verify your identity using your phone 
                when signing in, protecting your account even if your password is compromised.
              </p>
            </AlertDescription>
          </Alert>
          
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {!verificationId ? (
            // Step 1: Enter phone number
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number for Authentication</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+971 50 123 4567" 
                          {...field}
                          type="tel" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-sm text-muted-foreground">
                  <p>Enter your phone number in international format (e.g. +971 50 123 4567). This will be used for verification when you sign in.</p>
                </div>
                
                <div id="recaptcha-container" className="flex justify-center py-2"></div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendingOtp}
                >
                  {sendingOtp ? <Spinner className="mr-2" size="sm" /> : <Phone className="mr-2 h-4 w-4" />}
                  {sendingOtp ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </form>
            </Form>
          ) : (
            // Step 2: Enter OTP
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456" 
                          {...field}
                          type="text"
                          maxLength={6}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-sm text-muted-foreground">
                  <p>Enter the 6-digit code sent to your phone number.</p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifying}
                >
                  {verifying ? <Spinner className="mr-2" size="sm" /> : <Shield className="mr-2 h-4 w-4" />}
                  {verifying ? 'Verifying...' : 'Verify and Enable MFA'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleRetry}
                >
                  Try with a different number
                </Button>
              </form>
            </Form>
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

export default MfaSetupPage;