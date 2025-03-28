import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Info, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuthService } from "@/services/auth"; // Import our new auth service

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Use our new auth service hook
  const {
    isAuthenticated,
    isLoading,
    user,
    profileData,
    login,
    error,
    clearError
  } = useAuthService();
  
  // Get the harmonized user data from the profile data
  const harmonizedUser = profileData?.harmonizedUser;
  
  // Check if user is already logged in and redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user && harmonizedUser) {
      console.log("Login component: User already authenticated, redirecting to dashboard");
      
      // Extract the user role
      const role = harmonizedUser.role?.toLowerCase() || 'consumer';
      
      // Determine dashboard URL based on role
      let dashboardUrl = '/dashboard/consumer?tab=explore'; // Default
      
      switch (role) {
        case 'producer':
          dashboardUrl = '/dashboard/producer';
          break;
        case 'partner':
          dashboardUrl = '/dashboard/partner';
          break;
        case 'consumer':
        default:
          dashboardUrl = '/dashboard/consumer?tab=explore';
          break;
      }
      
      // Show success toast
      toast({
        title: "Already logged in",
        description: "Redirecting to your dashboard...",
        duration: 2000,
      });
      
      // Use a timeout to ensure the toast is visible before redirecting
      setTimeout(() => {
        setLocation(dashboardUrl);
      }, 1000);
    }
  }, [isAuthenticated, user, harmonizedUser, setLocation, toast]);
  
  // Set up the form with validation
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: LoginForm) => {
    try {
      console.log(`Login component: Attempting login for email: ${data.email}`);
      
      // Clear any previous errors
      clearError();
      
      // Use our auth service login method
      const user = await login(data.email, data.password);
      
      console.log(`Login component: Successfully logged in user: ${user.uid}`);
      
      // Note: We don't need to show a success toast here as the auth service already does
      // The auth service will also fetch the user profile, so we just need to redirect when we get it
    } catch (error: any) {
      console.error('Login component: Login error:', error);
      // Toast and error handling are already managed by the auth service
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
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login failed</AlertTitle>
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
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={togglePasswordVisibility}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up here
              </Link>
            </div>
            <div className="border rounded-md p-3 border-primary/20 bg-primary/5">
              <div className="flex gap-2 items-start">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  For technical support, contact <span className="font-semibold">support@etoileyachts.com</span>
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}