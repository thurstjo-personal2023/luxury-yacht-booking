import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LockKeyhole, 
  Mail, 
  Phone, 
  ClipboardCheck, 
  Shield, 
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { useAdminVerification, AdminVerificationProvider } from '@/providers/admin-verification-provider';

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

// Step item animations
const stepItemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

// Success animation
const successVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15
    }
  }
};

/**
 * Admin Portal Inner Component
 * 
 * This component handles the actual portal rendering using the verification context
 */
const AdminPortalInner: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get verification state from context
  const { 
    userId, 
    verificationState, 
    loading, 
    error, 
    refreshStatus, 
    currentStepIndex,
    progressPercentage,
    resetError
  } = useAdminVerification();
  
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
      condition: () => verificationState?.isEmailVerified === true,
    },
    { 
      name: 'Approval', 
      icon: <ClipboardCheck className="w-5 h-5" />,
      description: 'Wait for approval from a super admin',
      route: userId ? `/admin-pending-approval/${userId}` : '',
      condition: () => verificationState?.isEmailVerified === true && verificationState?.isPhoneVerified === true,
    },
    { 
      name: 'MFA Setup', 
      icon: <Shield className="w-5 h-5" />,
      description: 'Set up multi-factor authentication',
      route: userId ? `/admin-mfa-options/${userId}` : '',
      condition: () => verificationState?.isEmailVerified === true && 
                        verificationState?.isPhoneVerified === true && 
                        verificationState?.isApproved === true,
    },
    { 
      name: 'Dashboard', 
      icon: <Shield className="w-5 h-5" />,
      description: 'Access the admin dashboard',
      route: '/admin-dashboard',
      condition: () => verificationState?.isEmailVerified === true && 
                        verificationState?.isPhoneVerified === true && 
                        verificationState?.isApproved === true && 
                        verificationState?.isMfaEnabled === true,
    },
  ];
  
  // Navigate to current step
  const goToCurrentStep = () => {
    // Find the current active step
    const activeStep = steps.find((step, index) => 
      index + 1 === currentStepIndex && step.condition()
    );
    
    if (activeStep && activeStep.route) {
      navigate(activeStep.route);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    resetError();
    refreshStatus();
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
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Portal content with registration complete
  const registrationComplete = verificationState?.registrationComplete;
  
  return (
    <AnimatePresence mode="wait">
      {registrationComplete ? (
        <motion.div
          key="admin-complete"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-900"
        >
          <Card className="w-full max-w-md shadow-lg transform transition-all hover:shadow-xl motion-safe:hover:scale-[1.01]">
            <CardHeader className="space-y-1 text-center">
              <motion.div 
                className="flex justify-center mb-4"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 15,
                    delay: 0.2
                  }
                }}
              >
                <div className="h-24 w-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-14 w-14 text-green-600 dark:text-green-400" />
                </div>
              </motion.div>
              <CardTitle className="text-2xl font-bold">Registration Complete!</CardTitle>
              <CardDescription>
                Your administrator account is now fully set up and ready to use.
              </CardDescription>
              <div className="pt-4">
                <Progress value={100} className="w-full h-2" />
                <p className="text-xs text-right mt-1 text-muted-foreground">100% Complete</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <motion.div 
                className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900 text-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  transition: {
                    delay: 0.5
                  }
                }}
              >
                <p className="text-green-700 dark:text-green-400 font-medium">All verification steps completed successfully</p>
                <p className="text-sm text-green-600/80 dark:text-green-500/80 mt-1">
                  You can now access the administrator dashboard
                </p>
              </motion.div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button 
                onClick={() => navigate('/admin-dashboard')}
                className="px-8"
              >
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="admin-portal"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-900"
        >
          <Card className="w-full max-w-md shadow-lg transform transition-all hover:shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Admin Registration Portal</CardTitle>
              <CardDescription>
                Complete the following steps to access the admin dashboard
              </CardDescription>
              <div className="pt-4">
                <Progress value={progressPercentage} className="w-full h-2" />
                <p className="text-xs text-right mt-1 text-muted-foreground">{progressPercentage}% Complete</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {steps.map((step, index) => {
                  // Only show steps that meet their conditions
                  if (!step.condition()) return null;
                  
                  const isActive = index + 1 === currentStepIndex;
                  const isCompleted = index + 1 < currentStepIndex;
                  
                  return (
                    <motion.div 
                      key={`step-${index}`}
                      className={`flex items-center p-3 rounded-md transition-colors ${
                        isActive 
                          ? 'bg-primary/10 border border-primary/30' 
                          : isCompleted
                          ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900'
                          : 'bg-muted border border-transparent'
                      }`}
                      variants={stepItemVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      custom={index}
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
                        <motion.div 
                          className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center"
                          variants={successVariants}
                          initial="initial"
                          animate="animate"
                        >
                          <CheckCircle className="h-3 w-3 text-white" />
                        </motion.div>
                      )}
                    </motion.div>
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
              disabled={!steps[currentStepIndex - 1]?.route}
            >
              {currentStepIndex === steps.length ? 'Go to Dashboard' : 'Continue Registration'}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
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
  
  return (
    <AdminVerificationProvider initialUserId={userId}>
      <AdminPortalInner />
    </AdminVerificationProvider>
  );
};

export default AdminPortal;