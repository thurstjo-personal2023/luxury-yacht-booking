/**
 * User Management Component
 * 
 * This component provides an interface for managing administrator accounts,
 * including viewing, editing, and approving admin users.
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Search,
  Plus,
  Filter,
  RefreshCw,
  Eye,
  User,
  Mail,
  Building2,
  Briefcase
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Components
import AdminLayout from '../../components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';

// Custom Components
import AdminInviteForm from '../../components/admin/AdminInviteForm';
import AdminDetailView from '../../components/admin/AdminDetailView';
import ConfirmationDialog from '../../components/admin/ConfirmationDialog';

// Utilities
import { 
  formatDate, 
  formatDateTime, 
  formatTimeDifference, 
  getRoleBadgeColor, 
  getStatusBadgeColor, 
  formatAdminRole, 
  formatAdminStatus,
  hasPermission
} from '@/utils/admin-utils';

// Hooks
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/use-admin-auth';

// Types
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
  department: string;
  position: string;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_APPROVAL';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface AdminUserResponse {
  admins: AdminUser[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface AdminStats {
  totalAdmins: number;
  byStatus: {
    active: number;
    pending: number;
    disabled: number;
  };
  byRole: {
    superAdmin: number;
    admin: number;
    moderator: number;
  };
}

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const { adminUser } = useAdminAuth();
  const { toast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!adminUser) {
      setLocation('/admin-login');
    }
  }, [adminUser, setLocation]);

  // Query params
  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.append('status', statusFilter);
  if (roleFilter) queryParams.append('role', roleFilter);
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', ((page - 1) * limit).toString());
  
  // Get admin users
  const {
    data: userData,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useQuery<AdminUserResponse>({
    queryKey: ['/api/admin/users', statusFilter, roleFilter, page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch admin users');
      }
      return response.json();
    },
    enabled: !!adminUser
  });
  
  // Get admin stats
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError
  } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      return response.json();
    },
    enabled: !!adminUser
  });
  
  // Get pending approvals
  const {
    data: pendingData,
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending
  } = useQuery<{ pendingAdmins: AdminUser[] }>({
    queryKey: ['/api/admin/pending-approvals'],
    queryFn: async () => {
      const response = await fetch('/api/admin/pending-approvals');
      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }
      return response.json();
    },
    enabled: !!adminUser && hasPermission(adminUser.role, 'ADMIN')
  });

  // Handle pagination
  const totalPages = userData?.pagination?.total 
    ? Math.ceil(userData.pagination.total / limit) 
    : 1;
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };
  
  // Handle approve/reject admin
  const handleProcessApproval = async (adminId: string, approved: boolean, notes: string = '') => {
    try {
      const response = await fetch('/api/admin/process-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminId,
          approved,
          notes
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process approval');
      }
      
      toast({
        title: approved ? 'Admin Approved' : 'Admin Rejected',
        description: approved 
          ? 'The administrator account has been approved successfully.'
          : 'The administrator account has been rejected.',
      });
      
      // Refetch pending approvals
      refetchPending();
      refetchUsers();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };
  
  // State for detail view and confirmation dialogs
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ adminId: string; newRole: string; } | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState<{ adminId: string; newStatus: string; } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  
  // Handle change role
  const handleRoleChange = async (adminId: string, newRole: string) => {
    try {
      // Convert from UI role format (SUPER_ADMIN) to backend format (super_admin)
      const backendRole = newRole.toLowerCase();
      
      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: backendRole
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update admin role');
      }
      
      toast({
        title: 'Role Updated',
        description: `Administrator role has been updated to ${newRole}.`,
      });
      
      // Refetch users
      refetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };
  
  // Handle disable/enable admin
  const handleStatusChange = async (adminId: string, newStatus: 'ACTIVE' | 'DISABLED') => {
    try {
      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update admin status');
      }
      
      toast({
        title: 'Status Updated',
        description: `Administrator status has been updated to ${newStatus}.`,
      });
      
      // Refetch users
      refetchUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };
  
  // Filtered and sorted admin users
  const filteredAdmins = userData?.admins?.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.position.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Helper for rendering status badges
  const getStatusBadge = (status: string) => {
    // Get the appropriate icon based on status
    let StatusIcon;
    switch (status) {
      case 'ACTIVE':
        StatusIcon = CheckCircle2;
        break;
      case 'DISABLED':
        StatusIcon = XCircle;
        break;
      case 'PENDING_APPROVAL':
        StatusIcon = Clock;
        break;
      default:
        StatusIcon = Clock;
    }
    
    return (
      <Badge className={getStatusBadgeColor(status)}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {formatAdminStatus(status)}
      </Badge>
    );
  };
  
  // Helper for rendering role badges
  const getRoleBadge = (role: string) => {
    // Get the appropriate icon based on role
    let RoleIcon;
    switch (role.toUpperCase()) {
      case 'SUPER_ADMIN':
        RoleIcon = ShieldAlert;
        break;
      case 'ADMIN':
        RoleIcon = ShieldCheck;
        break;
      case 'MODERATOR':
        RoleIcon = Shield;
        break;
      default:
        RoleIcon = UserCog;
    }
    
    return (
      <Badge className={getRoleBadgeColor(role)}>
        <RoleIcon className="h-3 w-3 mr-1" />
        {formatAdminRole(role)}
      </Badge>
    );
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  return (
    <AdminLayout>
      <Helmet>
        <title>User Management | Etoile Yachts Admin</title>
      </Helmet>
      
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Administrator Management</h1>
          <p className="text-muted-foreground">
            Manage administrator accounts, roles, and permissions
          </p>
        </div>
        
        <Tabs defaultValue="all-users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all-users">All Administrators</TabsTrigger>
            
            {/* Only show Pending Approvals tab to users with Admin permissions or higher */}
            {adminUser && hasPermission(adminUser.role, 'ADMIN') && (
              <TabsTrigger value="pending" className="relative">
                Pending Approval
                {!pendingLoading && pendingData?.pendingAdmins && pendingData.pendingAdmins.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingData.pendingAdmins.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          {/* All Users Tab */}
          <TabsContent value="all-users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    Administrators
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => refetchUsers()}>
                      <RefreshCw className="h-4 w-4" />
                      <span className="hidden md:inline">Refresh</span>
                    </Button>
                    {adminUser && hasPermission(adminUser.role, 'ADMIN') && (
                      <Button 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => setShowInviteForm(true)}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden md:inline">Invite Admin</span>
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  View and manage all administrator accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters and search */}
                <div className="mb-4 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search administrators..."
                      className="w-full pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-row gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DISABLED">Disabled</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Role Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Roles</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MODERATOR">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Error state */}
                {usersError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load administrator data. Please try again.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Table of users */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Administrator</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        // Loading state
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={`loading-${index}`}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-3 w-[150px]" />
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-9 w-[100px]" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredAdmins.length === 0 ? (
                        // Empty state
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No administrators found
                          </TableCell>
                        </TableRow>
                      ) : (
                        // Data rows
                        filteredAdmins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell>
                              <div className="font-medium">{admin.name}</div>
                              <div className="text-sm text-muted-foreground">{admin.email}</div>
                            </TableCell>
                            <TableCell>{getRoleBadge(admin.role)}</TableCell>
                            <TableCell>
                              <div>{admin.department}</div>
                              <div className="text-sm text-muted-foreground">{admin.position}</div>
                            </TableCell>
                            <TableCell>{getStatusBadge(admin.status)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {formatDate(admin.lastLoginAt)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    Actions
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Manage Admin</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  
                                  {/* View Details - Always available */}
                                  <DropdownMenuItem onClick={() => setSelectedAdminId(admin.id)}>
                                    View Details
                                  </DropdownMenuItem>
                                  
                                  {/* Role Management - Only for Super Admins */}
                                  {adminUser && hasPermission(adminUser.role, 'SUPER_ADMIN') && (
                                    <>
                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem 
                                        disabled={admin.role.toUpperCase() === 'SUPER_ADMIN' && statsData?.byRole.superAdmin === 1}
                                        onClick={() => handleRoleChange(admin.id, 'SUPER_ADMIN')}
                                      >
                                        Set as Super Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        disabled={admin.role.toUpperCase() === 'ADMIN'}
                                        onClick={() => handleRoleChange(admin.id, 'ADMIN')}
                                      >
                                        Set as Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        disabled={admin.role.toUpperCase() === 'MODERATOR'}
                                        onClick={() => handleRoleChange(admin.id, 'MODERATOR')}
                                      >
                                        Set as Moderator
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  
                                  {/* Status Management - For Super Admins and Admins */}
                                  {adminUser && hasPermission(adminUser.role, 'ADMIN') && (
                                    <>
                                      <DropdownMenuSeparator />
                                      
                                      {admin.status === 'ACTIVE' ? (
                                        <DropdownMenuItem 
                                          disabled={
                                            (admin.role.toUpperCase() === 'SUPER_ADMIN' && statsData?.byRole.superAdmin === 1) ||
                                            // Prevent non-Super Admins from disabling Super Admins
                                            (admin.role.toUpperCase() === 'SUPER_ADMIN' && !hasPermission(adminUser.role, 'SUPER_ADMIN'))
                                          }
                                          onClick={() => handleStatusChange(admin.id, 'DISABLED')}
                                          className="text-red-600"
                                        >
                                          Disable Account
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem 
                                          disabled={
                                            // Prevent non-Super Admins from enabling Super Admins
                                            (admin.role.toUpperCase() === 'SUPER_ADMIN' && !hasPermission(adminUser.role, 'SUPER_ADMIN'))
                                          }
                                          onClick={() => handleStatusChange(admin.id, 'ACTIVE')}
                                          className="text-green-600"
                                        >
                                          Enable Account
                                        </DropdownMenuItem>
                                      )}
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
                </div>

                {/* Pagination */}
                {!usersLoading && userData?.pagination && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(page - 1)}
                            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                          // Show at most 5 pages around current page
                          let pageNum = index + 1;
                          
                          if (totalPages > 5) {
                            if (page <= 3) {
                              pageNum = index + 1;
                            } else if (page >= totalPages - 2) {
                              pageNum = totalPages - 4 + index;
                            } else {
                              pageNum = page - 2 + index;
                            }
                          }
                          
                          return (
                            <PaginationItem key={`page-${pageNum}`}>
                              <PaginationLink
                                isActive={pageNum === page}
                                onClick={() => handlePageChange(pageNum)}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(page + 1)}
                            className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pending Approval Tab */}
          <TabsContent value="pending">
            {adminUser && hasPermission(adminUser.role, 'ADMIN') ? (
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Approvals
                  </span>
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => refetchPending()}>
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden md:inline">Refresh</span>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Review and approve or reject pending administrator registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Error state */}
                {pendingError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load pending approvals. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
                
                {pendingLoading ? (
                  // Loading state
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Card key={`loading-pending-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-[250px]" />
                              <Skeleton className="h-4 w-[200px]" />
                              <div className="flex gap-2 mt-2">
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-4 w-[100px]" />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2 md:mt-0">
                              <Skeleton className="h-9 w-[100px]" />
                              <Skeleton className="h-9 w-[100px]" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : !pendingData?.pendingAdmins || pendingData.pendingAdmins.length === 0 ? (
                  // Empty state
                  <div className="text-center py-10">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No Pending Approvals</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      All administrator registrations have been processed.
                    </p>
                  </div>
                ) : (
                  // Pending admins list
                  <div className="space-y-4">
                    {pendingData.pendingAdmins.map((admin) => (
                      <Card key={admin.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                              <h3 className="font-medium">{admin.name}</h3>
                              <p className="text-sm text-muted-foreground">{admin.email}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {getRoleBadge(admin.role)}
                                <Badge variant="outline">
                                  {admin.department} - {admin.position}
                                </Badge>
                                <Badge variant="secondary">
                                  Registered {formatDate(admin.createdAt)}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2 md:mt-0">
                              {adminUser && hasPermission(adminUser.role, 'ADMIN') && (
                                <>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleProcessApproval(admin.id, false, 'Registration rejected by administrator')}
                                  >
                                    <XCircle className="mr-1 h-4 w-4" />
                                    Reject
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleProcessApproval(admin.id, true, 'Registration approved by administrator')}
                                  >
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    Approve
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            ) : (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-950 rounded-md border">
                <div className="text-center">
                  <ShieldOff className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Permission Required</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                    You don't have permission to view pending approvals.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="analytics">
            {adminUser && hasPermission(adminUser.role, 'MODERATOR') ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Admin Count Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Administrators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-12 w-20" />
                    ) : (
                      <div className="text-4xl font-bold">
                        {statsData?.totalAdmins || 0}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Status Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Badge variant="success" className="mr-2">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                          <div>{statsData?.byStatus.active || 0}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Badge variant="destructive" className="mr-2">
                              <XCircle className="h-3 w-3 mr-1" />
                              Disabled
                            </Badge>
                          </div>
                          <div>{statsData?.byStatus.disabled || 0}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                          <div>{statsData?.byStatus.pending || 0}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Role Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Role Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Badge variant="default" className="mr-2 bg-red-600">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              Super Admin
                            </Badge>
                          </div>
                          <div>{statsData?.byRole.superAdmin || 0}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Badge variant="default" className="mr-2 bg-blue-600">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          </div>
                          <div>{statsData?.byRole.admin || 0}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Badge variant="default" className="mr-2 bg-green-600">
                              <Shield className="h-3 w-3 mr-1" />
                              Moderator
                            </Badge>
                          </div>
                          <div>{statsData?.byRole.moderator || 0}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-950 rounded-md border">
                <div className="text-center">
                  <ShieldOff className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Permission Required</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                    You don't have sufficient permission to access analytics data.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {/* Admin Invite Form */}
      <AdminInviteForm
        isOpen={showInviteForm}
        onClose={() => setShowInviteForm(false)}
        onSuccess={() => {
          refetchUsers();
          setShowInviteForm(false);
        }}
      />

      {/* Admin Detail View */}
      {selectedAdminId && (
        <AdminDetailView
          isOpen={!!selectedAdminId}
          onClose={() => setSelectedAdminId(null)}
          admin={userData?.admins.find(admin => admin.id === selectedAdminId) || null}
          currentUserRole={adminUser?.role || ''}
          onRoleChange={(adminId: string, role: string) => {
            setConfirmRoleChange({ adminId, newRole: role });
          }}
          onStatusChange={(adminId: string, status: string) => {
            setConfirmStatusChange({ adminId, newStatus: status });
          }}
        />
      )}

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={!!confirmRoleChange}
        onClose={() => setConfirmRoleChange(null)}
        onConfirm={() => {
          if (confirmRoleChange) {
            handleRoleChange(confirmRoleChange.adminId, confirmRoleChange.newRole);
            setConfirmRoleChange(null);
          }
        }}
        title="Change Administrator Role"
        description={
          confirmRoleChange 
            ? `Are you sure you want to change this administrator's role to ${
                confirmRoleChange.newRole === 'SUPER_ADMIN' 
                  ? 'Super Admin' 
                  : confirmRoleChange.newRole === 'ADMIN' 
                    ? 'Admin' 
                    : 'Moderator'
              }? This will modify their permissions on the platform.`
            : ''
        }
        confirmText="Change Role"
      />
      
      <ConfirmationDialog
        isOpen={!!confirmStatusChange}
        onClose={() => setConfirmStatusChange(null)}
        onConfirm={() => {
          if (confirmStatusChange) {
            handleStatusChange(confirmStatusChange.adminId, confirmStatusChange.newStatus as 'ACTIVE' | 'DISABLED');
            setConfirmStatusChange(null);
          }
        }}
        title={confirmStatusChange?.newStatus === 'ACTIVE' ? 'Activate Account' : 'Disable Account'}
        description={
          confirmStatusChange
            ? confirmStatusChange.newStatus === 'ACTIVE'
              ? 'Are you sure you want to activate this administrator account? They will regain access to the platform.'
              : 'Are you sure you want to disable this administrator account? They will no longer be able to access the platform.'
            : ''
        }
        confirmText={confirmStatusChange?.newStatus === 'ACTIVE' ? 'Activate' : 'Disable'}
        variant={confirmStatusChange?.newStatus === 'ACTIVE' ? 'default' : 'destructive'}
      />
    </AdminLayout>
  );
}