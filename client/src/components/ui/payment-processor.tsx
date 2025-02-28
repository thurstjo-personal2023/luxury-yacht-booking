import React, { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentMethod, PaymentDetails } from '@shared/payment-schema';

// Credit Card Form Schema
const creditCardSchema = z.object({
  cardholderName: z.string().min(2, 'Cardholder name is required'),
  cardNumber: z.string()
    .min(13, 'Card number must be between 13-19 digits')
    .max(19, 'Card number must be between 13-19 digits')
    .regex(/^[0-9]+$/, 'Card number must contain only digits'),
  expiryDate: z.string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Expiry date must be in MM/YY format'),
  cvv: z.string()
    .min(3, 'CVV must be 3-4 digits')
    .max(4, 'CVV must be 3-4 digits')
    .regex(/^[0-9]+$/, 'CVV must contain only digits'),
});

// Digital Wallet Form Schema
const digitalWalletSchema = z.object({
  provider: z.enum(['apple_pay', 'google_pay', 'paypal']),
  accountEmail: z.string().email('Please provide a valid email').optional(),
});

// Payment Method Form Schema
const paymentMethodSchema = z.object({
  method: z.enum(['credit_card', 'digital_wallet']),
});

type CreditCardFormValues = z.infer<typeof creditCardSchema>;
type DigitalWalletFormValues = z.infer<typeof digitalWalletSchema>;
type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>;

interface PaymentProcessorProps {
  amount: number;
  onPaymentComplete: (paymentDetails: PaymentDetails, transactionId: string) => void;
  onPaymentCancel: () => void;
  processing?: boolean;
}

export function PaymentProcessor({
  amount,
  onPaymentComplete,
  onPaymentCancel,
  processing = false
}: PaymentProcessorProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [processingPayment, setProcessingPayment] = useState(processing);

  // Credit Card Form
  const creditCardForm = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
    },
  });

  // Digital Wallet Form
  const digitalWalletForm = useForm<DigitalWalletFormValues>({
    resolver: zodResolver(digitalWalletSchema),
    defaultValues: {
      provider: 'paypal',
      accountEmail: '',
    },
  });

  // Payment Method Form
  const paymentMethodForm = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      method: 'credit_card',
    },
  });

  // Handle Credit Card Submit
  const onCreditCardSubmit = async (data: CreditCardFormValues) => {
    setProcessingPayment(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const paymentDetails: PaymentDetails = {
      method: 'credit_card',
      creditCardDetails: {
        cardNumber: data.cardNumber.replace(/\d(?=\d{4})/g, "*"), // Mask card number
        cardholderName: data.cardholderName,
        expiryDate: data.expiryDate,
        cvv: "***" // Mask CVV
      }
    };
    
    const transactionId = `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    onPaymentComplete(paymentDetails, transactionId);
  };

  // Handle Digital Wallet Submit
  const onDigitalWalletSubmit = async (data: DigitalWalletFormValues) => {
    setProcessingPayment(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const paymentDetails: PaymentDetails = {
      method: 'digital_wallet',
      digitalWalletDetails: {
        provider: data.provider,
        accountEmail: data.accountEmail
      }
    };
    
    const transactionId = `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    onPaymentComplete(paymentDetails, transactionId);
  };

  // Handle Payment Method Change
  const onPaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    paymentMethodForm.setValue('method', method);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
        <CardDescription>Complete your booking by providing payment details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Payment method selection */}
          <div className="space-y-2">
            <Label>Select Payment Method</Label>
            <RadioGroup
              defaultValue={paymentMethod}
              onValueChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
              className="grid grid-cols-2 gap-4 pt-2"
            >
              <div>
                <RadioGroupItem
                  value="credit_card"
                  id="credit_card"
                  className="peer sr-only"
                  checked={paymentMethod === 'credit_card'}
                />
                <Label
                  htmlFor="credit_card"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <CreditCard className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">Credit Card</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem
                  value="digital_wallet"
                  id="digital_wallet"
                  className="peer sr-only"
                  checked={paymentMethod === 'digital_wallet'}
                />
                <Label
                  htmlFor="digital_wallet"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Wallet className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">Digital Wallet</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Payment form based on selected method */}
          <div className="pt-4">
            {paymentMethod === 'credit_card' && (
              <Form {...creditCardForm}>
                <form onSubmit={creditCardForm.handleSubmit(onCreditCardSubmit)} className="space-y-4">
                  <FormField
                    control={creditCardForm.control}
                    name="cardholderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cardholder Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} disabled={processingPayment} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={creditCardForm.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <Input placeholder="4111 1111 1111 1111" {...field} disabled={processingPayment} />
                        </FormControl>
                        <FormDescription>
                          Enter the 16-digit number on your card
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={creditCardForm.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input placeholder="MM/YY" {...field} disabled={processingPayment} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={creditCardForm.control}
                      name="cvv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVV</FormLabel>
                          <FormControl>
                            <Input placeholder="123" type="password" {...field} disabled={processingPayment} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onPaymentCancel}
                      disabled={processingPayment}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={processingPayment}
                    >
                      {processingPayment ? "Processing..." : `Pay $${amount.toLocaleString()}`}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
            
            {paymentMethod === 'digital_wallet' && (
              <Form {...digitalWalletForm}>
                <form onSubmit={digitalWalletForm.handleSubmit(onDigitalWalletSubmit)} className="space-y-4">
                  <FormField
                    control={digitalWalletForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Wallet Provider</FormLabel>
                        <FormControl>
                          <Tabs 
                            defaultValue={field.value} 
                            onValueChange={(value) => field.onChange(value as 'apple_pay' | 'google_pay' | 'paypal')}
                            className="w-full"
                          >
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="paypal" disabled={processingPayment}>PayPal</TabsTrigger>
                              <TabsTrigger value="apple_pay" disabled={processingPayment}>Apple Pay</TabsTrigger>
                              <TabsTrigger value="google_pay" disabled={processingPayment}>Google Pay</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={digitalWalletForm.control}
                    name="accountEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Email (Optional)</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} disabled={processingPayment} />
                        </FormControl>
                        <FormDescription>
                          For receipt and confirmation purposes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onPaymentCancel}
                      disabled={processingPayment}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={processingPayment}
                    >
                      {processingPayment ? "Processing..." : `Pay $${amount.toLocaleString()}`}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}