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

      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);

      if (!userCredential.user.emailVerified) {
        throw new Error("Please verify your email before logging in. Check your inbox for the verification link.");
      }

      // Get user profile from Firestore using the harmonized users collection
      // Add retry mechanism for getting user data
      let rawUserData = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!rawUserData && retryCount < maxRetries) {
        try {
          const userDoc = await getDoc(doc(collectionRefs.users, userCredential.user.uid));
          rawUserData = userDoc.data();
          
          if (!rawUserData && retryCount < maxRetries - 1) {
            console.log(`User data not found, retrying (${retryCount + 1}/${maxRetries})...`);
            // Wait before retry (increasing delay)
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          }
        } catch (fetchError) {
          console.error(`Error fetching user data (attempt ${retryCount + 1}/${maxRetries}):`, fetchError);
          if (retryCount < maxRetries - 1) {
            // Wait before retry (increasing delay)
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          }
        }
        retryCount++;
      }

      // Use fallback data if user profile not found, to prevent login failures
      if (!rawUserData) {
        console.warn("User profile not found in Firestore. Using minimal fallback profile with role from token.");
        
        // Get the role from token claims if available
        const tokenResult = await userCredential.user.getIdTokenResult();
        const tokenRole = (tokenResult.claims.role as string) || "consumer";
        
        console.log(`Using role from token claims for fallback profile: "${tokenRole}"`);
        
        rawUserData = {
          name: userCredential.user.displayName || "User",
          email: userCredential.user.email || "",
          role: tokenRole, // Use authenticated role from token instead of hardcoding "consumer"
          userId: userCredential.user.uid,
          phone: "",
          points: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: userCredential.user.emailVerified
        };
      }

      // Ensure consistent user schema by applying standardizeUser function
      const userData = standardizeUser({
        ...rawUserData, 
        id: userCredential.user.uid, 
        userId: userCredential.user.uid
      }) as UserType;

      // Log the standardized user data for debugging
      console.log("Successfully retrieved and standardized user profile:", userData);

      toast({
        title: "Logged in successfully",
        duration: 2000,
      });

      // Import the enhanced role verification utilities
      const { getDashboardUrlForRole, verifyUserRole } = await import('@/lib/role-verification');
      
      // Make sure role is lowercase for consistent lookup
      const userRole = (userData.role || "consumer").toLowerCase() as UserRoleType;
      
      // Verify the user's role against their expected role from Firestore
      console.log(`Verifying role before redirection: ${userRole}`);
      const roleVerification = await verifyUserRole(userRole);
      
      if (roleVerification.hasRole) {
        // Always use the verified role from the verification result for redirection
        // This is crucial - it ensures we use the authoritative role from the token
        const redirectRole = roleVerification.actualRole || userRole;
        
        // Check if there was a role mismatch
        if (roleVerification.actualRole && roleVerification.actualRole !== userRole) {
          console.log(`Role mismatch detected: Token has "${roleVerification.actualRole}" but profile had "${userRole}"`);
          console.log(`Using verified role from token: "${redirectRole}" for redirection`);
          
          // Notify user of the role change
          toast({
            title: "Role Updated",
            description: `Your role has been updated to ${redirectRole}`,
            duration: 3000,
          });
        } else {
          console.log(`Role verified (${redirectRole}), redirecting to appropriate dashboard`);
        }
        
        // Always redirect to the dashboard for the verified role
        setLocation(getDashboardUrlForRole(redirectRole));
      } else if (roleVerification.actualRole) {
        // If verification failed but we have an actual role, use that instead
        console.log(`Role verification failed, but found actual role: ${roleVerification.actualRole}`);
        console.log(`Redirecting to ${getDashboardUrlForRole(roleVerification.actualRole)} instead`);
        
        toast({
          title: "Role Mismatch",
          description: `Your role has been updated to ${roleVerification.actualRole}`,
          duration: 3000,
        });
        
        setLocation(getDashboardUrlForRole(roleVerification.actualRole));
      } else {
        // Fallback to consumer dashboard if no role could be verified
        console.warn("Could not verify any role, defaulting to consumer dashboard");
        setLocation(getDashboardUrlForRole("consumer"));
      }
    } catch (error: any) {
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