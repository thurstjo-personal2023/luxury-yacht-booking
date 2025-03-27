/**
 * Payout Settings Form Component
 * 
 * Provides a form for configuring global payout settings
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, AlertTriangle, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

import { PayoutSettings, PayoutMethod, PayoutSchedule } from '../../../../../shared/payment-schema';
import { usePayoutSettings } from '@/hooks/use-payouts';

// Form schema for payout settings
const formSchema = z.object({
  payoutSchedule: z.enum(['daily', 'weekly', 'biweekly', 'monthly'] as const),
  minimumPayoutAmount: z.coerce.number().min(0, 'Amount cannot be negative'),
  platformFeePercentage: z.coerce.number().min(0, 'Fee cannot be negative').max(100, 'Fee cannot exceed 100%'),
  automaticPayoutsEnabled: z.boolean(),
  allowEarlyPayout: z.boolean(),
  maxRetryAttempts: z.coerce.number().int().nonnegative(),
  withdrawalFee: z.coerce.number().nonnegative(),
  earlyPayoutFee: z.coerce.number().nonnegative(),
  supportContact: z.string().email(),
  payoutMethods: z.array(z.enum(['paypal', 'stripe', 'bank_account', 'crypto_wallet'] as const)).min(1, 'At least one payout method must be selected'),
});

type FormData = z.infer<typeof formSchema>;

// Helper function to format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  
  // Handle both Firestore Timestamp objects and ISO date strings
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'MMM d, yyyy h:mm a');
};

interface PayoutSettingsFormProps {
  settings: PayoutSettings | null;
}

const PayoutSettingsForm: React.FC<PayoutSettingsFormProps> = ({ settings }) => {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const { updateSettings, isUpdating } = usePayoutSettings();
  
  // Available payout methods matching the PayoutMethod type
  const availablePayoutMethods: { id: PayoutMethod; label: string }[] = [
    { id: 'bank_account', label: 'Bank Account' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'crypto_wallet', label: 'Crypto Wallet' },
  ];
  
  // Create form with default values from settings
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: settings ? {
      payoutSchedule: settings.payoutSchedule,
      minimumPayoutAmount: settings.minimumPayoutAmount,
      platformFeePercentage: settings.platformFeePercentage,
      automaticPayoutsEnabled: settings.automaticPayoutsEnabled,
      allowEarlyPayout: settings.allowEarlyPayout,
      maxRetryAttempts: settings.maxRetryAttempts,
      withdrawalFee: settings.withdrawalFee,
      earlyPayoutFee: settings.earlyPayoutFee,
      supportContact: settings.supportContact,
      // Cast to correct type and filter to ensure only valid values are used
      payoutMethods: settings.payoutMethods.filter(
        method => ['paypal', 'stripe', 'bank_account', 'crypto_wallet'].includes(method)
      ) as ('paypal' | 'stripe' | 'bank_account' | 'crypto_wallet')[],
    } : {
      payoutSchedule: 'monthly',
      minimumPayoutAmount: 50,
      platformFeePercentage: 5,
      automaticPayoutsEnabled: true,
      allowEarlyPayout: true,
      maxRetryAttempts: 3,
      withdrawalFee: 1,
      earlyPayoutFee: 2,
      supportContact: 'payments@etoileyachts.com',
      payoutMethods: ['paypal', 'bank_account'] as ('paypal' | 'stripe' | 'bank_account' | 'crypto_wallet')[],
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FormData) => {
    // Convert form data to PayoutSettings format
    const settingsData: Partial<PayoutSettings> = {
      ...data,
      // Ensure payoutMethods is typed correctly
      payoutMethods: data.payoutMethods as PayoutMethod[]
    };
    
    updateSettings(
      settingsData,
      {
        onSuccess: () => {
          setIsAlertVisible(true);
          setTimeout(() => setIsAlertVisible(false), 3000);
        }
      }
    );
  };
  
  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Settings</CardTitle>
          <CardDescription>Configure global payout settings</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No settings found</h3>
          <p className="text-muted-foreground mb-4">
            No payout settings have been configured yet.
          </p>
          <Button onClick={() => updateSettings({
            payoutSchedule: 'monthly',
            minimumPayoutAmount: 50,
            platformFeePercentage: 5,
            automaticPayoutsEnabled: true,
            allowEarlyPayout: true,
            maxRetryAttempts: 3,
            withdrawalFee: 1,
            earlyPayoutFee: 2,
            supportContact: 'payments@etoileyachts.com',
            payoutMethods: ['paypal', 'bank_account'] as PayoutMethod[]
          }, {})}>
            Initialize Settings
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {isAlertVisible && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-700" />
          <AlertTitle className="text-green-700">Settings saved</AlertTitle>
          <AlertDescription className="text-green-600">
            Your payout settings have been updated successfully.
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Payout Settings</CardTitle>
          <CardDescription>
            Configure global payout settings for all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="payoutSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payout Schedule</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Biweekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How often payouts are processed by default
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="minimumPayoutAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Payout Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="100.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum amount required for a payout to be processed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="platformFeePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform Fee Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="10"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Platform fee applied to each payout (in percentage)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormField
                    control={form.control}
                    name="automaticPayoutsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Automatic Payouts</FormLabel>
                          <FormDescription>
                            Enable automatic scheduled payouts
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="allowEarlyPayout"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Early Payouts</FormLabel>
                          <FormDescription>
                            Allow users to request payouts before scheduled dates
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="payoutMethods"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Payout Methods</FormLabel>
                      <FormDescription>
                        Select the payout methods available to users
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {availablePayoutMethods.map((method) => (
                        <FormField
                          key={method.id}
                          control={form.control}
                          name="payoutMethods"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={method.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(method.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value, 
                                            method.id
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== method.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {method.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="maxRetryAttempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Retry Attempts</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="3"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of retry attempts for failed payouts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="withdrawalFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Withdrawal Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="1.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Fee charged for each withdrawal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="earlyPayoutFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Early Payout Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="2.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Additional fee for processing early payouts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="supportContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="payments@etoileyachts.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Email address for payout support inquiries
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit"
                disabled={isUpdating}
                className="w-full md:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-xs text-muted-foreground">
            Last updated: {formatTimestamp(settings.updatedAt)}
          </div>
          <div className="text-xs text-muted-foreground">
            Updated by: {settings.updatedBy}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PayoutSettingsForm;