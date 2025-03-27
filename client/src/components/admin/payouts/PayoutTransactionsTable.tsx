/**
 * Payout Transactions Table Component
 * 
 * Displays a table of payout transactions with status management actions
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  Eye, 
  Check, 
  X, 
  CreditCard, 
  AlertTriangle, 
  ExternalLink,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { PayoutTransaction, PayoutStatus, UserType } from '../../../../../shared/payment-schema';
import { usePayoutTransactions } from '@/hooks/use-payouts';

// Helper function to format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  
  // Handle both Firestore Timestamp objects and ISO date strings
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'MMM d, yyyy h:mm a');
};

// Format User Type
const formatUserType = (type: UserType) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Format currency values
const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
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

interface PayoutTransactionsTableProps {
  transactions: PayoutTransaction[];
  onViewDetails?: (transaction: PayoutTransaction) => void;
}

interface StatusUpdateDialogProps {
  transaction: PayoutTransaction;
  isOpen: boolean;
  onClose: () => void;
}

interface TransactionDetailsDialogProps {
  transaction: PayoutTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({ 
  transaction, 
  isOpen, 
  onClose 
}) => {
  const [status, setStatus] = useState<PayoutStatus>(transaction.status);
  const [notes, setNotes] = useState('');
  const { updateTransactionStatus, isUpdatingStatus } = usePayoutTransactions();
  
  const handleSubmit = () => {
    updateTransactionStatus({
      transactionId: transaction.id,
      status,
      notes: notes.trim() || undefined
    }, {
      onSuccess: () => {
        onClose();
        setNotes('');
      }
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Transaction Status</DialogTitle>
          <DialogDescription>
            Change the status of transaction {transaction.id}
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
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Amount</Label>
            <div className="col-span-3 font-medium">
              {formatCurrency(transaction.amount, transaction.currency)}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2">New Status</Label>
            <div className="col-span-3">
              <RadioGroup 
                value={status} 
                onValueChange={(value: PayoutStatus) => setStatus(value)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="pending" disabled={transaction.status === 'pending'} />
                  <Label htmlFor="pending" className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                    Pending
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approved" id="approved" disabled={transaction.status === 'approved'} />
                  <Label htmlFor="approved" className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-blue-600" />
                    Approved
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="processing" id="processing" disabled={transaction.status === 'processing'} />
                  <Label htmlFor="processing" className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-purple-600" />
                    Processing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="completed" disabled={transaction.status === 'completed'} />
                  <Label htmlFor="completed" className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Completed
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rejected" id="rejected" disabled={transaction.status === 'rejected'} />
                  <Label htmlFor="rejected" className="flex items-center">
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Rejected
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="on_hold" id="on_hold" disabled={transaction.status === 'on_hold'} />
                  <Label htmlFor="on_hold" className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-gray-600" />
                    On Hold
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2">Status Notes</Label>
            <div className="col-span-3">
              <Textarea
                placeholder="Add notes explaining the status change"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isUpdatingStatus}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isUpdatingStatus || status === transaction.status}
          >
            {isUpdatingStatus ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TransactionDetailsDialog: React.FC<TransactionDetailsDialogProps> = ({ 
  transaction, 
  isOpen, 
  onClose 
}) => {
  if (!transaction) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Complete details for transaction {transaction.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Transaction Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono">{transaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={statusColors[transaction.status]}>
                    {statusLabels[transaction.status]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatTimestamp(transaction.createdAt)}</span>
                </div>
                {transaction.processedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processed:</span>
                    <span>{formatTimestamp(transaction.processedAt)}</span>
                  </div>
                )}
                {transaction.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed:</span>
                    <span>{formatTimestamp(transaction.completedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span>{transaction.payoutMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-mono text-xs truncate max-w-[160px]">{transaction.accountId}</span>
                </div>
                {transaction.paymentReference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="font-mono">{transaction.paymentReference}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recipient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono">{transaction.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Type:</span>
                <span>{formatUserType(transaction.userType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span>{transaction.description}</span>
              </div>
            </CardContent>
          </Card>
          
          {transaction.bookingIds && transaction.bookingIds.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Related Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {transaction.bookingIds.map((bookingId: string, index: number) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      className="text-left justify-start"
                      onClick={() => window.open(`/bookings/${bookingId}`, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      <span className="font-mono text-xs truncate">{bookingId}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {transaction.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}
          
          {transaction.processorData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Processor Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-[200px]">
                  {JSON.stringify(transaction.processorData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayoutTransactionsTable: React.FC<PayoutTransactionsTableProps> = ({ 
  transactions,
  onViewDetails
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<PayoutTransaction | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const handleUpdateStatus = (transaction: PayoutTransaction) => {
    setSelectedTransaction(transaction);
    setStatusDialogOpen(true);
  };
  
  const handleViewDetails = (transaction: PayoutTransaction) => {
    if (onViewDetails) {
      onViewDetails(transaction);
    } else {
      setSelectedTransaction(transaction);
      setDetailsDialogOpen(true);
    }
  };
  
  const closeStatusDialog = () => {
    setStatusDialogOpen(false);
    setSelectedTransaction(null);
  };
  
  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedTransaction(null);
  };
  
  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">
                      {transaction.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[120px]">
                          {transaction.userId.substring(0, 8)}...
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatUserType(transaction.userType)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[transaction.status]}>
                        {statusLabels[transaction.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {transaction.payoutMethod}
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(transaction.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          
                          {/* Don't allow status changes for completed transactions */}
                          {transaction.status !== 'completed' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateStatus(transaction)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Update Status
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Dialogs */}
      {selectedTransaction && statusDialogOpen && (
        <StatusUpdateDialog
          transaction={selectedTransaction}
          isOpen={statusDialogOpen}
          onClose={closeStatusDialog}
        />
      )}
      
      {selectedTransaction && detailsDialogOpen && (
        <TransactionDetailsDialog
          transaction={selectedTransaction}
          isOpen={detailsDialogOpen}
          onClose={closeDetailsDialog}
        />
      )}
    </>
  );
};

export default PayoutTransactionsTable;