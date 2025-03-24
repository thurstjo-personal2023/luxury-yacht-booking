import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import QRCode from 'react-qr-code';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Copy, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { updateMfaStatus } from '@/services/admin/verification-service';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Define schema for TOTP verification code
const totpSchema = z.object({
  code: z.string().min(6).max(8),
});

// Define schema for backup code
const backupCodeSchema = z.object({
  backupCode: z.string().min(8).max(12),
});

// Define component props
interface AuthenticatorSetupProps {
  userId: string;
  onComplete: (success: boolean) => void;
  onCancel?: () => void;
}

// Type for form values
type TotpFormValues = z.infer<typeof totpSchema>;
type BackupFormValues = z.infer<typeof backupCodeSchema>;

/**
 * Authenticator Setup Component
 * 
 * This component handles the TOTP-based authenticator app setup for MFA
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
  const [step, setStep] = useState<'generating' | 'setup' | 'verify' | 'backup' | 'complete'>('generating');
  const [secret, setSecret] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [usingBackupCode, setUsingBackupCode] = useState(false);
  
  // Form setup for TOTP verification
  const totpForm = useForm<TotpFormValues>({
    resolver: zodResolver(totpSchema),
    defaultValues: {
      code: '',
    },
  });

  // Form setup for backup code
  const backupForm = useForm<BackupFormValues>({
    resolver: zodResolver(backupCodeSchema),
    defaultValues: {
      backupCode: '',
    },
  });
  
  // Generate TOTP secret
  useEffect(() => {
    const generateSecret = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/generate-totp-secret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to generate TOTP secret');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to generate TOTP secret');
        }
        
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
        setBackupCodes(data.backupCodes || []);
        setStep('setup');
      } catch (error: any) {
        console.error('Error generating TOTP secret:', error);
        setError(error.message || 'Failed to generate TOTP secret');
      } finally {
        setLoading(false);
      }
    };
    
    if (step === 'generating') {
      generateSecret();
    }
  }, [userId, step]);
  
  // Handle TOTP verification
  const onTotpSubmit = async (data: TotpFormValues) => {
    try {
      setVerifying(true);
      setError(null);
      
      const response = await fetch('/api/admin/verify-totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          otp: data.code,
          secret,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify code');
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to verify code');
      }
      
      // Move to backup codes step
      setStep('backup');
      
      toast({
        title: 'Verification Successful',
        description: 'Authenticator app successfully linked to your account',
      });
    } catch (error: any) {
      console.error('Error verifying TOTP:', error);
      setError(error.message || 'Failed to verify code');
      
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to verify authenticator code',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };
  
  // Handle backup code verification (for testing the backup codes)
  const onBackupSubmit = async (data: BackupFormValues) => {
    try {
      setVerifying(true);
      setError(null);
      
      const response = await fetch('/api/admin/verify-backup-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          backupCode: data.backupCode,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify backup code');
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to verify backup code');
      }
      
      // Update MFA status in backend
      await updateMfaStatus(userId, true);
      
      // Move to completion step
      setStep('complete');
      
      toast({
        title: 'Setup Complete',
        description: 'Multi-Factor Authentication has been successfully set up',
      });
      
      // Call the onComplete callback
      setTimeout(() => {
        onComplete(true);
      }, 1500);
    } catch (error: any) {
      console.error('Error verifying backup code:', error);
      setError(error.message || 'Failed to verify backup code');
      
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to verify backup code',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };
  
  // Complete setup without testing backup codes
  const handleCompleteSetup = async () => {
    try {
      setVerifying(true);
      setError(null);
      
      // Update MFA status in backend
      await updateMfaStatus(userId, true);
      
      // Move to completion step
      setStep('complete');
      
      toast({
        title: 'Setup Complete',
        description: 'Multi-Factor Authentication has been successfully set up',
      });
      
      // Call the onComplete callback
      setTimeout(() => {
        onComplete(true);
      }, 1500);
    } catch (error: any) {
      console.error('Error updating MFA status:', error);
      setError(error.message || 'Failed to complete MFA setup');
      
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to complete MFA setup',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };
  
  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => {
      toast({
        title: 'Copied to Clipboard',
        description: 'Backup codes have been copied to your clipboard',
      });
    }).catch((error) => {
      console.error('Failed to copy backup codes:', error);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy backup codes',
        variant: 'destructive',
      });
    });
  };
  
  // Download backup codes as a text file
  const downloadBackupCodes = () => {
    const element = document.createElement('a');
    const backupCodesText = backupCodes.join('\n');
    const file = new Blob([backupCodesText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'etoile-yachts-backup-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: 'Download Started',
      description: 'Backup codes are being downloaded',
    });
  };
  
  // Toggle between using TOTP and backup code
  const toggleUsingBackupCode = () => {
    setUsingBackupCode(prev => !prev);
    setError(null);
    totpForm.reset();
    backupForm.reset();
  };
  
  // Cancel setup and go back
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Generating your secure key...</p>
      </div>
    );
  }
  
  // Render the setup steps UI
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Step 1: Initial Setup */}
      {step === 'setup' && (
        <div className="space-y-4">
          <div className="text-sm">
            <p className="font-medium">Set up with an authenticator app</p>
            <ol className="list-decimal pl-4 mt-2 space-y-2">
              <li>Install an authenticator app (like Google Authenticator, Microsoft Authenticator, or Authy)</li>
              <li>Scan the QR code or enter the code manually</li>
              <li>Enter the 6-digit code from the app to verify setup</li>
            </ol>
          </div>
          
          {/* QR Code Display */}
          <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg">
            {qrCodeUrl && (
              <QRCode
                value={qrCodeUrl}
                size={180}
                level="H"
              />
            )}
            <p className="mt-2 text-xs text-center break-all">
              {secret && (
                <span className="font-mono">
                  {secret}
                </span>
              )}
            </p>
          </div>
          
          {/* Verification */}
          {usingBackupCode ? (
            <Form {...backupForm}>
              <form onSubmit={backupForm.handleSubmit(onBackupSubmit)} className="space-y-4">
                <FormField
                  control={backupForm.control}
                  name="backupCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter backup code" 
                          {...field}
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
                  {verifying ? <Spinner className="mr-2" size="sm" /> : null}
                  {verifying ? 'Verifying...' : 'Verify Backup Code'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={toggleUsingBackupCode}
                >
                  Use Authenticator App Instead
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...totpForm}>
              <form onSubmit={totpForm.handleSubmit(onTotpSubmit)} className="space-y-4">
                <FormField
                  control={totpForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter code from authenticator app" 
                          {...field}
                          type="text"
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
                  {verifying ? <Spinner className="mr-2" size="sm" /> : null}
                  {verifying ? 'Verifying...' : 'Verify Code'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={toggleUsingBackupCode}
                >
                  Use Backup Code Instead
                </Button>
              </form>
            </Form>
          )}
          
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleCancel}
            >
              Cancel and Use Phone Instead
            </Button>
          )}
        </div>
      )}
      
      {/* Step 2: Backup Codes */}
      {step === 'backup' && (
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Save your backup codes</p>
                <p className="text-sm">
                  These backup codes can be used to access your account if you lose your phone or cannot access your authenticator app. 
                  Each code can only be used once.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          
          {/* Backup Codes Display */}
          <Card className="p-4 bg-muted">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div key={index} className="font-mono text-sm bg-background p-1 rounded text-center">
                  {code}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center space-x-2 mt-4">
              <Button size="sm" variant="outline" onClick={copyBackupCodes}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button size="sm" variant="outline" onClick={downloadBackupCodes}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </Card>
          
          {/* Test Backup Code Verification */}
          <div className="text-sm">
            <p className="font-medium">Test a backup code (optional)</p>
            <p className="text-muted-foreground mt-1">
              You can test one of your backup codes to make sure they work, or skip this step.
            </p>
          </div>
          
          <Form {...backupForm}>
            <form onSubmit={backupForm.handleSubmit(onBackupSubmit)} className="space-y-4">
              <FormField
                control={backupForm.control}
                name="backupCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Backup Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter one of your backup codes" 
                        {...field}
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
                {verifying ? <Spinner className="mr-2" size="sm" /> : null}
                {verifying ? 'Verifying...' : 'Test Backup Code'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCompleteSetup}
                disabled={verifying}
              >
                Skip and Complete Setup
              </Button>
            </form>
          </Form>
        </div>
      )}
      
      {/* Step 3: Completion */}
      {step === 'complete' && (
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <div>
            <h3 className="text-xl font-bold">Setup Complete</h3>
            <p className="text-muted-foreground">
              Authenticator app successfully configured
            </p>
          </div>
          <Spinner size="sm" />
        </div>
      )}
    </div>
  );
};

export default AuthenticatorSetup;