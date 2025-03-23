import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { collectionRefs } from "@/lib/firestore-init";
import { UserRole, UserRoleType, UserType, standardizeUser } from "@shared/user-schema";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`Login component: Attempting login for email: ${data.email}`);
      
      // Use the Firebase helper directly for consistent behavior
      const { loginWithEmail } = await import('@/lib/firebase');
      
      // Perform login
      const userCredential = await loginWithEmail(data.email, data.password);
      
      // Verify we have a user
      if (!userCredential || !userCredential.user) {
        throw new Error('Login returned invalid user data');
      }
      
      console.log(`Login component: Successfully logged in user: ${userCredential.user.uid}`);
      
      // Show success toast to user
      toast({
        title: "Logged in successfully",
        description: "Redirecting to your dashboard...",
        duration: 2000,
      });
      
      // Get user profile to determine the correct role and dashboard
      try {
        // Get user profile from Firestore to determine the role
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        
        // Log detailed info for debugging the login flow
        console.log(`Login component: User profile data:`, {
          exists: userDoc.exists(),
          role: userData?.role || 'No role found in profile',
          userId: userCredential.user.uid,
        });
        
        // Normalize the role to lowercase to handle legacy data
        const userRole = userData?.role?.toLowerCase() || 'consumer';
        
        // Also check auth claims for comparison
        const tokenResult = await userCredential.user.getIdTokenResult(true);
        const claimRole = tokenResult.claims.role as string | undefined;
        
        console.log(`Login component: Role in token claims: "${claimRole}", Role in profile: "${userRole}"`);
        
        // If roles don't match, sync them
        if (claimRole !== userRole) {
          console.log(`Login component: Role mismatch detected between claims and profile`);
          
          // Call sync API endpoint to update claims
          try {
            const syncResponse = await fetch('/api/user/sync-auth-claims', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await userCredential.user.getIdToken()}`
              }
            });
            
            if (syncResponse.ok) {
              console.log('Login component: Successfully synchronized user roles');
              
              // Force token refresh to get updated claims
              await userCredential.user.getIdToken(true);
            } else {
              console.warn('Login component: Failed to synchronize roles');
            }
          } catch (syncError) {
            console.error('Login component: Error synchronizing roles:', syncError);
          }
        }
        
        // Determine the dashboard URL based on role
        let dashboardUrl = '/dashboard/consumer'; // Default
        
        switch (userRole) {
          case 'producer':
            dashboardUrl = '/dashboard/producer';
            break;
          case 'partner':
            dashboardUrl = '/dashboard/partner';
            break;
          case 'consumer':
          default:
            dashboardUrl = '/dashboard/consumer';
            break;
        }
        
        console.log(`Login component: Redirecting user to dashboard: ${dashboardUrl}`);
        
        // Use a timeout to ensure the toast is visible before redirecting
        setTimeout(() => {
          setLocation(dashboardUrl);
        }, 1000);
        
      } catch (profileError) {
        console.error('Login component: Error loading user profile:', profileError);
        
        // Default to consumer dashboard if we can't determine the role
        console.log('Login component: Defaulting to consumer dashboard due to profile error');
        
        // Use a timeout to ensure the toast is visible before redirecting
        setTimeout(() => {
          setLocation('/dashboard/consumer');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Login component: Login error:', error);
      setError(error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues("email");
    if (!email || !z.string().email().safeParse(email).success) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      setIsResettingPassword(true);
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password reset email sent",
        description: "Please check your email for instructions to reset your password",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div 
        className="h-64 bg-cover bg-center relative mb-8"
        style={{ 
          backgroundImage: 'url("/yacht-hero.jpg")',
          backgroundPosition: 'center 70%'
        }}
      >
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4 text-center">
          <h1 className="text-4xl font-bold mb-2">Welcome Back to Etoile Yachts</h1>
          <p className="text-lg max-w-2xl">
            Experience luxury water sports, integrated packages, and hybrid adventures
          </p>
        </div>
      </div>

      <div className="container max-w-md mx-auto px-4 pb-16">
        <Card>
          <CardHeader>
            <CardTitle>Login to Etoile Yachts</CardTitle>
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
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                        />
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
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-primary"
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending reset email...
                    </>
                  ) : (
                    "Forgot Password?"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline">
                    Sign up here
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}