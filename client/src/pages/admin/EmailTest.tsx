import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { sendTestEmail } from '@/services/email-service';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function EmailTest() {
  const [selectedTemplate, setSelectedTemplate] = useState<'welcome' | 'booking' | 'reset'>('welcome');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendTestEmail = async () => {
    setIsSending(true);
    try {
      await sendTestEmail(selectedTemplate);
      toast({
        title: 'Test email sent',
        description: `A test ${selectedTemplate} email has been sent to the configured test email address.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Failed to send test email',
        description: 'There was an error sending the test email. Please check console for details.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Email System Test</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Email Template Tester</CardTitle>
            <CardDescription>
              Send a test email to verify that the email system is working correctly. 
              Test emails will be sent to the configured test email address in the 
              Firestore Send Email extension.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Email Template</h3>
              
              <RadioGroup
                value={selectedTemplate}
                onValueChange={(value) => setSelectedTemplate(value as 'welcome' | 'booking' | 'reset')}
                className="grid gap-4"
              >
                <div className="flex items-center space-x-2 border p-4 rounded-md">
                  <RadioGroupItem value="welcome" id="welcome" />
                  <Label htmlFor="welcome" className="flex-1 cursor-pointer">
                    <div className="font-medium">Welcome Email</div>
                    <div className="text-sm text-muted-foreground">
                      Send a test welcome email to new users
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border p-4 rounded-md">
                  <RadioGroupItem value="booking" id="booking" />
                  <Label htmlFor="booking" className="flex-1 cursor-pointer">
                    <div className="font-medium">Booking Confirmation</div>
                    <div className="text-sm text-muted-foreground">
                      Send a test booking confirmation email
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border p-4 rounded-md">
                  <RadioGroupItem value="reset" id="reset" />
                  <Label htmlFor="reset" className="flex-1 cursor-pointer">
                    <div className="font-medium">Password Reset</div>
                    <div className="text-sm text-muted-foreground">
                      Send a test password reset email with instructions
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator />
            
            <Button 
              onClick={handleSendTestEmail} 
              disabled={isSending}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              {isSending ? 'Sending Test Email...' : 'Send Test Email'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Email System Information</CardTitle>
            <CardDescription>
              Details about the email system configuration and status.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Email Provider</h3>
                  <p>Firebase Send Email Extension</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Template Storage</h3>
                  <p>Firestore Database (emails collection)</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Available Templates</h3>
                  <ul className="list-disc list-inside text-sm">
                    <li>Welcome Email</li>
                    <li>Booking Confirmation</li>
                    <li>Password Reset</li>
                    <li>Verification Email</li>
                    <li>Yacht Update Notification</li>
                    <li>Add-on Approval Notification</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Email Trigger</h3>
                  <p>Documents added to the 'mail' collection in Firestore</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}