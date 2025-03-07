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
import { registerWithEmail } from "@/lib/firebase";
import { UserRole } from "@shared/schema";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

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

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      setError(null);

      // Register with Firebase Auth
      const { user } = await registerWithEmail(data.email, data.password);

      try {
        console.log("Creating user profile in Firestore...");
        const userProfile = {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          role: data.role,
          emailVerified: false,
          points: 0,
          createdAt: new Date().toISOString()
        };

        // Create user profile in Firestore
        await setDoc(doc(db, "users", user.uid), userProfile);
        console.log("User profile created successfully");

        toast({
          title: "Registration successful!",
          description: "Welcome to Etoile Yachts. Please check your email for verification instructions.",
          duration: 5000,
        });

        // Role-based redirection
        const dashboardRoutes = {
          [UserRole.CONSUMER]: "/dashboard/consumer",
          [UserRole.PRODUCER]: "/dashboard/producer",
          [UserRole.PARTNER]: "/dashboard/partner",
        };
        setLocation(dashboardRoutes[data.role]);
      } catch (firestoreError: any) {
        console.error("Firestore Error:", firestoreError);
        console.error("Error code:", firestoreError.code);
        console.error("Error message:", firestoreError.message);

        // If Firestore fails, delete the auth user to maintain consistency
        await user.delete();
        throw new Error(
          `Failed to create user profile: ${firestoreError.message}. Please try again.`
        );
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Registration failed",
        description: error.message,
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