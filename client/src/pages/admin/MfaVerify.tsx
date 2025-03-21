import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'wouter';
import { getAuth, PhoneAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, RotateCcw } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

// Schema for OTP verification
const otpSchema = z.object({
  otp: z.string()
    .min(6, { message: 'Verification code must have at least 6 digits' })
    .max(8, { message: 'Verification code cannot be longer than 8 digits' })
    .refine((value) => /^[0-9]+$/.test(value), {
      message: 'Verification code must contain numbers only',
    }),
});

type OtpFormValues = z.infer<typeof otpSchema>;

export default function MfaVerify() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [timer, setTimer] = useState(60); // 60 second countdown
  const [resendDisabled, setResendDisabled] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [location] = useLocation();
  const { toast } = useToast();
  const auth = getAuth();

  // Form for verification code
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Timer for resending code
  useEffect(() => {
    if (timer > 0 && resendDisabled) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (timer === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [timer, resendDisabled]);

  // Initialize reCAPTCHA verifier when component mounts
  useEffect(() => {
    try {
      // Clean up any existing verifier to avoid duplicates
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
      
      // Create a new instance
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          // reCAPTCHA solved
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          // Reset the reCAPTCHA
          console.log('reCAPTCHA expired');
        },
      });
      
      setRecaptchaVerifier(verifier);
      
      // Get associated phone number from current user
      const getPhoneNumber = async () => {
        const user = auth.currentUser;
        if (user && user.phoneNumber) {
          setPhoneNumber(user.phoneNumber);
          // Send initial verification code
          await sendVerificationCode(user.phoneNumber, verifier);
        } else {
          // If no phone number, go back to login
          toast({
            title: 'Error',
            description: 'No phone number found for this account',
            variant: 'destructive',
          });
          navigate('/admin-login');
        }
      };
      
      getPhoneNumber();
      
      // Clean up on unmount
      return () => {
        verifier.clear();
      };
    } catch (err) {
      console.error('Error initializing reCAPTCHA:', err);
      setError('Could not initialize security verification. Please try again.');
    }
  }, [auth, toast, navigate]);

  // Send verification code to phone
  const sendVerificationCode = async (phone: string, verifier: RecaptchaVerifier) => {
    setLoading(true);
    setError(null);
    
    try {
      // Send verification code
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        phone, 
        verifier
      );
      
      // Store verification ID
      setVerificationId(confirmationResult.verificationId);
      
      toast({
        title: 'Verification Code Sent',
        description: `A verification code has been sent to your phone`,
      });
      
      // Reset timer
      setTimer(60);
      setResendDisabled(true);
    } catch (err) {
      console.error('Error sending verification code:', err);
      setError('Failed to send verification code. Please try again.');
      
      // Reset reCAPTCHA if there was an error
      verifier.clear();
      setRecaptchaVerifier(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    if (!phoneNumber || !recaptchaVerifier || resendDisabled) return;
    
    await sendVerificationCode(phoneNumber, recaptchaVerifier);
  };

  // Handle verification code submission
  const onSubmit = async (data: OtpFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!verificationId) {
        throw new Error('Verification ID not found');
      }
      
      // Create credential from verification ID and OTP
      const credential = PhoneAuthProvider.credential(verificationId, data.otp);
      
      // Get current user
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }
      
      // Verify the code by linking it to the current user or signing in
      try {
        // For users who have already linked their phone, just verify the code
        await user.linkWithCredential(credential);
      } catch (err) {
        // If the phone is already linked, just continue
        if (err instanceof Error && err.message.includes('auth/credential-already-in-use')) {
          console.log('Phone already linked to account, continuing');
        } else {
          throw err;
        }
      }
      
      // Update last login timestamp through API
      const token = await user.getIdToken();
      await fetch('/api/admin/login-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }).catch(err => {
        console.error('Failed to update login audit:', err);
        // Non-critical error, so we don't need to block the login
      });
      
      // MFA verification complete
      toast({
        title: 'Verification Complete',
        description: 'You have been successfully authenticated.',
      });
      
      // Navigate to admin dashboard or the page they were trying to access
      const returnUrl = new URLSearchParams(location.split('?')[1]).get('returnUrl');
      navigate(returnUrl || '/admin/dashboard');
    } catch (err) {
      console.error('Error verifying code:', err);
      let errorMessage = 'Failed to verify code';
      
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-verification-code')) {
          errorMessage = 'Invalid verification code. Please try again.';
        } else if (err.message.includes('auth/code-expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle back to login
  const handleBackToLogin = async () => {
    try {
      // Sign out current user
      await auth.signOut();
      navigate('/admin-login');
    } catch (err) {
      console.error('Error signing out:', err);
      navigate('/admin-login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-center">
              Enter the verification code sent to your phone
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456" 
                          className="text-center text-lg tracking-widest" 
                          {...field} 
                          maxLength={8}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-muted-foreground">
                      {resendDisabled 
                        ? `Resend code in ${timer} seconds` 
                        : 'You can now resend the code'}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={resendDisabled || loading}
                      onClick={handleResendCode}
                      className="flex items-center gap-1 text-xs"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Resend
                    </Button>
                  </div>
                  {resendDisabled && (
                    <Progress value={(timer / 60) * 100} className="h-1" />
                  )}
                </div>
                
                {/* reCAPTCHA container */}
                <div id="recaptcha-container" className="flex justify-center my-4"></div>
                
                <div className="flex gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={handleBackToLogin} className="flex-1">
                    Back to Login
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-center text-muted-foreground">
              This additional verification step helps protect your administrator account.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}