import { useState, useEffect } from 'react';
import { useNavigate } from 'wouter';
import { getAuth, PhoneAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Shield, Smartphone } from 'lucide-react';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Form schemas for MFA setup
const phoneSchema = z.object({
  phoneNumber: z.string()
    .min(10, { message: 'Phone number must have at least 10 digits' })
    .refine((value) => /^\+?[0-9\s-()]+$/.test(value), {
      message: 'Please enter a valid phone number',
    }),
});

const otpSchema = z.object({
  otp: z.string()
    .min(6, { message: 'OTP must have at least 6 digits' })
    .max(8, { message: 'OTP cannot be longer than 8 digits' })
    .refine((value) => /^[0-9]+$/.test(value), {
      message: 'OTP must contain numbers only',
    }),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export default function MfaSetup() {
  const [method, setMethod] = useState<'phone' | 'totp'>('phone');
  const [step, setStep] = useState<'select_method' | 'phone_setup' | 'verify_otp'>('select_method');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = getAuth();

  // Forms for different steps
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    // Don't initialize until we're at the phone setup step
    if (step !== 'phone_setup') return;
    
    try {
      // Clean up any existing verifier to avoid duplicates
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
      
      // Create a new instance
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          // reCAPTCHA solved, allow sending OTP
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          // Reset the reCAPTCHA
          console.log('reCAPTCHA expired');
          toast({
            title: 'reCAPTCHA expired',
            description: 'Please solve the reCAPTCHA again.',
            variant: 'destructive',
          });
        },
      });
      
      setRecaptchaVerifier(verifier);
      
      // Clean up on unmount
      return () => {
        verifier.clear();
      };
    } catch (err) {
      console.error('Error initializing reCAPTCHA:', err);
      setError('Could not initialize security verification. Please try again.');
    }
  }, [auth, step, toast]);

  // Handle method selection
  const handleMethodSelect = (selectedMethod: 'phone' | 'totp') => {
    setMethod(selectedMethod);
    setStep(selectedMethod === 'phone' ? 'phone_setup' : 'select_method');
    setError(null);
    
    if (selectedMethod === 'totp') {
      toast({
        title: 'Authenticator App Setup',
        description: 'This feature will be available soon. Please use phone verification for now.',
      });
      // For now, stay with phone method
      setMethod('phone');
      setStep('phone_setup');
    }
  };

  // Handle phone number submission
  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!recaptchaVerifier) {
        throw new Error('Security verification not initialized');
      }
      
      // Format phone number if it doesn't start with +
      let formattedPhone = data.phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        // Default to US country code if none provided
        formattedPhone = '+1' + formattedPhone.replace(/[^0-9]/g, '');
      }
      
      // Send verification code
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        recaptchaVerifier
      );
      
      // Store verification ID for the next step
      setVerificationId(confirmationResult.verificationId);
      
      // Move to OTP verification step
      setStep('verify_otp');
      
      toast({
        title: 'Verification Code Sent',
        description: `A verification code has been sent to ${formattedPhone}`,
      });
    } catch (err) {
      console.error('Error sending verification code:', err);
      setError('Failed to send verification code. Please check the phone number and try again.');
      
      // Reset reCAPTCHA if there was an error
      recaptchaVerifier?.clear();
      setRecaptchaVerifier(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const onOtpSubmit = async (data: OtpFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!verificationId) {
        throw new Error('Verification ID not found');
      }
      
      // Create credential from verification ID and OTP
      const credential = PhoneAuthProvider.credential(verificationId, data.otp);
      
      // Link the phone credential to the current user
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }
      
      await user.linkWithCredential(credential);
      
      // Update MFA status through our API
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/setup-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to update MFA status');
      }
      
      // MFA setup complete
      toast({
        title: 'MFA Setup Complete',
        description: 'Multi-factor authentication has been successfully enabled for your account.',
      });
      
      // Navigate to admin dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Error verifying OTP:', err);
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

  // Handle back button
  const handleBack = () => {
    if (step === 'verify_otp') {
      setStep('phone_setup');
    } else if (step === 'phone_setup') {
      setStep('select_method');
    }
    setError(null);
  };

  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 'select_method':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Set Up Two-Factor Authentication</CardTitle>
              <CardDescription className="text-center">
                Choose your preferred method for two-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <RadioGroup defaultValue="phone" className="space-y-4">
                  <div className="flex items-center space-x-2 rounded-md border p-4 cursor-pointer hover:bg-accent"
                       onClick={() => handleMethodSelect('phone')}>
                    <RadioGroupItem value="phone" id="phone" />
                    <Label htmlFor="phone" className="flex-1 cursor-pointer">
                      <div className="font-semibold flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        SMS Verification
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Receive verification codes via SMS on your phone
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-4 cursor-pointer hover:bg-accent opacity-50"
                       onClick={() => {}}>
                    <RadioGroupItem value="totp" id="totp" disabled />
                    <Label htmlFor="totp" className="flex-1 cursor-pointer">
                      <div className="font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Authenticator App
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Use an authenticator app like Google Authenticator or Authy
                        <span className="ml-2 text-xs text-muted-foreground">(Coming soon)</span>
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
                
                <Button 
                  className="w-full mt-4" 
                  onClick={() => handleMethodSelect(method)}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </>
        );
      
      case 'phone_setup':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Set Up Phone Verification</CardTitle>
              <CardDescription className="text-center">
                Enter your phone number to receive verification codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-ring">
                            <Smartphone className="ml-2 h-5 w-5 text-muted-foreground" />
                            <Input 
                              placeholder="+1 (555) 123-4567" 
                              className="flex-1 border-0 focus-visible:ring-0" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* reCAPTCHA container */}
                  <div id="recaptcha-container" className="flex justify-center my-4"></div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Code'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </>
        );
      
      case 'verify_otp':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Verify Code</CardTitle>
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
                            className="text-center text-lg tracking-widest" 
                            {...field} 
                            maxLength={8}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg border-primary/10">
          {renderStep()}
          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-center text-muted-foreground">
              Multi-factor authentication adds an extra layer of security to your administrator account.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}