import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Phone } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';

// Define phone number schema - Valid UAE numbers
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
 * Phone Verification Page Component
 * 
 * This component handles the phone verification process for new administrators
 * It uses Firebase Phone Auth with reCAPTCHA for secure verification
 */
const PhoneVerificationPage: React.FC = () => {
  // State
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  
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
  
  // Check if user is logged in and verification status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(false);
      
      if (!currentUser) {
        // No user is signed in, redirect to login
        navigate('/admin/login');
        return;
      }
      
      // If email is not verified, go back to email verification
      if (!currentUser.emailVerified) {
        navigate('/admin/verify-email');
        return;
      }
      
      setUser(currentUser);
      
      try {
        // Check if phone is already verified
        const response = await axios.get(`/api/admin/profile/${currentUser.uid}`);
        
        if (response.data.isPhoneVerified) {
          setVerificationComplete(true);
          // Redirect to pending approval page after a delay
          setTimeout(() => {
            navigate('/admin/pending-approval');
          }, 2000);
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
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
  }, [auth, navigate, recaptchaVerifier]);
  
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
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier
      );
      
      setVerificationId(verificationId);
      
      toast({
        title: 'OTP Sent',
        description: `Verification code sent to ${phoneNumber}`,
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
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
    
    setVerifyingOtp(true);
    setErrorMessage(null);
    
    try {
      // Create credential with the verification ID and OTP
      const credential = PhoneAuthProvider.credential(verificationId, data.otp);
      
      // Link the credential to the current user
      await linkWithCredential(user, credential);
      
      // Update admin profile to mark phone as verified
      await axios.post('/api/admin/update-verification-status', {
        uid: user.uid,
        isPhoneVerified: true,
        phoneNumber: phoneForm.getValues('phoneNumber'),
      });
      
      setVerificationComplete(true);
      
      toast({
        title: 'Phone Verified',
        description: 'Your phone number has been successfully verified',
      });
      
      // Redirect to pending approval page after a delay
      setTimeout(() => {
        navigate('/admin/pending-approval');
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
        title: 'Verification Failed',
        description: 'Failed to verify phone number',
        variant: 'destructive',
      });
    } finally {
      setVerifyingOtp(false);
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
              You need to be logged in to verify your phone number
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
  
  // Render verification complete UI
  if (verificationComplete) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Phone Verification</CardTitle>
            <CardDescription>
              Verify your phone number to continue the registration process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-medium text-green-600">Your phone number has been verified!</p>
              <p className="text-sm text-muted-foreground">
                You'll be redirected to the next step automatically...
              </p>
              <Spinner size="sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render phone verification UI
  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Phone Verification</CardTitle>
          <CardDescription>
            Verify your phone number to continue the registration process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!verificationId ? (
            // Step 1: Enter phone number
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
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
                  <p>Please enter your phone number in international format (e.g. +971 50 123 4567).</p>
                </div>
                
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                
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
                
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyingOtp}
                >
                  {verifyingOtp ? <Spinner className="mr-2" size="sm" /> : null}
                  {verifyingOtp ? 'Verifying...' : 'Verify Code'}
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
            Sign out and start over
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PhoneVerificationPage;