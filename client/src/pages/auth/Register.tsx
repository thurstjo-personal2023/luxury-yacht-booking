import { useState } from "react";
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
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { sendWelcomeEmail } from "@/services/email-service";

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

  // Function to update profile data once user is created
  const updateProfileDetails = async (token: string, data: RegisterForm, roleValue: string) => {
    try {
      const updateEndpoint = data.role === UserRole.CONSUMER
        ? '/api/user/update-tourist-profile'
        : '/api/user/update-provider-profile';
      
      const phoneNumber = data.phone;
      
      const updateData = data.role === UserRole.CONSUMER
        ? {
            preferences: [],
            loyaltyTier: 'Bronze',
            phoneNumber: phoneNumber
          }
        : {
            businessName: `${data.firstName} ${data.lastName}'s Business`,
            servicesOffered: [],
            contactInformation: {
              address: '',
              phone: phoneNumber
            }
          };
      
      const updateResponse = await fetch(updateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!updateResponse.ok) {
        console.warn(`Profile update warning: ${updateResponse.status} ${updateResponse.statusText}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating profile details:', error);
      return false;
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Registering user with Firebase Auth and creating profile in Production Firestore...");
      
      // Convert role enum to string value to match what the server expects
      const roleValue = data.role === UserRole.CONSUMER ? 'consumer' :
                        data.role === UserRole.PRODUCER ? 'producer' : 
                        'partner';
      
      const fullName = `${data.firstName} ${data.lastName}`;
                    
      // Register the user with Firebase Auth directly (no context dependency)
      console.log('Registering user with Firebase Auth directly');
      
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email, 
        data.password
      );
      
      const user = userCredential.user;
      console.log('User created successfully in Firebase Auth');
      
      // Step 2: Update the user's display name
      await updateProfile(user, { displayName: fullName });
      console.log('User profile display name updated');
      
      // Step 3: Get a fresh auth token for API requests
      const token = await user.getIdToken(true);
      localStorage.setItem('authToken', token);
      console.log('Fresh auth token obtained and stored');
      
      // Step 4: Create the user profile in Firestore via the API
      console.log('Creating user profile in Firestore via API');
      
      const createProfileResponse = await fetch('/api/user/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: fullName,
          email: data.email,
          role: roleValue,
          phone: data.phone
        })
      });
      
      if (!createProfileResponse.ok) {
        throw new Error(`Failed to create user profile: ${createProfileResponse.status} ${createProfileResponse.statusText}`);
      }
      
      console.log('User profile created successfully in Firestore');
      
      // Update additional profile details
      const profileUpdateSuccess = await updateProfileDetails(token, data, roleValue);
      
      if (!profileUpdateSuccess) {
        console.warn("Failed to update additional profile details, but user account was created");
        
        toast({
          title: "Registration successful!",
          description: "Your account was created, but we couldn't update all profile details. You can update them later.",
          duration: 5000,
        });
      } else {
        console.log("Successfully updated profile details");
        
        toast({
          title: "Registration successful!",
          description: "Welcome to Etoile Yachts. Your profile has been saved to our secure database.",
          duration: 5000,
        });
      }
      
      // Send welcome email
      try {
        console.log('Sending welcome email...');
        const businessName = data.role === UserRole.CONSUMER ? undefined : 
                            `${data.firstName} ${data.lastName}'s Business`;
                            
        await sendWelcomeEmail(data.email, `${data.firstName} ${data.lastName}`, roleValue as 'consumer' | 'producer' | 'partner', businessName);
        console.log('Welcome email sent successfully');
      } catch (emailError) {
        console.warn('Could not send welcome email, but registration was successful:', emailError);
      }

      // Role-based redirection
      const dashboardRoutes = {
        [UserRole.CONSUMER]: "/dashboard/consumer",
        [UserRole.PRODUCER]: "/dashboard/producer",
        [UserRole.PARTNER]: "/dashboard/partner",
      };
      setLocation(dashboardRoutes[data.role]);
    } catch (error: any) {
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