/**
 * Payout Transactions Table Component
 * 
 * Displays a table of payout transactions with actions for status updates
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle, 
  PauseCircle,
  PlayCircle
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

import { PayoutTransaction, PayoutStatus } from '../../../../shared/payment-schema';
import { usePayoutTransactions } from '@/hooks/use-payouts';

// Helper function to format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  
  // Handle both Firestore Timestamp objects and ISO date strings
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'MMM d, yyyy h:mm a');
};

// Helper function to render status badge
const getStatusBadge = (status: PayoutStatus) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>;
    case 'processing':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Processing</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    case 'on_hold':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">On Hold</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

// Format currency values
const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

interface PayoutTransactionsTableProps {
  transactions: PayoutTransaction[];
}

interface UpdateStatusDialogProps {
  transaction: PayoutTransaction;
  newStatus: PayoutStatus;
  isOpen: boolean;
  onClose: () => void;
}

const UpdateStatusDialog: React.FC<UpdateStatusDialogProps> = ({ 
  transaction, 
  newStatus, 
  isOpen, 
  onClose 
}) => {
  const [notes, setNotes] = useState('');
  const { updateTransactionStatus, isUpdatingStatus } = usePayoutTransactions();
  
  const statusLabels = {
    'pending': 'Pending',
    'approved': 'Approved',
    'processing': 'Processing',
    'completed': 'Completed',
    'rejected': 'Rejected',
    'on_hold': 'On Hold'
  };
  
  const handleSubmit = () => {
    updateTransactionStatus({
      transactionId: transaction.id,
      status: newStatus,
      notes: notes.trim() || undefined
    }, {
      onSuccess: () => {
        onClose();
        setNotes('');
      }
    });
  };
  
  const getStatusDescription = () => {
    switch (newStatus) {
      case 'approved':
        return 'The payout has been approved and is ready for processing.';
      case 'processing':
        return 'The payout is now being processed by the payment provider.';
      case 'completed':
        return 'The payout has been successfully completed and funds have been transferred.';
      case 'rejected':
        return 'The payout has been rejected and will not be processed.';
      case 'on_hold':
        return 'The payout has been placed on hold pending further review.';
      default:
        return 'Update the status of this payout transaction.';
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Payout Status</DialogTitle>
          <DialogDescription>
            {getStatusDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Payout ID</Label>
            <div className="col-span-3 font-mono text-sm">{transaction.id}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Amount</Label>
            <div className="col-span-3 font-semibold">
              {formatCurrency(transaction.amount, transaction.currency)}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Current Status</Label>
            <div className="col-span-3">
              {getStatusBadge(transaction.status)}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">New Status</Label>
            <div className="col-span-3">
              {getStatusBadge(newStatus)}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2">Notes</Label>
            <div className="col-span-3">
              <Textarea
                placeholder="Add optional notes about this status update"
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
            disabled={isUpdatingStatus}
          >
            Update to {statusLabels[newStatus]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface TransactionDetailsDialogProps {
  transaction: PayoutTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

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
          <DialogTitle>Payout Transaction Details</DialogTitle>
          <DialogDescription>
            Complete details for payout transaction
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
                  <span>{getStatusBadge(transaction.status)}</span>
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
                <CardTitle className="text-sm font-medium">Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee:</span>
                  <span>{formatCurrency(transaction.platformFee, transaction.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Amount:</span>
                  <span className="font-semibold">{formatCurrency(transaction.netAmount, transaction.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="capitalize">{transaction.payoutMethod.replace('_', ' ')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono">{transaction.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Type:</span>
                <span className="capitalize">{transaction.userType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account ID:</span>
                <span className="font-mono">{transaction.accountId}</span>
              </div>
            </CardContent>
          </Card>
          
          {transaction.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}
          
          {transaction.relatedBookings && transaction.relatedBookings.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Related Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  {transaction.relatedBookings.map((bookingId, index) => (
                    <div key={index} className="font-mono">{bookingId}</div>
                  ))}
                </div>
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

const PayoutTransactionsTable: React.FC<PayoutTransactionsTableProps> = ({ transactions }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<PayoutTransaction | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<PayoutStatus>('pending');
  
  const handleStatusUpdate = (transaction: PayoutTransaction, status: PayoutStatus) => {
    setSelectedTransaction(transaction);
    setNewStatus(status);
    setStatusDialogOpen(true);
  };
  
  const handleViewDetails = (transaction: PayoutTransaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };
  
  const closeStatusDialog = () => {
    setStatusDialogOpen(false);
    setSelectedTransaction(null);
  };
  
  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedTransaction(null);
  };
  
  // Determine available actions based on current status
  const getAvailableActions = (transaction: PayoutTransaction) => {
    const { status } = transaction;
    
    switch (status) {
      case 'pending':
        return [
          { label: 'Approve', status: 'approved' as PayoutStatus, icon: CheckCircle },
          { label: 'Reject', status: 'rejected' as PayoutStatus, icon: XCircle },
          { label: 'Hold', status: 'on_hold' as PayoutStatus, icon: PauseCircle }
        ];
      case 'approved':
        return [
          { label: 'Process', status: 'processing' as PayoutStatus, icon: PlayCircle },
          { label: 'Hold', status: 'on_hold' as PayoutStatus, icon: PauseCircle },
          { label: 'Reject', status: 'rejected' as PayoutStatus, icon: XCircle }
        ];
      case 'processing':
        return [
          { label: 'Complete', status: 'completed' as PayoutStatus, icon: CheckCircle },
          { label: 'Hold', status: 'on_hold' as PayoutStatus, icon: PauseCircle }
        ];
      case 'on_hold':
        return [
          { label: 'Resume', status: 'approved' as PayoutStatus, icon: PlayCircle },
          { label: 'Reject', status: 'rejected' as PayoutStatus, icon: XCircle }
        ];
      case 'rejected':
      case 'completed':
      default:
        return [];
    }
  };
  
  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
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
                    No payout transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{transaction.userId}</span>
                        <span className="text-xs text-muted-foreground capitalize">{transaction.userType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell className="capitalize">{transaction.payoutMethod.replace('_', ' ')}</TableCell>
                    <TableCell>{formatTimestamp(transaction.createdAt)}</TableCell>
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
                          
                          {getAvailableActions(transaction).length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              {getAvailableActions(transaction).map((action, index) => {
                                const ActionIcon = action.icon;
                                return (
                                  <DropdownMenuItem 
                                    key={index}
                                    onClick={() => handleStatusUpdate(transaction, action.status)}
                                  >
                                    <ActionIcon className="mr-2 h-4 w-4" />
                                    {action.label}
                                  </DropdownMenuItem>
                                );
                              })}
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
        <UpdateStatusDialog
          transaction={selectedTransaction}
          newStatus={newStatus}
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