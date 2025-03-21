import { useState, useEffect } from 'react';
import { useLocation, navigate } from 'wouter';
import { Shield, Smartphone, ArrowLeft } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/use-admin-auth';

// Setup verification schema
const phoneSchema = z.object({
  phone: z.string()
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .regex(/^\+?[0-9\s\-\(\)]+$/, { message: 'Please enter a valid phone number' }),
});

const otpSchema = z.object({
  otp: z.string()
    .min(6, { message: 'Verification code must be 6 digits' })
    .max(6, { message: 'Verification code must be 6 digits' })
    .regex(/^\d+$/, { message: 'Verification code must contain only numbers' }),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export default function MfaSetup() {
  const [stage, setStage] = useState<'phone' | 'verification'>('phone');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { adminUser, setupMfa, confirmMfaSetup, error } = useAdminAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Get returnUrl from query parameters
  const params = new URLSearchParams(location.split('?')[1] || '');
  const returnUrl = params.get('returnUrl') || '/admin-dashboard';
  
  // Initialize phone form with React Hook Form
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  });
  
  // Initialize OTP form with React Hook Form
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!adminUser && !localStorage.getItem('adminSessionActive')) {
      // No admin user, redirect to login
      navigate('/admin-login');
    }
  }, [adminUser]);
  
  // Handle phone form submission
  const onPhoneSubmit = async (values: PhoneFormValues) => {
    try {
      setIsLoading(true);
      
      // Call setupMfa from our auth hook
      const verId = await setupMfa(values.phone);
      
      // Store verification ID for the next step
      setVerificationId(verId);
      
      // Move to verification stage
      setStage('verification');
      
      toast({
        title: 'Verification Code Sent',
        description: 'A verification code has been sent to your phone.',
      });
    } catch (err: any) {
      console.error('MFA setup error:', err);
      
      toast({
        title: 'Setup Failed',
        description: err.message || 'Failed to send verification code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP form submission
  const onOtpSubmit = async (values: OtpFormValues) => {
    try {
      setIsLoading(true);
      
      // Call confirmMfaSetup from our auth hook
      const success = await confirmMfaSetup(values.otp);
      
      if (success) {
        toast({
          title: 'MFA Setup Complete',
          description: 'Two-factor authentication has been enabled for your account.',
        });
        
        // Redirect to returnUrl or dashboard
        navigate(returnUrl);
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Invalid verification code. Please try again.',
          variant: 'destructive',
        });
        otpForm.reset();
      }
    } catch (err: any) {
      console.error('MFA verification error:', err);
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Failed to verify code',
        variant: 'destructive',
      });
      
      otpForm.reset();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back to phone stage
  const handleBackToPhone = () => {
    setStage('phone');
    setVerificationId(null);
    otpForm.reset();
  };

  // Handle back to login
  const handleBackToLogin = async () => {
    try {
      // In a real implementation, this would sign out the user if MFA is required
      // For now, just navigate back to the login page
      navigate('/admin-login');
    } catch (err) {
      console.error('Error navigating back:', err);
    }
  };

  // Render phone input stage
  const renderPhoneStage = () => (
    <Form {...phoneForm}>
      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
        <FormField
          control={phoneForm.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="+1 (555) 123-4567" 
                    className="pl-10" 
                    disabled={isLoading}
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {error && (
          <div className="text-sm text-red-500 mt-2">
            {error}
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Verification Code'}
        </Button>
        
        <Button
          type="button"
          variant="link"
          className="w-full text-sm flex items-center justify-center gap-1"
          onClick={handleBackToLogin}
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to login</span>
        </Button>
      </form>
    </Form>
  );

  // Render OTP verification stage
  const renderVerificationStage = () => (
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
                  maxLength={6}
                  disabled={isLoading}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {error && (
          <div className="text-sm text-red-500 mt-2">
            {error}
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Verifying...' : 'Verify & Enable MFA'}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm"
          disabled={isLoading}
          onClick={handleBackToPhone}
        >
          Change phone number
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            {stage === 'phone' 
              ? 'Enter your phone number to receive verification codes' 
              : 'Enter the verification code sent to your phone'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === 'phone' ? renderPhoneStage() : renderVerificationStage()}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Two-factor authentication helps keep your account secure by requiring a second form of verification.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}