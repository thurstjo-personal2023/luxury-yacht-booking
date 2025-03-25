/**
 * AdminDetailView Component
 * 
 * This component displays detailed information about an administrator
 * and provides controls for super admins to manage administrator roles and status.
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  formatAdminRole,
  formatAdminDepartment,
  formatAdminStatus,
  formatTimestamp,
  hasPermission,
  getRoleBadgeColor,
  getStatusBadgeColor,
  getAdminRoles,
  getAvailableStatuses,
  logAdminActivity,
  ActivityType
} from '@/utils/admin-utils';
import { useToast } from '@/hooks/use-toast';

// Types for the admin user object
interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  department: string;
  position: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
  updatedAt?: string;
  phoneNumber?: string;
  photoURL?: string;
}

// Component props
interface AdminDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  currentUserRole: string;
  onRoleChange: (adminId: string, newRole: string) => void;
  onStatusChange: (adminId: string, newStatus: string) => void;
}

export default function AdminDetailView({
  isOpen,
  onClose,
  admin,
  currentUserRole,
  onRoleChange,
  onStatusChange
}: AdminDetailViewProps) {
  const [selectedTab, setSelectedTab] = useState('details');
  const { toast } = useToast();

  // Handle closing when admin is null (for safety)
  if (!admin) {
    return null;
  }

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'AU';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle role change
  const handleRoleChange = async (newRole: string) => {
    if (newRole === admin.role) return;
    
    // Log the action
    await logAdminActivity(
      'UPDATE_ADMIN',
      `Changed role for ${admin.email} from ${admin.role} to ${newRole}`,
      admin.id,
      'admin_user'
    );
    
    onRoleChange(admin.id, newRole);
  };

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === admin.status) return;
    
    const actionType = newStatus === 'ACTIVE' 
      ? 'ENABLE_ADMIN' 
      : newStatus === 'DISABLED'
        ? 'DISABLE_ADMIN'
        : newStatus === 'REJECTED'
          ? 'REJECT_ADMIN'
          : 'UPDATE_ADMIN';
    
    // Log the action
    await logAdminActivity(
      actionType,
      `Changed status for ${admin.email} from ${admin.status} to ${newStatus}`,
      admin.id,
      'admin_user'
    );
    
    onStatusChange(admin.id, newStatus);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <span>Administrator Details</span>
            <Badge className={getRoleBadgeColor(admin.role)}>
              {formatAdminRole(admin.role)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View and manage administrator information
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Admin profile quick view */}
          <div className="w-full md:w-1/3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={admin.photoURL || ''} alt={admin.displayName || admin.email} />
                  <AvatarFallback className="text-lg">
                    {getInitials(admin.displayName || admin.email)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-medium text-lg">{admin.displayName || admin.email}</h3>
                  <p className="text-muted-foreground text-sm">{admin.email}</p>
                </div>
                
                <div className="w-full">
                  <Badge 
                    className={`${getStatusBadgeColor(admin.status)} w-full py-1 text-sm`}
                    variant="outline"
                  >
                    {formatAdminStatus(admin.status)}
                  </Badge>
                </div>
                
                <div className="text-sm text-left w-full">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{formatAdminDepartment(admin.department)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="font-medium">{admin.position}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{formatTimestamp(admin.createdAt)}</span>
                  </div>
                  {admin.lastLogin && (
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Last Active:</span>
                      <span className="font-medium">{formatTimestamp(admin.lastLogin)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Admin details tabs */}
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="details" value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Personal and contact details for this administrator
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="p-2 border rounded-md bg-muted/20">{admin.email}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <div className="p-2 border rounded-md bg-muted/20">
                          {admin.phoneNumber || 'Not provided'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <div className="p-2 border rounded-md bg-muted/20">
                          {formatAdminDepartment(admin.department)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <div className="p-2 border rounded-md bg-muted/20">{admin.position}</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Account Timeline</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Account Created:</span>
                          <span>{formatTimestamp(admin.createdAt)}</span>
                        </div>
                        
                        {admin.lastLogin && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Last Login:</span>
                            <span>{formatTimestamp(admin.lastLogin)}</span>
                          </div>
                        )}
                        
                        {admin.updatedAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Last Updated:</span>
                            <span>{formatTimestamp(admin.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="permissions" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Role & Permissions</CardTitle>
                    <CardDescription>
                      Manage this administrator's role and access level
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="mb-2 block">Administrator Role</Label>
                      <div className="flex gap-4 items-center">
                        <Select
                          defaultValue={admin.role}
                          onValueChange={handleRoleChange}
                          disabled={!hasPermission(currentUserRole, 'SUPER_ADMIN')}
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Available Roles</SelectLabel>
                              {getAdminRoles().map((role: { value: string; label: string }) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        
                        <Badge className={getRoleBadgeColor(admin.role)}>
                          {formatAdminRole(admin.role)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {admin.role.toUpperCase() === 'SUPER_ADMIN' 
                          ? 'Super Administrators have full access to all platform features and can manage other administrators.'
                          : admin.role.toUpperCase() === 'ADMIN'
                            ? 'Administrators can manage content, user accounts, and settings, but cannot manage Super Administrators.'
                            : 'Moderators have limited access focused on content moderation and support tasks.'}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label className="mb-2 block">Account Status</Label>
                      <div className="flex gap-4 items-center">
                        <Select
                          defaultValue={admin.status}
                          onValueChange={handleStatusChange}
                          disabled={!hasPermission(currentUserRole, 'ADMIN')}
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Available Status Updates</SelectLabel>
                              {getAvailableStatuses(admin.status).map((status: { value: string; label: string }) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        
                        <Badge className={getStatusBadgeColor(admin.status)}>
                          {formatAdminStatus(admin.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {admin.status.toUpperCase() === 'ACTIVE' 
                          ? 'Active administrators have full access to their assigned permissions.'
                          : admin.status.toUpperCase() === 'DISABLED'
                            ? 'Disabled accounts cannot log in to the platform. The account can be reactivated at any time.'
                            : admin.status.toUpperCase() === 'PENDING'
                              ? 'This account is waiting for approval before it can be used.'
                              : 'This account has been rejected and cannot be used.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Security section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Security and access settings for this administrator
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Multi-Factor Authentication</h4>
                        <p className="text-sm text-muted-foreground">
                          MFA is required for all administrator accounts
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Enabled
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Login History</h4>
                        <p className="text-sm text-muted-foreground">
                          View login history and security events
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Login history tracking will be available in a future update.",
                        });
                      }}>
                        View History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}