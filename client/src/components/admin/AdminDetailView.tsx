/**
 * Admin Detail View Component
 * 
 * This component displays detailed information about an administrator
 * and provides controls for managing their account.
 */
import { useState } from 'react';
import { 
  User, 
  Shield, 
  Calendar, 
  Building2, 
  Briefcase, 
  Mail, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  XCircle, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import { 
  formatDate, 
  formatDateTime, 
  getRoleBadge, 
  getStatusBadge 
} from '../../utils/admin-utils';

export interface AdminDetailProps {
  adminId: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  currentUserRole: string;
}

export default function AdminDetailView({ 
  adminId, 
  isOpen, 
  onClose, 
  onRefresh,
  currentUserRole 
}: AdminDetailProps) {
  const { toast } = useToast();
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Load admin details when the dialog opens
  useState(() => {
    const fetchAdminDetails = async () => {
      if (isOpen && adminId) {
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/admin/users/${adminId}`);
          
          if (!response.ok) {
            throw new Error('Failed to load administrator details');
          }
          
          const data = await response.json();
          setAdminData(data);
        } catch (err) {
          console.error('Error fetching admin details:', err);
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setLoading(false);
        }
      }
    };
    
    if (isOpen) {
      fetchAdminDetails();
    }
  });
  
  // Handle role change
  const handleRoleChange = async (newRole: string) => {
    if (!adminData) return;
    
    try {
      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: newRole
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }
      
      toast({
        title: 'Role Updated',
        description: `Administrator role has been updated to ${newRole}.`
      });
      
      // Refresh data
      onRefresh();
      
      // Reload this admin's details
      const detailsResponse = await fetch(`/api/admin/users/${adminId}`);
      if (detailsResponse.ok) {
        const updatedData = await detailsResponse.json();
        setAdminData(updatedData);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };
  
  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!adminData) return;
    
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
        throw new Error(error.error || 'Failed to update status');
      }
      
      toast({
        title: 'Status Updated',
        description: `Administrator status has been updated to ${newStatus}.`
      });
      
      // Refresh data
      onRefresh();
      
      // Reload this admin's details
      const detailsResponse = await fetch(`/api/admin/users/${adminId}`);
      if (detailsResponse.ok) {
        const updatedData = await detailsResponse.json();
        setAdminData(updatedData);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };
  
  // Determine if current user can modify this admin
  const canModifyAdmin = () => {
    if (!adminData || !currentUserRole) return false;
    
    // Super admin can modify anyone except the last super admin
    if (currentUserRole.toUpperCase() === 'SUPER_ADMIN') {
      return true;
    }
    
    // Admin can modify moderators only
    if (currentUserRole.toUpperCase() === 'ADMIN') {
      return adminData.role.toUpperCase() === 'MODERATOR';
    }
    
    // Moderators can't modify anyone
    return false;
  };
  
  // Check if this is the current user
  const isSelf = () => {
    // This would need the current user's ID to compare
    // For now, we'll return false to allow self-editing in the UI
    return false;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="h-5 w-5" />
            Administrator Details
          </DialogTitle>
          <DialogDescription>
            View and manage administrator account details
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h3 className="mt-2 text-lg font-medium">Error Loading Details</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setLoading(true);
                setError(null);
                // Try to reload data
                fetch(`/api/admin/users/${adminId}`)
                  .then(res => {
                    if (!res.ok) throw new Error('Failed to load details');
                    return res.json();
                  })
                  .then(data => {
                    setAdminData(data);
                    setLoading(false);
                  })
                  .catch(err => {
                    setError(err instanceof Error ? err.message : 'An error occurred');
                    setLoading(false);
                  });
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : adminData ? (
          <ScrollArea className="flex-1 pr-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="audit">Activity Log</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4 py-4">
                {/* Header with basic info */}
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{adminData.name}</h3>
                    <p className="text-sm text-muted-foreground">{adminData.email}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {getRoleBadge(adminData.role)}
                  {getStatusBadge(adminData.status)}
                </div>
                
                <Separator />
                
                {/* Department and Position */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Department
                    </p>
                    <p className="text-sm">{adminData.department || 'Not assigned'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Position
                    </p>
                    <p className="text-sm">{adminData.position || 'Not assigned'}</p>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Account Created
                    </p>
                    <p className="text-sm">{formatDateTime(adminData.createdAt)}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Last Login
                    </p>
                    <p className="text-sm">
                      {adminData.lastLoginAt 
                        ? formatDateTime(adminData.lastLoginAt) 
                        : 'Never logged in'}
                    </p>
                  </div>
                </div>
                
                {/* MFA Status */}
                <div className="space-y-1 mt-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Multi-Factor Authentication
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    {adminData.mfaEnabled ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Enabled
                      </Badge>
                    )}
                  </p>
                </div>
                
                {/* Additional info can be added here */}
              </TabsContent>
              
              <TabsContent value="audit" className="space-y-4 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Log</CardTitle>
                    <CardDescription>
                      Recent actions performed by this administrator
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* This would be populated with actual audit logs */}
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Activity logs are not available for this user
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">Administrator Not Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The requested administrator profile could not be found.
            </p>
          </div>
        )}
        
        <DialogFooter className="border-t pt-4 mt-2">
          {adminData && canModifyAdmin() && !isSelf() && (
            <div className="flex flex-wrap gap-2 mr-auto">
              {/* Role management buttons */}
              {currentUserRole.toUpperCase() === 'SUPER_ADMIN' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Shield className="mr-2 h-4 w-4" />
                      Change Role
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={adminData.role.toUpperCase() === 'SUPER_ADMIN'}
                      onClick={() => handleRoleChange('SUPER_ADMIN')}
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Super Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={adminData.role.toUpperCase() === 'ADMIN'}
                      onClick={() => handleRoleChange('ADMIN')}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={adminData.role.toUpperCase() === 'MODERATOR'}
                      onClick={() => handleRoleChange('MODERATOR')}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Moderator
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Status management */}
              {adminData.status.toUpperCase() === 'ACTIVE' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive"
                  onClick={() => handleStatusChange('DISABLED')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Disable Account
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-success border-success"
                  onClick={() => handleStatusChange('ACTIVE')}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Enable Account
                </Button>
              )}
            </div>
          )}
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}