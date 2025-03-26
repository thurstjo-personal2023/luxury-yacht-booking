/**
 * Payout Accounts Table Component
 * 
 * Displays a table of payout accounts with verification actions
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle
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
import { Switch } from '@/components/ui/switch';

import { PayoutAccount, PayoutMethod, UserType } from '../../../../shared/payment-schema';
import { usePayoutAccounts } from '@/hooks/use-payouts';

// Helper function to format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  
  // Handle both Firestore Timestamp objects and ISO date strings
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'MMM d, yyyy h:mm a');
};

// Format Payment Method
const formatPayoutMethod = (method: PayoutMethod) => {
  switch (method) {
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'paypal':
      return 'PayPal';
    case 'stripe':
      return 'Stripe';
    case 'manual':
      return 'Manual';
    default:
      return method;
  }
};

// Format User Type
const formatUserType = (type: UserType) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

interface PayoutAccountsTableProps {
  accounts: PayoutAccount[];
}

interface VerifyAccountDialogProps {
  account: PayoutAccount;
  isOpen: boolean;
  onClose: () => void;
}

const VerifyAccountDialog: React.FC<VerifyAccountDialogProps> = ({ 
  account, 
  isOpen, 
  onClose 
}) => {
  const [notes, setNotes] = useState('');
  const [isVerified, setIsVerified] = useState(account.isVerified);
  const { verifyAccount, isVerifying } = usePayoutAccounts();
  
  const handleSubmit = () => {
    verifyAccount({
      accountId: account.id,
      verificationData: {
        isVerified,
        notes: notes.trim() || undefined
      }
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
          <DialogTitle>Verify Payout Account</DialogTitle>
          <DialogDescription>
            Review and verify this payout account for {formatUserType(account.userType)} user.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Account ID</Label>
            <div className="col-span-3 font-mono text-sm">{account.id}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Account Name</Label>
            <div className="col-span-3 font-medium">{account.accountName}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Method</Label>
            <div className="col-span-3">{formatPayoutMethod(account.payoutMethod)}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right">Verification</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                checked={isVerified}
                onCheckedChange={setIsVerified}
                id="verified-status"
              />
              <Label htmlFor="verified-status" className="cursor-pointer">
                {isVerified ? 'Verified' : 'Not Verified'}
              </Label>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2">Notes</Label>
            <div className="col-span-3">
              <Textarea
                placeholder="Add verification notes"
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
            disabled={isVerifying}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isVerifying}
            variant={isVerified ? "default" : "destructive"}
          >
            {isVerifying ? 'Updating...' : isVerified ? 'Verify Account' : 'Mark as Not Verified'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface AccountDetailsDialogProps {
  account: PayoutAccount | null;
  isOpen: boolean;
  onClose: () => void;
}

const AccountDetailsDialog: React.FC<AccountDetailsDialogProps> = ({ 
  account, 
  isOpen, 
  onClose 
}) => {
  if (!account) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Payout Account Details</DialogTitle>
          <DialogDescription>
            Complete details for {account.accountName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account ID:</span>
                  <span className="font-mono">{account.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono">{account.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Type:</span>
                  <span>{formatUserType(account.userType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span>
                    {account.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification:</span>
                  <span>
                    {account.isVerified ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Unverified</Badge>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payout Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-medium">{account.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span>{formatPayoutMethod(account.payoutMethod)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span>{account.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="capitalize">{account.preferredFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatTimestamp(account.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {account.bankDetails && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Name:</span>
                  <span>{account.bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span className="font-mono">
                    {"•".repeat(Math.max(0, account.bankDetails.accountNumber.length - 4))}
                    {account.bankDetails.accountNumber.slice(-4)}
                  </span>
                </div>
                {account.bankDetails.routingNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Routing Number:</span>
                    <span className="font-mono">
                      {"•".repeat(Math.max(0, account.bankDetails.routingNumber.length - 4))}
                      {account.bankDetails.routingNumber.slice(-4)}
                    </span>
                  </div>
                )}
                {account.bankDetails.iban && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IBAN:</span>
                    <span className="font-mono">
                      {"•".repeat(Math.max(0, account.bankDetails.iban.length - 4))}
                      {account.bankDetails.iban.slice(-4)}
                    </span>
                  </div>
                )}
                {account.bankDetails.swiftCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SWIFT Code:</span>
                    <span className="font-mono">{account.bankDetails.swiftCode}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {account.paypalDetails && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">PayPal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PayPal Email:</span>
                  <span>{account.paypalDetails.email}</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {account.stripeDetails && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stripe Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account ID:</span>
                  <span className="font-mono">{account.stripeDetails.accountId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{account.stripeDetails.connectedAccountStatus}</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {account.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{account.notes}</p>
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

const PayoutAccountsTable: React.FC<PayoutAccountsTableProps> = ({ accounts }) => {
  const [selectedAccount, setSelectedAccount] = useState<PayoutAccount | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const handleVerifyAccount = (account: PayoutAccount) => {
    setSelectedAccount(account);
    setVerifyDialogOpen(true);
  };
  
  const handleViewDetails = (account: PayoutAccount) => {
    setSelectedAccount(account);
    setDetailsDialogOpen(true);
  };
  
  const closeVerifyDialog = () => {
    setVerifyDialogOpen(false);
    setSelectedAccount(null);
  };
  
  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedAccount(null);
  };
  
  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No payout accounts found
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{account.userId}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatUserType(account.userType)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatPayoutMethod(account.payoutMethod)}</TableCell>
                    <TableCell>
                      {account.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.isVerified ? (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm">Unverified</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatTimestamp(account.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(account)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleVerifyAccount(account)}>
                            {account.isVerified ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Unverify Account
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify Account
                              </>
                            )}
                          </DropdownMenuItem>
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
      {selectedAccount && verifyDialogOpen && (
        <VerifyAccountDialog
          account={selectedAccount}
          isOpen={verifyDialogOpen}
          onClose={closeVerifyDialog}
        />
      )}
      
      {selectedAccount && detailsDialogOpen && (
        <AccountDetailsDialog
          account={selectedAccount}
          isOpen={detailsDialogOpen}
          onClose={closeDetailsDialog}
        />
      )}
    </>
  );
};

export default PayoutAccountsTable;