import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { Shield, CheckCircle, AlertTriangle, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import QRCode from 'react-qr-code'; // We'll need to install this package

// Define OTP schema for validation
const otpSchema = z.object({
  otp: z
    .string()
    .min(6, { message: 'Code must be at least 6 digits' })
    .max(6, { message: 'Code must be exactly 6 digits' })
    .regex(/^[0-9]+$/, { message: 'Code must contain only digits' })
});

type OtpFormValues = z.infer<typeof otpSchema>;

interface AuthenticatorSetupProps {
  userId: string;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

/**
 * Authenticator App Setup Component
 * 
 * This component handles setting up TOTP-based MFA with authenticator apps
 */
const AuthenticatorSetup: React.FC<AuthenticatorSetupProps> = ({ 
  userId, 
  onComplete, 
  onCancel 
}) => {
  // State
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Form setup
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Initialize the authenticator setup
  useEffect(() => {
    const initializeAuthenticator = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Request a new TOTP secret from the server
        const response = await fetch('/api/admin/generate-totp-secret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate authenticator secret');
        }
        
        const data = await response.json();
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
        setBackupCodes(data.backupCodes || []);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize authenticator setup');
        toast({
          title: 'Setup Error',
          description: 'Failed to initialize authenticator setup',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    initializeAuthenticator();
  }, [userId]);

  // Handle OTP verification
  const onSubmit = async (data: OtpFormValues) => {
    try {
      setVerifying(true);
      setError(null);
      
      // Verify the OTP with the server
      const response = await fetch('/api/admin/verify-totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          otp: data.otp,
          secret, // Include the secret for verification
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify code');
      }
      
      // Show backup codes after successful verification
      setShowBackupCodes(true);
      
      toast({
        title: 'Verification Successful',
        description: 'Your authenticator app has been set up successfully',
      });
      
      // Complete the authenticator setup (but don't navigate away yet - show backup codes first)
      // onComplete(true) will be called when the user acknowledges the backup codes
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify authenticator code',
        variant: 'destructive',
      });
      onComplete(false);
    } finally {
      setVerifying(false);
    }
  };

  // Handle copying backup codes to clipboard
  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: 'Backup Codes Copied',
      description: 'Backup codes have been copied to your clipboard',
    });
  };

  // Handle finishing the setup (after showing backup codes)
  const finishSetup = async () => {
    // Notify the parent component that setup is complete
    onComplete(true);
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-muted-foreground">Generating authenticator secret...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show backup codes after successful verification
  if (showBackupCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Backup Codes</CardTitle>
          <CardDescription>
            Store these backup codes in a safe place. You can use them to sign in if you lose access to your authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <p className="font-bold">Important:</p>
              <p>Each backup code can only be used once. Keep them secure and private.</p>
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted p-4 rounded-md font-mono text-sm">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div key={index} className="p-1">{code}</div>
              ))}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={copyBackupCodes}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Backup Codes
          </Button>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            onClick={finishSetup}
            className="w-full"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            I've Saved My Backup Codes
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Render authenticator setup UI
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Authenticator App</CardTitle>
        <CardDescription>
          Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to add an extra layer of security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">Scan this QR code with your authenticator app:</p>
            <div className="flex justify-center p-2 bg-white rounded-md inline-block">
              {qrCodeUrl && <QRCode value={qrCodeUrl} size={180} />}
            </div>
          </div>
          
          <div className="pt-2">
            <p className="text-sm text-muted-foreground text-center">Or enter this setup key manually:</p>
            <div className="bg-muted p-2 rounded-md text-center mt-2 font-mono">
              {secret}
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 6-digit code" 
                        {...field}
                        type="text"
                        maxLength={6}
                        inputMode="numeric"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={verifying}
              >
                {verifying ? <Spinner className="mr-2" size="sm" /> : <Shield className="mr-2 h-4 w-4" />}
                {verifying ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={onCancel}
        >
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthenticatorSetup;