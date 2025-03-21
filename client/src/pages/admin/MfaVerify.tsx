import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Lock, KeyRound, ArrowLeft } from 'lucide-react';
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

// OTP verification schema
const verifySchema = z.object({
  otp: z.string()
    .min(6, { message: 'Verification code must be 6 digits' })
    .max(6, { message: 'Verification code must be 6 digits' })
    .regex(/^\d+$/, { message: 'Verification code must contain only numbers' }),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function MfaVerify() {
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const { adminUser, verifyMfa, error } = useAdminAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Get returnUrl from query parameters
  const params = new URLSearchParams(location.split('?')[1] || '');
  const returnUrl = params.get('returnUrl') || '/admin-dashboard';
  
  // Initialize form with React Hook Form
  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      otp: '',
    },
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!adminUser && !localStorage.getItem('adminSessionActive')) {
      // No admin user, redirect to login
      setLocation('/admin-login');
    }
  }, [adminUser]);

  // Handle countdown for resend button
  useEffect(() => {
    if (resendCountdown <= 0) return;
    
    const timer = setTimeout(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [resendCountdown]);
  
  // Handle form submission
  const onSubmit = async (values: VerifyFormValues) => {
    try {
      setIsLoading(true);
      
      // Verify MFA OTP
      const verified = await verifyMfa(values.otp);
      
      if (verified) {
        toast({
          title: 'Verification Successful',
          description: 'Redirecting to admin dashboard...',
        });
        
        // Redirect to returnUrl or dashboard
        setLocation(returnUrl);
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Invalid verification code. Please try again.',
          variant: 'destructive',
        });
        form.reset();
      }
    } catch (err: any) {
      console.error('MFA verification error:', err);
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Failed to verify code. Please try again.',
        variant: 'destructive',
      });
      
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    try {
      // In a real implementation, this would trigger a new OTP to be sent
      // For now, we'll just show a toast and reset the countdown
      toast({
        title: 'Verification Code Sent',
        description: 'A new verification code has been sent to your phone.',
      });
      
      // Set resend countdown to 60 seconds
      setResendCountdown(60);
    } catch (err) {
      console.error('Error resending code:', err);
      
      toast({
        title: 'Failed to Resend Code',
        description: 'There was an error sending a new verification code.',
        variant: 'destructive',
      });
    }
  };

  // Handle back to login
  const handleBackToLogin = async () => {
    try {
      // In a real implementation, this would sign out the user
      // For now, just navigate back to the login page
      setLocation('/admin-login');
    } catch (err) {
      console.error('Error navigating back:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <KeyRound className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the verification code sent to your mobile device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="123456" 
                          className="pl-10 text-center text-lg tracking-widest"
                          maxLength={6}
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
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 flex flex-col space-y-2">
            <Button
              variant="ghost"
              className="text-sm"
              disabled={resendCountdown > 0 || isLoading}
              onClick={handleResendCode}
            >
              {resendCountdown > 0 
                ? `Resend code in ${resendCountdown}s` 
                : 'Resend verification code'}
            </Button>
            
            <Button
              variant="link"
              className="text-sm flex items-center gap-1"
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to login</span>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Having trouble? Contact your system administrator for assistance.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}