import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuthService } from "@/services/auth"; // Import our new auth service

/**
 * User role enum for registration
 */
enum UserRole {
  CONSUMER = "consumer",
  PRODUCER = "producer",
  PARTNER = "partner"
}

// Enhanced password validation
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
  phone: z.string().regex(phoneRegex, "Please enter a valid phone number"),
  role: z.nativeEnum(UserRole, {
    required_error: "Please select your role",
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

const roleDescriptions = {
  [UserRole.CONSUMER]: "Book luxury yachts and experiences",
  [UserRole.PRODUCER]: "List and manage your yacht services",
  [UserRole.PARTNER]: "Earn commissions through referrals",
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: authRegister, user, profileData } = useAuthService();
  const { harmonizedUser } = profileData;
  
  // Check if user is already logged in and redirect to appropriate dashboard
  useEffect(() => {
    if (user && harmonizedUser) {
      console.log("User already authenticated, redirecting to dashboard");
      const role = harmonizedUser.role?.toLowerCase() || 'consumer';
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
      
      setLocation(dashboardUrl);
    }
  }, [user, harmonizedUser, setLocation]);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      role: UserRole.CONSUMER,
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Register component: Starting registration process...");
      
      // Convert role enum to UserRoleType string
      const roleValue = data.role === UserRole.CONSUMER ? 'consumer' :
                        data.role === UserRole.PRODUCER ? 'producer' : 
                        'partner';
      
      // Full name for user profile
      const fullName = `${data.firstName} ${data.lastName}`;
      
      // Use our enhanced auth context's register method
      console.log(`Register component: Registering user with email ${data.email} and role ${roleValue}`);
      
      // Call auth context register method
      const user = await authRegister(
        data.email, 
        data.password, 
        fullName, 
        roleValue
      );
      
      console.log('Register component: Base registration successful, user created:', user.uid);
      
      // Show success toast
      toast({
        title: "Registration successful!",
        description: "Welcome to Etoile Yachts. Your account has been created.",
        duration: 3000,
      });
      
      // Import service to update additional profile details
      try {
        const { updateUserProfile } = await import('@/services/user-profile-service');
        
        // Update additional profile details
        await updateUserProfile({
          userId: user.uid,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: roleValue,
          businessName: data.role !== UserRole.CONSUMER ? `${data.firstName} ${data.lastName}'s Business` : undefined
        });
        
        console.log("Register component: Successfully updated additional profile details");
      } catch (profileError) {
        console.warn("Register component: Failed to update additional profile details, but user account was created", profileError);
      }
      
      // Send welcome email
      try {
        const { sendWelcomeEmail } = await import('@/services/email-service');
        console.log('Register component: Sending welcome email...');
        
        const businessName = data.role !== UserRole.CONSUMER ? 
                             `${data.firstName} ${data.lastName}'s Business` : 
                             undefined;
                            
        await sendWelcomeEmail(
          data.email, 
          fullName, 
          roleValue as 'consumer' | 'producer' | 'partner', 
          businessName
        );
        
        console.log('Register component: Welcome email sent successfully');
      } catch (emailError) {
        console.warn('Register component: Could not send welcome email, but registration was successful:', emailError);
      }

      // Redirect user to the appropriate dashboard based on role
      console.log(`Register component: Redirecting to dashboard for role ${roleValue}`);
      
      // Determine dashboard URL
      const dashboardRoutes = {
        [UserRole.CONSUMER]: "/dashboard/consumer?tab=explore",
        [UserRole.PRODUCER]: "/dashboard/producer",
        [UserRole.PARTNER]: "/dashboard/partner",
      };
      
      // Delay redirect slightly to ensure token propagation and auth state update
      setTimeout(() => {
        setLocation(dashboardRoutes[data.role]);
      }, 1500);
      
    } catch (error: any) {
      console.error("Register component: Registration error:", error);
      setError(error.message);
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div 
        className="h-64 bg-cover bg-center relative mb-8"
        style={{ 
          backgroundImage: 'url("/yacht-hero.jpg")',
          backgroundPosition: 'center 70%'
        }}
      >
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4 text-center">
          <h1 className="text-4xl font-bold mb-2">Welcome to Etoile Yachts</h1>
          <p className="text-lg max-w-2xl">
            Experience luxury water sports, integrated packages, and hybrid adventures
          </p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="container max-w-2xl mx-auto px-4 pb-16">
        <Card>
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter your phone number" 
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
                          placeholder="Create a strong password"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Password must be at least 8 characters and include uppercase, number, and special character
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Select Your Role</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-3 gap-4"
                        >
                          {Object.values(UserRole).map((role) => (
                            <FormItem key={role}>
                              <FormControl>
                                <div className={`border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-all ${
                                  field.value === role 
                                    ? "bg-muted/50 border-primary shadow-md transform translate-y-0.5" 
                                    : ""
                                }`}>
                                  <RadioGroupItem
                                    value={role}
                                    id={role}
                                    className="sr-only"
                                  />
                                  <label
                                    htmlFor={role}
                                    className="font-medium cursor-pointer flex flex-col gap-1"
                                  >
                                    <span className="capitalize">{role}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {roleDescriptions[role]}
                                    </span>
                                  </label>
                                </div>
                              </FormControl>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating your account..." : "Create Account"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Login here
                  </Link>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}