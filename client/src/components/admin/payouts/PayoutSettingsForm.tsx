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

import { PayoutSettings, PayoutFrequency, PayoutMethod } from '../../../../shared/payment-schema';
import { usePayoutSettings } from '@/hooks/use-payouts';

// Form schema for payout settings
const formSchema = z.object({
  defaultPayoutFrequency: z.enum(['weekly', 'biweekly', 'monthly'] as const),
  minimumPayoutAmount: z.coerce.number().min(0, 'Amount cannot be negative'),
  platformFeePercentage: z.coerce.number().min(0, 'Fee cannot be negative').max(100, 'Fee cannot exceed 100%'),
  automaticPayoutsEnabled: z.boolean(),
  requireAdminApproval: z.boolean(),
  payoutMethods: z.array(z.string()).min(1, 'At least one payout method must be selected'),
  supportedCurrencies: z.array(z.string()).min(1, 'At least one currency must be supported'),
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
  
  // Available payout methods
  const availablePayoutMethods = [
    { id: 'bank_transfer', label: 'Bank Transfer' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'manual', label: 'Manual' },
  ];
  
  // Available currencies
  const availableCurrencies = [
    { id: 'USD', label: 'US Dollar (USD)' },
    { id: 'AED', label: 'UAE Dirham (AED)' },
    { id: 'EUR', label: 'Euro (EUR)' },
    { id: 'GBP', label: 'British Pound (GBP)' },
  ];
  
  // Create form with default values from settings
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: settings ? {
      defaultPayoutFrequency: settings.defaultPayoutFrequency,
      minimumPayoutAmount: settings.minimumPayoutAmount,
      platformFeePercentage: settings.platformFeePercentage,
      automaticPayoutsEnabled: settings.automaticPayoutsEnabled,
      requireAdminApproval: settings.requireAdminApproval,
      payoutMethods: settings.payoutMethods,
      supportedCurrencies: settings.supportedCurrencies,
    } : {
      defaultPayoutFrequency: 'monthly',
      minimumPayoutAmount: 100,
      platformFeePercentage: 10,
      automaticPayoutsEnabled: false,
      requireAdminApproval: true,
      payoutMethods: ['bank_transfer', 'paypal'],
      supportedCurrencies: ['USD', 'AED'],
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FormData) => {
    updateSettings(
      data,
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
          <Button onClick={() => updateSettings({}, {})}>
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
                  name="defaultPayoutFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Payout Frequency</FormLabel>
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
                    name="requireAdminApproval"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Admin Approval</FormLabel>
                          <FormDescription>
                            Require admin approval for all payouts
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
                                        ? field.onChange([...field.value, method.id])
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
              
              <FormField
                control={form.control}
                name="supportedCurrencies"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Supported Currencies</FormLabel>
                      <FormDescription>
                        Select the currencies supported for payouts
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {availableCurrencies.map((currency) => (
                        <FormField
                          key={currency.id}
                          control={form.control}
                          name="supportedCurrencies"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={currency.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(currency.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, currency.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== currency.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {currency.label}
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