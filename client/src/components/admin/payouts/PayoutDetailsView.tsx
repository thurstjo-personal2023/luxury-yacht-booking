/**
 * Payout Transaction Details View
 * 
 * This component provides a detailed view of a payout transaction
 * including all related information, status history, and actions.
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Check, 
  X, 
  Download, 
  FileText, 
  CreditCard, 
  User, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

import { PayoutTransaction, PayoutStatus, PayoutAccount } from '../../../../../shared/payment-schema';
import { usePayoutTransactions, usePayoutAccounts } from '@/hooks/use-payouts';

// Helper function to format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  
  // Handle both Firestore Timestamp objects and ISO date strings
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'MMM d, yyyy h:mm a');
};

// Format currency values
const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Format User Type
const formatUserType = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Status badge colors
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  on_hold: 'bg-gray-50 text-gray-700 border-gray-200'
};

// Status label mapping
const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
  on_hold: 'On Hold'
};

interface PayoutDetailsViewProps {
  transaction: PayoutTransaction;
  onClose: () => void;
  onUpdateStatus?: (status: PayoutStatus) => void;
}

const PayoutDetailsView: React.FC<PayoutDetailsViewProps> = ({ 
  transaction, 
  onClose,
  onUpdateStatus
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const { updateTransactionStatus, isUpdatingStatus } = usePayoutTransactions();
  const { data: accounts = [] } = usePayoutAccounts();
  
  // Find the associated account
  const account = Array.isArray(accounts) ? accounts.find(acc => acc.id === transaction.accountId) : null;
  
  // Get status update timestamps
  const timelineEvents = [
    { status: 'created', timestamp: transaction.createdAt, label: 'Created' },
    transaction.processedAt && { 
      status: 'processing', 
      timestamp: transaction.processedAt, 
      label: 'Processing Started' 
    },
    transaction.completedAt && { 
      status: 'completed', 
      timestamp: transaction.completedAt, 
      label: 'Completed'
    }
  ].filter(Boolean);
  
  // Handle status update
  const handleStatusUpdate = (newStatus: PayoutStatus, notes?: string) => {
    updateTransactionStatus(
      {
        transactionId: transaction.id,
        status: newStatus,
        notes
      }, 
      {
        onSuccess: () => {
          setStatusDialogOpen(false);
          if (onUpdateStatus) {
            onUpdateStatus(newStatus);
          }
          toast({
          title: 'Status updated',
          description: `Transaction status updated to ${statusLabels[newStatus]}`
        });
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: 'Failed to update status',
          description: error.message || 'An error occurred'
        });
      }
    });
  };
  
  // Handle email notification
  const handleSendEmail = () => {
    // In a real implementation, this would send an email via your backend
    toast({
      title: 'Email notification sent',
      description: 'The user has been notified about their transaction'
    });
    setEmailDialogOpen(false);
  };
  
  // Export transaction data
  const handleExportData = () => {
    // Create a JSON string of the transaction data
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transaction, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `transaction_${transaction.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Transaction Details</h2>
          <p className="text-muted-foreground">
            Detailed information for transaction #{transaction.id.substring(0, 8)}
          </p>
        </div>
        <Button onClick={onClose} variant="outline">
          Close Details
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Transaction Summary</CardTitle>
              <Badge variant="outline" className={statusColors[transaction.status]}>
                {statusLabels[transaction.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-gray-100">
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">Amount</dt>
                <dd className="col-span-2 text-sm font-semibold">
                  {formatCurrency(transaction.amount, transaction.currency)}
                </dd>
              </div>
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">Payout Method</dt>
                <dd className="col-span-2 text-sm">
                  {transaction.payoutMethod.replace('_', ' ').toUpperCase()}
                </dd>
              </div>
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                <dd className="col-span-2 text-sm">{formatTimestamp(transaction.createdAt)}</dd>
              </div>
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                <dd className="col-span-2 text-sm">{transaction.description}</dd>
              </div>
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">Reference</dt>
                <dd className="col-span-2 text-sm font-mono text-xs">
                  {transaction.paymentReference || 'N/A'}
                </dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="flex justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusDialogOpen(true)}
              disabled={transaction.status === 'completed'}
            >
              Update Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailDialogOpen(true)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Notify User
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recipient Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-gray-100">
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                <dd className="col-span-2 text-sm font-mono text-xs truncate">
                  {transaction.userId}
                </dd>
              </div>
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">User Type</dt>
                <dd className="col-span-2 text-sm">{formatUserType(transaction.userType)}</dd>
              </div>
              <div className="grid grid-cols-3 py-2">
                <dt className="text-sm font-medium text-muted-foreground">Account</dt>
                <dd className="col-span-2 text-sm font-mono text-xs truncate">
                  {transaction.accountId}
                </dd>
              </div>
              {account && (
                <>
                  <div className="grid grid-cols-3 py-2">
                    <dt className="text-sm font-medium text-muted-foreground">Account Type</dt>
                    <dd className="col-span-2 text-sm">
                      {account.accountType.replace('_', ' ').toUpperCase()}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 py-2">
                    <dt className="text-sm font-medium text-muted-foreground">Verified</dt>
                    <dd className="col-span-2 text-sm">
                      {account.isVerified ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center text-amber-600">
                          <AlertTriangle className="h-4 w-4 mr-1" /> No
                        </span>
                      )}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Additional Details</TabsTrigger>
          <TabsTrigger value="timeline">Status Timeline</TabsTrigger>
          {transaction.notes && <TabsTrigger value="notes">Notes</TabsTrigger>}
          {transaction.bookingIds && transaction.bookingIds.length > 0 && (
            <TabsTrigger value="bookings">Related Bookings</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="details" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                Complete information about this payout transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transaction.processorData ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Processor Data</h3>
                  <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-xs max-h-[200px]">
                    {JSON.stringify(transaction.processorData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">No additional details available</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportData}
                className="ml-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Transaction Data
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
              <CardDescription>
                History of status changes for this transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-gray-200 ml-3">
                {timelineEvents.map((event, idx) => (
                  <li key={idx} className="mb-6 ml-6">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
                      <Clock className="w-3 h-3 text-blue-800" />
                    </span>
                    <h3 className="flex items-center mb-1 text-sm font-semibold">
                      {event.label}
                      {idx === 0 && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded ml-3">
                          Initial
                        </span>
                      )}
                      {idx === timelineEvents.length - 1 && event.status === 'completed' && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded ml-3">
                          Final
                        </span>
                      )}
                    </h3>
                    <time className="block mb-2 text-xs font-normal text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </time>
                  </li>
                ))}
              </ol>
              
              {timelineEvents.length === 0 && (
                <div className="text-center py-6">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">No timeline events available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {transaction.notes && (
          <TabsContent value="notes" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="whitespace-pre-line">{transaction.notes}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {transaction.bookingIds && transaction.bookingIds.length > 0 && (
          <TabsContent value="bookings" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Related Bookings</CardTitle>
                <CardDescription>
                  Bookings associated with this payout transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transaction.bookingIds.map((bookingId: string, idx: number) => (
                    <Card key={idx} className="overflow-hidden">
                      <div className="flex items-center p-4">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">Booking #{idx + 1}</p>
                          <p className="text-xs font-mono text-muted-foreground">{bookingId}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(`/admin-dashboard/bookings/${bookingId}`, '_blank')}
                        >
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Transaction Status</DialogTitle>
            <DialogDescription>
              Change the status of transaction {transaction.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label className="text-right">Current Status</Label>
              <div className="col-span-3">
                <Badge variant="outline" className={statusColors[transaction.status]}>
                  {statusLabels[transaction.status]}
                </Badge>
              </div>
            </div>
            
            <StatusUpdateForm 
              currentStatus={transaction.status}
              onCancel={() => setStatusDialogOpen(false)}
              onSubmit={handleStatusUpdate}
              isPending={isUpdatingStatus}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Email Notification Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send an email notification about this transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label className="text-right">Recipient</Label>
              <div className="col-span-3 font-medium">
                User {transaction.userId.substring(0, 8)}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label className="text-right pt-2">Message</Label>
              <div className="col-span-3">
                <Textarea
                  placeholder="Write a custom message for the user"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The system will automatically include transaction details.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail}>
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update this transaction's status? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface StatusUpdateFormProps {
  currentStatus: PayoutStatus;
  onCancel: () => void;
  onSubmit: (status: PayoutStatus, notes?: string) => void;
  isPending: boolean;
}

const StatusUpdateForm: React.FC<StatusUpdateFormProps> = ({
  currentStatus,
  onCancel,
  onSubmit,
  isPending
}) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      status: '',
      notes: ''
    }
  });
  
  const selectedStatus = watch('status');
  
  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data.status as PayoutStatus, data.notes))}>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4 items-start">
          <Label className="text-right pt-2">New Status</Label>
          <div className="col-span-3">
            <RadioGroup
              className="space-y-2"
              value={selectedStatus}
              onValueChange={(value) => register('status').onChange({ target: { value } })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" disabled={currentStatus === 'pending'} />
                <Label htmlFor="pending" className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                  Pending
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="approved" id="approved" disabled={currentStatus === 'approved'} />
                <Label htmlFor="approved" className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-blue-600" />
                  Approved
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="processing" id="processing" disabled={currentStatus === 'processing'} />
                <Label htmlFor="processing" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-purple-600" />
                  Processing
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="completed" disabled={currentStatus === 'completed'} />
                <Label htmlFor="completed" className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Completed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rejected" id="rejected" disabled={currentStatus === 'rejected'} />
                <Label htmlFor="rejected" className="flex items-center">
                  <X className="h-4 w-4 mr-2 text-red-600" />
                  Rejected
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on_hold" id="on_hold" disabled={currentStatus === 'on_hold'} />
                <Label htmlFor="on_hold" className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-gray-600" />
                  On Hold
                </Label>
              </div>
            </RadioGroup>
            {errors.status && (
              <p className="text-sm text-red-500 mt-1">Please select a status</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 items-start">
          <Label className="text-right pt-2">Status Notes</Label>
          <div className="col-span-3">
            <Textarea
              placeholder="Add notes explaining the status change"
              {...register('notes')}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isPending || !selectedStatus || selectedStatus === currentStatus}
          >
            {isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PayoutDetailsView;