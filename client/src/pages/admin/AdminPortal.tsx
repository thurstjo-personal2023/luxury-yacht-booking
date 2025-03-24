import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LockKeyhole, 
  Mail, 
  Phone, 
  ClipboardCheck, 
  Shield, 
  Loader2
} from 'lucide-react';
import { getVerificationStatus, isVerificationComplete, isRegistrationComplete } from '@/services/admin/verification-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';

// Animation variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Admin Portal Component
 * 
 * This component serves as the central hub for the admin registration flow,
 * showing the current progress and guiding users through each step.
 */
const AdminPortal: React.FC = () => {
  const params = useParams<{ userId?: string }>();
  const userId = params?.userId;
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthState();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  
  // Map steps to routes and descriptions
  const steps = [
    { 
      name: 'Registration', 
      icon: <LockKeyhole className="w-5 h-5" />,
      description: 'Create your admin account with a strong password',
      route: '/admin-registration',
      condition: () => true, // Always show as first step
    },
    { 
      name: 'Email Verification', 
      icon: <Mail className="w-5 h-5" />,
      description: 'Verify your email address',
      route: userId ? `/admin-email-verification/${userId}` : '',
      condition: () => Boolean(userId),
    },
    { 
      name: 'Phone Verification', 
      icon: <Phone className="w-5 h-5" />,
      description: 'Verify your phone number',
      route: userId ? `/admin-phone-verification/${userId}` : '',
      condition: () => verificationStatus?.isEmailVerified === true,
    },
    { 
      name: 'Approval', 
      icon: <ClipboardCheck className="w-5 h-5" />,
      description: 'Wait for approval from a super admin',
      route: userId ? `/admin-pending-approval/${userId}` : '',
      condition: () => verificationStatus?.isEmailVerified === true && verificationStatus?.isPhoneVerified === true,
    },
    { 
      name: 'MFA Setup', 
      icon: <Shield className="w-5 h-5" />,
      description: 'Set up multi-factor authentication',
      route: userId ? `/admin-mfa-options/${userId}` : '',
      condition: () => verificationStatus?.isEmailVerified === true && 
                        verificationStatus?.isPhoneVerified === true && 
                        verificationStatus?.isApproved === true,
    },
    { 
      name: 'Dashboard', 
      icon: <Shield className="w-5 h-5" />,
      description: 'Access the admin dashboard',
      route: '/admin-dashboard',
      condition: () => verificationStatus?.isEmailVerified === true && 
                        verificationStatus?.isPhoneVerified === true && 
                        verificationStatus?.isApproved === true && 
                        verificationStatus?.isMfaEnabled === true,
    },
  ];

  // Fetch verification status on mount and when userId changes
  useEffect(() => {
    async function fetchStatus() {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const status = await getVerificationStatus(userId);
        setVerificationStatus(status);
        
        // Calculate current step
        let step = 1; // Default to first step
        
        if (status.isEmailVerified) step = 2;
        if (status.isEmailVerified && status.isPhoneVerified) step = 3;
        if (status.isEmailVerified && status.isPhoneVerified && status.isApproved) step = 4;
        if (status.isEmailVerified && status.isPhoneVerified && status.isApproved && status.isMfaEnabled) step = 5;
        
        setCurrentStep(step);
        
        // Calculate progress percentage
        const progressPercentage = Math.min(100, Math.floor((step / (steps.length - 1)) * 100));
        setProgress(progressPercentage);
      } catch (error: any) {
        console.error('Error fetching verification status:', error);
        setError(error.message || 'Failed to load verification status');
        
        toast({
          title: 'Error',
          description: 'Failed to load verification status',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchStatus();
  }, [userId]);
  
  // Navigate to current step
  const goToCurrentStep = () => {
    // Find the current active step
    const activeStep = steps.find((step, index) => 
      index + 1 === currentStep && step.condition()
    );
    
    if (activeStep && activeStep.route) {
      navigate(activeStep.route);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Loading Admin Portal</CardTitle>
            <CardDescription>
              Checking your registration progress...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={30} className="w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Error Loading Portal</CardTitle>
            <CardDescription>
              We encountered a problem while checking your registration status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="w-full" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Portal content
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="admin-portal"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900"
      >
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Admin Registration Portal</CardTitle>
            <CardDescription>
              Complete the following steps to access the admin dashboard
            </CardDescription>
            <div className="pt-4">
              <Progress value={progress} className="w-full h-2" />
              <p className="text-xs text-right mt-1 text-muted-foreground">{progress}% Complete</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {steps.map((step, index) => {
                // Only show steps that meet their conditions
                if (!step.condition()) return null;
                
                const isActive = index + 1 === currentStep;
                const isCompleted = index + 1 < currentStep;
                
                return (
                  <div 
                    key={`step-${index}`}
                    className={`flex items-center p-3 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-primary/10 border border-primary/30' 
                        : isCompleted
                        ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900'
                        : 'bg-muted border border-transparent'
                    }`}
                  >
                    <div className={`rounded-full p-2 mr-3 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        isActive 
                          ? 'text-foreground' 
                          : isCompleted
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-muted-foreground'
                      }`}>
                        {step.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {isCompleted && (
                      <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
            <Button 
              onClick={goToCurrentStep}
              disabled={!steps[currentStep - 1]?.route}
            >
              {currentStep === steps.length ? 'Go to Dashboard' : 'Continue Registration'}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminPortal;