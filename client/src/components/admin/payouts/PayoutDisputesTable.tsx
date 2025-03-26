/**
 * Payout Disputes Table Component
 * 
 * Displays a table of payout disputes with resolution actions
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText
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
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { PayoutDispute, UserType } from '../../../../shared/payment-schema';
import { usePayoutDisputes } from '@/hooks/use-payouts';

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

// Helper function to render status badge
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'open':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Open</Badge>;
    case 'under_review':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Under Review</Badge>;
    case 'resolved':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

interface PayoutDisputesTableProps {
  disputes: PayoutDispute[];
}

interface ResolveDisputeDialogProps {
  dispute: PayoutDispute;
  isOpen: boolean;
  onClose: () => void;
}

const ResolveDisputeDialog: React.FC<ResolveDisputeDialogProps> = ({ 
  dispute, 
  isOpen, 
  onClose 
}) => {
  const [resolution, setResolution] = useState<string>('resolved');
  const [notes, setNotes] = useState('');
  const { resolveDispute, isResolving } = usePayoutDisputes();
  
  const handleSubmit = () => {
    resolveDispute({
      disputeId: dispute.id,
      resolution,
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
          <DialogTitle>Resolve Payout Dispute</DialogTitle>
          <DialogDescription>
            Resolve this dispute by accepting or rejecting the claim.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Dispute ID</Label>
            <div className="col-span-3 font-mono text-sm">{dispute.id}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Payout ID</Label>
            <div className="col-span-3 font-mono text-sm">{dispute.payoutId}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Amount</Label>
            <div className="col-span-3 font-semibold">
              {formatCurrency(dispute.amount, dispute.currency)}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Current Status</Label>
            <div className="col-span-3">
              {getStatusBadge(dispute.status)}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2">Resolution</Label>
            <div className="col-span-3">
              <RadioGroup 
                value={resolution} 
                onValueChange={setResolution}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="resolved" id="resolved" />
                  <Label htmlFor="resolved" className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Accept and resolve
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rejected" id="rejected" />
                  <Label htmlFor="rejected" className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                    Reject claim
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2">Resolution Notes</Label>
            <div className="col-span-3">
              <Textarea
                placeholder="Add notes explaining the resolution decision"
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
            disabled={isResolving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isResolving}
            variant={resolution === 'resolved' ? 'default' : 'destructive'}
          >
            {isResolving ? 'Processing...' : resolution === 'resolved' ? 'Accept & Resolve' : 'Reject Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DisputeDetailsDialogProps {
  dispute: PayoutDispute | null;
  isOpen: boolean;
  onClose: () => void;
}

const DisputeDetailsDialog: React.FC<DisputeDetailsDialogProps> = ({ 
  dispute, 
  isOpen, 
  onClose 
}) => {
  if (!dispute) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Dispute Details</DialogTitle>
          <DialogDescription>
            Complete details for payout dispute
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dispute Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dispute ID:</span>
                  <span className="font-mono">{dispute.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout ID:</span>
                  <span className="font-mono">{dispute.payoutId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{getStatusBadge(dispute.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatTimestamp(dispute.createdAt)}</span>
                </div>
                {dispute.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved:</span>
                    <span>{formatTimestamp(dispute.resolvedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">User Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono">{dispute.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Type:</span>
                  <span>{formatUserType(dispute.userType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">
                    {formatCurrency(dispute.amount, dispute.currency)}
                  </span>
                </div>
                {dispute.resolvedBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved By:</span>
                    <span className="font-mono">{dispute.resolvedBy}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Dispute Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{dispute.reason}</p>
            </CardContent>
          </Card>
          
          {dispute.resolution && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{dispute.resolution}</p>
              </CardContent>
            </Card>
          )}
          
          {dispute.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{dispute.notes}</p>
              </CardContent>
            </Card>
          )}
          
          {dispute.attachments && dispute.attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dispute.attachments.map((url: string, index: number) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      className="text-left justify-start"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span className="truncate">Attachment {index + 1}</span>
                    </Button>
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

const PayoutDisputesTable: React.FC<PayoutDisputesTableProps> = ({ disputes }) => {
  const [selectedDispute, setSelectedDispute] = useState<PayoutDispute | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const handleResolveDispute = (dispute: PayoutDispute) => {
    setSelectedDispute(dispute);
    setResolveDialogOpen(true);
  };
  
  const handleViewDetails = (dispute: PayoutDispute) => {
    setSelectedDispute(dispute);
    setDetailsDialogOpen(true);
  };
  
  const closeResolveDialog = () => {
    setResolveDialogOpen(false);
    setSelectedDispute(null);
  };
  
  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedDispute(null);
  };
  
  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No payout disputes found
                  </TableCell>
                </TableRow>
              ) : (
                disputes.map((dispute: PayoutDispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="font-mono text-xs">{dispute.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[120px]">{dispute.userId}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatUserType(dispute.userType)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(dispute.amount, dispute.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                    <TableCell>{formatTimestamp(dispute.createdAt)}</TableCell>
                    <TableCell>
                      <div className="truncate max-w-[200px]">
                        {dispute.reason}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(dispute)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          
                          {(dispute.status === 'open' || dispute.status === 'under_review') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleResolveDispute(dispute)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Resolve Dispute
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
      {selectedDispute && resolveDialogOpen && (
        <ResolveDisputeDialog
          dispute={selectedDispute}
          isOpen={resolveDialogOpen}
          onClose={closeResolveDialog}
        />
      )}
      
      {selectedDispute && detailsDialogOpen && (
        <DisputeDetailsDialog
          dispute={selectedDispute}
          isOpen={detailsDialogOpen}
          onClose={closeDetailsDialog}
        />
      )}
    </>
  );
};

export default PayoutDisputesTable;