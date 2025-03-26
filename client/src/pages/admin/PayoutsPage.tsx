/**
 * Payouts Management Page for Admin Panel
 * 
 * This page provides an interface for administrators to manage payouts
 * including transactions, accounts, settings, and dispute resolution.
 */
import React, { useState } from 'react';
import { Link } from 'wouter';
import { Helmet } from 'react-helmet';
import { 
  Banknote, 
  CreditCard, 
  Users, 
  Settings as SettingsIcon, 
  AlertTriangle, 
  Filter,
  PlusCircle,
  ChevronDown,
  Calendar,
  ChevronsUpDown,
  Printer,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Custom components for Payouts
import PayoutTransactionsTable from '@/components/admin/payouts/PayoutTransactionsTable';
import PayoutAccountsTable from '@/components/admin/payouts/PayoutAccountsTable';
import PayoutSettingsForm from '@/components/admin/payouts/PayoutSettingsForm';
import PayoutDisputesTable from '@/components/admin/payouts/PayoutDisputesTable';
import NewTransactionDialog from '@/components/admin/payouts/NewTransactionDialog';

// Hooks and utilities
import withAdminLayout from '@/components/layouts/withAdminLayout';
import { 
  usePayoutTransactions, 
  usePayoutAccounts, 
  usePayoutSettings, 
  usePayoutDisputes 
} from '@/hooks/use-payouts';
import { PayoutStatus, PayoutTransaction } from '../../shared/payment-schema';

const PayoutsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { 
    transactions, 
    isLoading: transactionsLoading, 
    isError: transactionsError 
  } = usePayoutTransactions();
  
  const { 
    accounts, 
    isLoading: accountsLoading, 
    isError: accountsError 
  } = usePayoutAccounts();
  
  const { 
    settings, 
    isLoading: settingsLoading, 
    isError: settingsError 
  } = usePayoutSettings();
  
  const { 
    disputes, 
    isLoading: disputesLoading, 
    isError: disputesError 
  } = usePayoutDisputes();
  
  // Filter transactions based on status and search query
  const filteredTransactions = transactions?.filter((transaction: PayoutTransaction) => {
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesSearch = 
      searchQuery === '' ||
      transaction.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  }) || [];

  // Calculate overview statistics
  const pendingAmount = transactions
    ?.filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  
  const completedAmount = transactions
    ?.filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  
  const activeAccounts = accounts?.filter(a => a.isActive)?.length || 0;
  const openDisputes = disputes?.filter(d => d.status === 'open')?.length || 0;
  
  // Format currency values
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      <Helmet>
        <title>Payout Management - Etoile Yachts Admin</title>
      </Helmet>
      
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payout Management</h1>
            <p className="text-muted-foreground">
              Manage payouts, accounts, settings, and disputes
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <NewTransactionDialog />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactionsLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  formatCurrency(pendingAmount)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions?.filter(t => t.status === 'pending').length || 0} pending transactions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Payouts</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactionsLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  formatCurrency(completedAmount)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions?.filter(t => t.status === 'completed').length || 0} completed transactions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Registered Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountsLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  activeAccounts
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {accounts?.filter(a => a.isVerified).length || 0} verified accounts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {disputesLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  openDisputes
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {disputes?.filter(d => d.status === 'under_review').length || 0} currently under review
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full border-b pb-0 pt-2 h-auto bg-transparent">
            <div className="flex justify-between items-center w-full pr-2">
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                <TabsTrigger value="transactions" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Banknote className="mr-2 h-4 w-4" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="accounts" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Users className="mr-2 h-4 w-4" />
                  Payment Accounts
                </TabsTrigger>
                <TabsTrigger value="disputes" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Disputes
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
              </div>
            </div>
          </TabsList>
          
          {/* Filters for Transactions */}
          {activeTab === 'transactions' && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Date Range</span>
              </Button>
              
              <Button variant="ghost" size="icon" title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            {transactionsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-full mb-4" />
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full mb-2" />
                  ))}
                </CardContent>
              </Card>
            ) : transactionsError ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Failed to load transactions</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading the payout transactions.
                  </p>
                  <Button>Retry</Button>
                </CardContent>
              </Card>
            ) : (
              <PayoutTransactionsTable transactions={filteredTransactions} />
            )}
          </TabsContent>
          
          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4">
            {accountsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-full mb-4" />
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full mb-2" />
                  ))}
                </CardContent>
              </Card>
            ) : accountsError ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Failed to load accounts</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading the payout accounts.
                  </p>
                  <Button>Retry</Button>
                </CardContent>
              </Card>
            ) : (
              <PayoutAccountsTable accounts={accounts || []} />
            )}
          </TabsContent>
          
          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-4">
            {disputesLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-full mb-4" />
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full mb-2" />
                  ))}
                </CardContent>
              </Card>
            ) : disputesError ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Failed to load disputes</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading the payout disputes.
                  </p>
                  <Button>Retry</Button>
                </CardContent>
              </Card>
            ) : (
              <PayoutDisputesTable disputes={disputes || []} />
            )}
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {settingsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-full mb-4" />
                  {Array(8).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full mb-4" />
                  ))}
                </CardContent>
              </Card>
            ) : settingsError ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Failed to load settings</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading the payout settings.
                  </p>
                  <Button>Retry</Button>
                </CardContent>
              </Card>
            ) : (
              <PayoutSettingsForm settings={settings} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default withAdminLayout(PayoutsPage);