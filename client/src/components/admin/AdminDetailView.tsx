/**
 * Admin Detail View Component
 * 
 * This component displays detailed information about an administrator
 * including personal information, role, department, and status.
 */
import { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  ArrowLeftCircle,
  UserCog,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ConfirmationDialog from './ConfirmationDialog';

import { formatDate, formatDateTime, formatTimeDifference, getRoleBadge, getStatusBadge } from '../../utils/admin-utils';

// Types
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  position: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface AdminDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  currentUserRole: string;
  onRoleChange: (adminId: string, role: string) => void;
  onStatusChange: (adminId: string, status: string) => void;
}

export default function AdminDetailView({
  isOpen,
  onClose,
  admin,
  currentUserRole,
  onRoleChange,
  onStatusChange,
}: AdminDetailViewProps) {
  const [confirmRoleChange, setConfirmRoleChange] = useState<string | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState<string | null>(null);
  
  // Can't edit if no admin is selected
  if (!admin) return null;
  
  // Check if current user has permission to edit
  const canEdit = currentUserRole.toUpperCase() === 'SUPER_ADMIN' || 
    (currentUserRole.toUpperCase() === 'ADMIN' && admin.role.toUpperCase() !== 'SUPER_ADMIN');
  
  // Determine available roles based on current user's role
  const availableRoles = () => {
    if (currentUserRole.toUpperCase() === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];
    } else if (currentUserRole.toUpperCase() === 'ADMIN') {
      return ['ADMIN', 'MODERATOR'];
    } else {
      return [];
    }
  };
  
  // Handle role change confirmation
  const handleRoleChangeRequest = (role: string) => {
    setConfirmRoleChange(role);
  };
  
  // Handle status change confirmation
  const handleStatusChangeRequest = (status: string) => {
    setConfirmStatusChange(status);
  };
  
  // Execute role change
  const executeRoleChange = () => {
    if (confirmRoleChange && admin) {
      onRoleChange(admin.id, confirmRoleChange);
      setConfirmRoleChange(null);
    }
  };
  
  // Execute status change
  const executeStatusChange = () => {
    if (confirmStatusChange && admin) {
      onStatusChange(admin.id, confirmStatusChange);
      setConfirmStatusChange(null);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserCog className="h-5 w-5" />
            Administrator Details
          </DialogTitle>
          <DialogDescription>
            View and manage administrator information
          </DialogDescription>
        </DialogHeader>
        
        {/* Admin Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Column - Basic Info */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg">{admin.name}</h3>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                  <div className="mt-2">{getRoleBadge(admin.role)}</div>
                  <div className="mt-1">{getStatusBadge(admin.status)}</div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Department</h4>
                  <p className="flex items-center gap-1 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {admin.department}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Position</h4>
                  <p className="flex items-center gap-1 text-sm">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    {admin.position}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Additional Info */}
          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-md">Account Information</span>
                  
                  {canEdit && (
                    <div className="flex gap-2">
                      {/* Role Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Change Role
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {availableRoles().map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => handleRoleChangeRequest(role)}
                              disabled={admin.role.toUpperCase() === role}
                            >
                              {role === 'SUPER_ADMIN' ? 'Super Admin' : 
                               role === 'ADMIN' ? 'Admin' : 'Moderator'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Status Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant={admin.status.toUpperCase() === 'ACTIVE' ? 'destructive' : 'default'}
                            size="sm"
                          >
                            {admin.status.toUpperCase() === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleStatusChangeRequest('ACTIVE')}
                            disabled={admin.status.toUpperCase() === 'ACTIVE'}
                            className="text-green-600"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Activate Account
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChangeRequest('DISABLED')}
                            disabled={admin.status.toUpperCase() === 'DISABLED'}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Disable Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Email</h4>
                    <p className="flex items-center gap-1 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {admin.email}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Account Created</h4>
                    <p className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(admin.createdAt)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                    <p className="flex items-center gap-1 text-sm">
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDateTime(admin.updatedAt)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Last Login</h4>
                    <p className="flex items-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {admin.lastLoginAt ? formatTimeDifference(admin.lastLoginAt) : 'Never'}
                    </p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Access Permissions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Dashboard Access</span>
                      <Badge variant="success">Allowed</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">User Management</span>
                      <Badge variant={admin.role.toUpperCase() === 'MODERATOR' ? 'outline' : 'success'}>
                        {admin.role.toUpperCase() === 'MODERATOR' ? 'Limited' : 'Allowed'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Content Management</span>
                      <Badge variant="success">Allowed</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">System Settings</span>
                      <Badge variant={admin.role.toUpperCase() === 'SUPER_ADMIN' ? 'success' : 'outline'}>
                        {admin.role.toUpperCase() === 'SUPER_ADMIN' ? 'Allowed' : 'Restricted'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Media Validation</span>
                      <Badge variant="success">Allowed</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-1">
            <ArrowLeftCircle className="h-4 w-4" />
            Back to List
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={!!confirmRoleChange}
        onClose={() => setConfirmRoleChange(null)}
        onConfirm={executeRoleChange}
        title="Change Administrator Role"
        description={`Are you sure you want to change ${admin.name}'s role to ${confirmRoleChange === 'SUPER_ADMIN' ? 'Super Admin' : confirmRoleChange === 'ADMIN' ? 'Admin' : 'Moderator'}? This will modify their permissions on the platform.`}
        confirmText="Change Role"
      />
      
      <ConfirmationDialog
        isOpen={!!confirmStatusChange}
        onClose={() => setConfirmStatusChange(null)}
        onConfirm={executeStatusChange}
        title={confirmStatusChange === 'ACTIVE' ? 'Activate Account' : 'Disable Account'}
        description={confirmStatusChange === 'ACTIVE' 
          ? `Are you sure you want to activate ${admin.name}'s account? They will regain access to the platform.`
          : `Are you sure you want to disable ${admin.name}'s account? They will no longer be able to access the platform.`
        }
        confirmText={confirmStatusChange === 'ACTIVE' ? 'Activate' : 'Disable'}
        variant={confirmStatusChange === 'ACTIVE' ? 'default' : 'destructive'}
      />
    </Dialog>
  );
}