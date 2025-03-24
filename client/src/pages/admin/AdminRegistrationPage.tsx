import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { toast } from '@/hooks/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

// Firebase imports
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Schema for form validation
const registrationSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }).trim(),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
  confirmPassword: z.string(),
  employeeId: z.string().min(2, { message: 'Employee ID is required' }),
  department: z.string().min(1, { message: 'Department is required' }),
  position: z.string().min(1, { message: 'Position is required' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

/**
 * Department options for Etoile Yachts administrators
 */
const DEPARTMENT_OPTIONS = [
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'it', label: 'IT' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'management', label: 'Management' },
];

/**
 * Position options by department
 */
const POSITION_OPTIONS: Record<string, Array<{ value: string, label: string }>> = {
  finance: [
    { value: 'financial_administrator', label: 'Financial Administrator' },
    { value: 'accounting_specialist', label: 'Accounting Specialist' },
    { value: 'payment_processor', label: 'Payment Processor' },
  ],
  operations: [
    { value: 'operations_manager', label: 'Operations Manager' },
    { value: 'booking_coordinator', label: 'Booking Coordinator' },
    { value: 'yacht_liaison', label: 'Yacht Liaison' },
  ],
  customer_support: [
    { value: 'support_specialist', label: 'Support Specialist' },
    { value: 'dispute_resolution', label: 'Dispute Resolution Specialist' },
    { value: 'customer_success', label: 'Customer Success Manager' },
  ],
  marketing: [
    { value: 'marketing_specialist', label: 'Marketing Specialist' },
    { value: 'content_creator', label: 'Content Creator' },
    { value: 'partnership_manager', label: 'Partnership Manager' },
  ],
  it: [
    { value: 'system_administrator', label: 'System Administrator' },
    { value: 'developer', label: 'Developer' },
    { value: 'data_analyst', label: 'Data Analyst' },
  ],
  hr: [
    { value: 'hr_specialist', label: 'HR Specialist' },
    { value: 'talent_acquisition', label: 'Talent Acquisition' },
  ],
  management: [
    { value: 'director', label: 'Director' },
    { value: 'team_lead', label: 'Team Lead' },
  ],
};

/**
 * Admin Registration Page
 * This component handles the registration of new administrators through invitation links
 */
const AdminRegistrationPage: React.FC = () => {
  // State
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitationData, setInvitationData] = useState<{
    valid: boolean;
    invitation?: {
      email: string;
      role: string;
      expiresAt: any;
    };
    message?: string;
  } | null>(null);
  
  // Get invitation token from URL
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token');
  
  // Form setup with validation
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      employeeId: '',
      department: '',
      position: '',
    },
  });

  // Validate invitation token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setInvitationData({
          valid: false,
          message: 'No invitation token provided'
        });
        setValidating(false);
        return;
      }
      
      try {
        // Call Firebase function to validate token
        const response = await axios.post('/api/admin/validate-invitation', { token });
        
        if (response.data.valid) {
          setInvitationData(response.data);
          // Pre-fill email field with invitation email
          form.setValue('email', response.data.invitation.email);
        } else {
          setInvitationData({
            valid: false,
            message: response.data.message || 'Invalid invitation token'
          });
        }
      } catch (error) {
        console.error('Error validating invitation token:', error);
        setInvitationData({
          valid: false,
          message: 'Error validating invitation. Please try again.'
        });
      } finally {
        setValidating(false);
      }
    };
    
    validateToken();
  }, [token, form]);
  
  // Form submission handler
  const onSubmit = async (data: RegistrationFormValues) => {
    if (!token || !invitationData?.valid) {
      toast({
        title: 'Invalid Invitation',
        description: 'Your invitation link is invalid or expired',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Create user with Firebase Auth
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        data.email, 
        data.password
      );
      
      // Create admin profile with additional details
      const adminData = {
        uid: userCredential.user.uid,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        employeeId: data.employeeId,
        department: data.department,
        position: data.position,
        invitationToken: token,
        role: invitationData.invitation?.role,
      };
      
      // Save admin profile to backend
      await axios.post('/api/admin/create-profile', adminData);
      
      // Mark invitation as used
      await axios.post('/api/admin/complete-invitation', { token });
      
      // Success message
      toast({
        title: 'Registration Successful',
        description: 'Please verify your email to continue',
      });
      
      // Redirect to email verification page
      navigate('/admin/verify-email');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific errors
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: 'Registration Failed',
          description: 'This email is already registered',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Registration Failed',
          description: error.message || 'An error occurred during registration',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Position options based on selected department
  const positionOptions = form.watch('department') 
    ? POSITION_OPTIONS[form.watch('department')] || []
    : [];
  
  // If still validating invitation, show loading spinner
  if (validating) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }
  
  // If invitation is invalid, show error message
  if (!invitationData?.valid) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Invalid Invitation</CardTitle>
            <CardDescription>
              The invitation link you used is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="my-4">
              <AlertDescription>
                {invitationData?.message || 'This invitation link is no longer valid.'}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mt-4">
              Please contact a Super Administrator to request a new invitation.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => navigate('/admin/login')}>
              Go to Admin Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Render registration form
  return (
    <div className="container max-w-lg mx-auto py-10">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Administrator Registration</CardTitle>
          <CardDescription>
            Create your administrator account for Etoile Yachts platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                        <Input placeholder="Doe" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="john.doe@etoileyachts.com" 
                        {...field}
                        disabled // Email is pre-filled from invitation
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEPARTMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!form.watch('department')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="text-sm text-muted-foreground">
                <p>Password must have:</p>
                <ul className="list-disc list-inside pl-2 space-y-1 mt-1">
                  <li>At least 8 characters</li>
                  <li>At least one uppercase letter (A-Z)</li>
                  <li>At least one lowercase letter (a-z)</li>
                  <li>At least one number (0-9)</li>
                  <li>At least one special character (!@#$%^&*)</li>
                </ul>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner className="mr-2" size="sm" /> : null}
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a 
              href="/admin/login" 
              className="text-primary font-medium hover:underline"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin/login');
              }}
            >
              Sign In
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminRegistrationPage;