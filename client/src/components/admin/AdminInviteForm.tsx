/**
 * Admin Invitation Form Component
 * 
 * This component provides a form for inviting new administrators
 * to the platform with specified roles and departments.
 */
import { useState } from 'react';
import { User, Mail, Building2, Briefcase, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define form schema
const inviteFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  role: z.string(),
  department: z.string().min(1, { message: 'Please select a department' }),
  position: z.string().min(1, { message: 'Please enter a position' }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

// Component props
interface AdminInviteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminInviteForm({ isOpen, onClose, onSuccess }: AdminInviteFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Define form with validation
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'MODERATOR',
      department: '',
      position: '',
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: InviteFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Make API request to create invitation
      const response = await fetch('/api/admin/create-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invitation');
      }
      
      // Show success message
      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${values.email}`,
      });
      
      // Reset form and close dialog
      form.reset();
      onSuccess();
      onClose();
      
    } catch (err) {
      console.error('Error creating invitation:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Administrator
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new administrator to join the platform
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="email@example.com" 
                      {...field} 
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>
                    The invitation will be sent to this email address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
                      {...field}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MODERATOR">Moderator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The permissions level for this administrator
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Department */}
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Department
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Customer Support">Customer Support</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Human Resources">Human Resources</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Position */}
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Position
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Platform Administrator" 
                      {...field}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>
                    The job title or position within the department
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}