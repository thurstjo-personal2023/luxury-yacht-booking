import { useState } from 'react';
import { useNavigate } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { AlertCircle, Lock, Mail } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

// Login form schema with validation
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = getAuth();

  // Set up form with validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      // Sign in with Firebase auth
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // Get ID token result to check admin role
      const tokenResult = await user.getIdTokenResult();
      const role = tokenResult.claims.role;

      // Check if user is an admin
      // For now using the producer role as admin, can be changed later
      if (role !== 'admin' && role !== 'producer') {
        await auth.signOut();
        setError('This account does not have administrative privileges');
        setLoading(false);
        return;
      }

      // Check if MFA is required (will redirect to MFA verification)
      // This part will be implemented in the next phase
      
      // Temporary: Redirect to admin dashboard
      toast({
        title: 'Login Successful',
        description: 'Welcome to the admin dashboard.',
      });
      
      // Navigate to admin dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      let errorMessage = 'Failed to sign in';
      
      if (err instanceof Error) {
        // Parse Firebase error messages to be more user-friendly
        if (err.message.includes('auth/wrong-password') || err.message.includes('auth/user-not-found')) {
          errorMessage = 'Invalid email or password';
        } else if (err.message.includes('auth/too-many-requests')) {
          errorMessage = 'Too many failed login attempts. Please try again later.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Administrator Login</CardTitle>
            <CardDescription className="text-center">
              Secure access to the Etoile Yachts admin dashboard
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-ring">
                          <Mail className="ml-2 h-5 w-5 text-muted-foreground" />
                          <Input 
                            placeholder="admin@example.com" 
                            className="flex-1 border-0 focus-visible:ring-0" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-ring">
                          <Lock className="ml-2 h-5 w-5 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="flex-1 border-0 focus-visible:ring-0" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-center text-muted-foreground">
              This is a secure area. Unauthorized access attempts are monitored and logged.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}