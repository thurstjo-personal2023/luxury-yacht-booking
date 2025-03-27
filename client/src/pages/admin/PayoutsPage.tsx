/**
 * Payouts Management Page
 * 
 * This page provides a comprehensive interface for managing payouts
 * in the Etoile Yachts platform. It includes functionality for:
 * - Viewing and managing payout transactions
 * - Creating new payout transactions
 * - Managing payout accounts
 * - Handling payout disputes
 * - Configuring global payout settings
 */
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { Loader2, CreditCard, Wallet, Shield, Settings, AlertTriangle, PlusCircle } from 'lucide-react';
import withAdminLayout from '@/components/admin/withAdminLayout';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../components/ui/page-header';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Dashboard-specific components for payout management
import PayoutTransactionsTable from '@/components/admin/payouts/PayoutTransactionsTable';
import PayoutAccountsTable from '@/components/admin/payouts/PayoutAccountsTable';
import PayoutSettingsForm from '@/components/admin/payouts/PayoutSettingsForm';
import PayoutDisputesTable from '@/components/admin/payouts/PayoutDisputesTable';
import PayoutDetailsView from '@/components/admin/payouts/PayoutDetailsView';
import NewTransactionDialog from '@/components/admin/payouts/NewTransactionDialog';

// Hooks for data fetching and mutations
import { 
  usePayoutTransactions, 
  usePayoutAccounts, 
  usePayoutSettings,
  usePayoutDisputes 
} from '@/hooks/use-payouts';

// Types
import { 
  PayoutSettings as PayoutSettingsType,
  PayoutTransaction,
  PayoutAccount,
  PayoutDispute
} from '../../../shared/payment-schema';

// Optional status badge for overall system health
const StatusBadge: React.FC<{ isHealthy: boolean }> = ({ isHealthy }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`rounded-full w-3 h-3 ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Payout System: {isHealthy ? 'Operational' : 'Issues Detected'}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Page statistics display
const PayoutStats: React.FC<{
  transactions: PayoutTransaction[] | null | undefined;
  accounts: PayoutAccount[] | null | undefined;
  disputes: PayoutDispute[] | null | undefined;
  settings: PayoutSettingsType | null | undefined;
}> = ({ transactions = [], accounts = [], disputes = [], settings }) => {
  // Calculate key metrics
  const pendingPayouts = Array.isArray(transactions) 
    ? transactions.filter(t => t.status === 'pending' || t.status === 'approved').length
    : 0;
    
  const totalPaidThisMonth = Array.isArray(transactions)
    ? transactions
        .filter(t => {
          const date = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt || 0);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && t.status === 'completed';
        })
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;
    
  const pendingDisputes = Array.isArray(disputes)
    ? disputes.filter(d => d.status === 'open').length
    : 0;
    
  const unverifiedAccounts = Array.isArray(accounts)
    ? accounts.filter(a => !a.isVerified).length
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingPayouts}</div>
          <p className="text-xs text-muted-foreground">
            Transactions awaiting processing
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Paid This Month</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD',
              maximumFractionDigits: 0
            }).format(totalPaidThisMonth)}
          </div>
          <p className="text-xs text-muted-foreground">
            {Array.isArray(transactions) ? transactions.filter(t => t.status === 'completed').length : 0} completed transactions
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingDisputes}</div>
          <p className="text-xs text-muted-foreground">
            Active disputes requiring review
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Account Verification</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unverifiedAccounts}</div>
          <p className="text-xs text-muted-foreground">
            Accounts awaiting verification
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const PayoutsPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('transactions');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PayoutTransaction | null>(null);
  const [detailsViewOpen, setDetailsViewOpen] = useState(false);
  
  // Fetch data using custom hooks
  const { 
    data: transactions = [], 
    isLoading: isLoadingTransactions 
  } = usePayoutTransactions();
  
  const { 
    data: accounts = [], 
    isLoading: isLoadingAccounts 
  } = usePayoutAccounts();
  
  const { 
    data: disputes = [], 
    isLoading: isLoadingDisputes 
  } = usePayoutDisputes();
  
  const { 
    data: settings, 
    isLoading: isLoadingSettings 
  } = usePayoutSettings();
  
  // Determine if everything is loading
  const isLoading = isLoadingTransactions || isLoadingAccounts || isLoadingDisputes || isLoadingSettings;
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Navigate to admin dashboard
  const handleBackToDashboard = () => {
    setLocation('/admin-dashboard');
  };
  
  // Handle viewing transaction details
  const handleViewTransactionDetails = (transaction: PayoutTransaction) => {
    setSelectedTransaction(transaction);
    setDetailsViewOpen(true);
  };
  
  // Handle closing transaction details view
  const handleCloseDetailsView = () => {
    setDetailsViewOpen(false);
    setSelectedTransaction(null);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Helmet>
        <title>Payout Management - Etoile Yachts Admin</title>
      </Helmet>
      
      <PageHeader
        title="Payout Management"
        description="Manage payouts, accounts, and disputes across the platform"
      />
      
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin-dashboard">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/payouts">Payouts</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading payout data...</span>
        </div>
      ) : (
        <>
          <PayoutStats 
            transactions={transactions} 
            accounts={accounts} 
            disputes={disputes} 
            settings={settings}
          />
          
          <Tabs defaultValue="transactions" value={activeTab} onValueChange={handleTabChange}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="transactions" className="relative">
                  Transactions
                  {Array.isArray(transactions) && transactions.filter((t: any) => t.status === 'pending').length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                      {transactions.filter((t: any) => t.status === 'pending').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accounts" className="relative">
                  Accounts
                  {Array.isArray(accounts) && accounts.filter((a: any) => !a.isVerified).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                      {accounts.filter((a: any) => !a.isVerified).length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="disputes" className="relative">
                  Disputes
                  {Array.isArray(disputes) && disputes.filter((d: any) => d.status === 'open').length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                      {disputes.filter((d: any) => d.status === 'open').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              {activeTab === 'transactions' && (
                <Button onClick={() => setCreateDialogOpen(true)} size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Transaction
                </Button>
              )}
            </div>
            
            <TabsContent value="transactions" className="space-y-4">
              {detailsViewOpen && selectedTransaction ? (
                <PayoutDetailsView 
                  transaction={selectedTransaction}
                  onClose={handleCloseDetailsView}
                  onUpdateStatus={(newStatus) => {
                    // Optionally refresh data or update local state on status change
                    handleCloseDetailsView();
                  }}
                />
              ) : (
                <>
                  {!Array.isArray(transactions) || transactions.length === 0 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No transactions found</AlertTitle>
                      <AlertDescription>
                        No payout transactions have been created yet. Use the "New Transaction" button to create one.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <PayoutTransactionsTable 
                      transactions={transactions} 
                      onViewDetails={handleViewTransactionDetails}
                    />
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="accounts" className="space-y-4">
              {!Array.isArray(accounts) || accounts.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No accounts found</AlertTitle>
                  <AlertDescription>
                    No payout accounts have been created yet. Accounts are created when users set up their payment details.
                  </AlertDescription>
                </Alert>
              ) : (
                <PayoutAccountsTable accounts={accounts} />
              )}
            </TabsContent>
            
            <TabsContent value="disputes" className="space-y-4">
              {!Array.isArray(disputes) || disputes.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No disputes found</AlertTitle>
                  <AlertDescription>
                    No payout disputes have been created yet. Disputes are created when users contest a transaction.
                  </AlertDescription>
                </Alert>
              ) : (
                <PayoutDisputesTable disputes={disputes} />
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <PayoutSettingsForm settings={settings} />
            </TabsContent>
          </Tabs>
          
          {createDialogOpen && (
            <NewTransactionDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              accounts={accounts}
            />
          )}
        </>
      )}
    </div>
  );
};

export default withAdminLayout(PayoutsPage);