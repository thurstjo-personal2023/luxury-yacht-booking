import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Invalid phone number"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  role: z.string({
    required_error: "Please select a role",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password", "");
  const getPasswordStrength = () => {
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];
    return checks.filter(Boolean).length;
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      console.log('Starting registration process...'); // Debug log

      // Create user with Firebase Auth
      console.log('Creating Firebase Auth user...'); // Debug log
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      console.log('Firebase Auth user created:', userCredential.user.uid); // Debug log

      // Update profile with full name
      console.log('Updating user profile...'); // Debug log
      await updateProfile(userCredential.user, {
        displayName: data.fullName,
      });

      // Create user document in Firestore
      console.log('Creating Firestore document...'); // Debug log
      const userDoc = {
        uid: userCredential.user.uid,
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        role: data.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", userCredential.user.uid), userDoc);
      console.log('Firestore document created successfully'); // Debug log

      // Redirect based on role
      const dashboardRoutes = {
        consumer: "/dashboard/consumer",
        producer: "/dashboard/producer",
        partner: "/dashboard/partner",
      };

      toast({
        title: "Registration successful!",
        description: "Welcome to Etoile Yachts. Redirecting to your dashboard...",
      });

      setLocation(dashboardRoutes[data.role as keyof typeof dashboardRoutes]);
    } catch (error: any) {
      console.error("Registration error:", error);

      // Handle Firebase specific errors
      let errorMessage = "Something went wrong. Please try again.";

      if (error.code === 'auth/network-request-failed') {
        errorMessage = `Network error: Please check your connection and try again. Host: ${window.location.hostname}`;
        console.error('Network error details:', {
          host: window.location.hostname,
          error: error.message,
          code: error.code
        });
      } else {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email is already registered. Please log in or reset your password.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address.";
            break;
          default:
            console.error('Unexpected error:', {
              code: error.code,
              message: error.message,
              details: error
            });
            errorMessage = error.message;
        }
      }

      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Registration Page</h1>
        </div>
        <img src="/logo.svg" alt="Etoile Yachts" className="h-8" />
      </header>

      {/* Main Content */}
      <main className="container max-w-lg mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Registration Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  {...register("phoneNumber")}
                  placeholder="Enter your phone number"
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                )}
              </div>

              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="password"
                        type="password"
                        {...register("password")}
                        placeholder="Create a password"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Password must contain:</p>
                      <ul className="list-disc list-inside">
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One number</li>
                        <li>One special character</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                  <div className="h-2 grid grid-cols-4 gap-2 mt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-full rounded ${
                          i < getPasswordStrength()
                            ? "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </TooltipProvider>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select onValueChange={(value) => setValue("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumer">Consumer</SelectItem>
                    <SelectItem value="producer">Producer</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Choose how you'll use Etoile Yachts
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Registering..." : "Register"}
              </Button>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => setLocation("/auth/login")}
                >
                  Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Debug information for development */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Running in emulator mode. Do not use with production credentials.
              <br />
              Current host: {window.location.hostname}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}