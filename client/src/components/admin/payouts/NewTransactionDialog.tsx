/**
 * New Transaction Dialog Component
 * 
 * Provides a form for creating a new payout transaction
 */
import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

import { PayoutAccount, PayoutStatus } from '../../../../shared/payment-schema';
import { usePayoutTransactions } from '@/hooks/use-payouts';

// Form schema for payout transaction
const formSchema = z.object({
  accountId: z.string({ required_error: 'Please select an account' }),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  notes: z.string().optional(),
  status: z.enum(['pending', 'approved'], { required_error: 'Please select a status' }),
  bookingIds: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: PayoutAccount[];
}

const NewTransactionDialog: React.FC<NewTransactionDialogProps> = ({ 
  open, 
  onOpenChange,
  accounts 
}) => {
  const { createTransaction, isCreating } = usePayoutTransactions();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      currency: 'USD',
      description: '',
      notes: '',
      status: 'pending',
      bookingIds: '',
    },
  });

  const onSubmit = (data: FormData) => {
    // Process booking IDs if provided
    const bookingIds = data.bookingIds
      ? data.bookingIds.split(',').map(id => id.trim()).filter(Boolean)
      : undefined;
      
    createTransaction({
      ...data,
      bookingIds,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      }
    });
  };
  
  // Close the dialog and reset the form
  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Payout Transaction</DialogTitle>
          <DialogDescription>
            Create a new payout transaction for a user. 
            This will be processed according to the platform payout schedule.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payout Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.length === 0 ? (
                        <SelectItem value="no-accounts" disabled>
                          No accounts available
                        </SelectItem>
                      ) : (
                        accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountName} - {account.userType}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the account to receive this payout
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Payment for services" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be visible to the recipient
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bookingIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking IDs (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="booking-123, booking-456" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of booking IDs related to this payout
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pending" id="pending" />
                        <FormLabel htmlFor="pending" className="font-normal cursor-pointer">
                          Pending
                        </FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="approved" id="approved" />
                        <FormLabel htmlFor="approved" className="font-normal cursor-pointer">
                          Approved
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Set to "Approved" to queue for immediate processing
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add internal notes about this transaction"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These notes are only visible to administrators
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Transaction'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTransactionDialog;