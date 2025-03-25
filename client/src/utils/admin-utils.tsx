/**
 * Admin Utilities
 * 
 * This module provides utility functions for admin-related components.
 */
import { Shield, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Format a date for display
 */
export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj);
}

/**
 * Format a date with time for display
 */
export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(dateObj);
}

/**
 * Format a time difference as a human-readable string
 */
export function formatTimeDifference(date: string | number | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return formatDate(date);
  }
}

/**
 * Get a role badge component
 */
export function getRoleBadge(role: string) {
  const upperRole = role?.toUpperCase() || '';
  
  switch (upperRole) {
    case 'SUPER_ADMIN':
      return (
        <Badge variant="default" className="bg-red-600">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    case 'ADMIN':
      return (
        <Badge variant="default" className="bg-blue-600">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    case 'MODERATOR':
      return (
        <Badge variant="default" className="bg-green-600">
          <Shield className="h-3 w-3 mr-1" />
          Moderator
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Shield className="h-3 w-3 mr-1" />
          {role || 'Unknown'}
        </Badge>
      );
  }
}

/**
 * Get a status badge component
 */
export function getStatusBadge(status: string) {
  const upperStatus = status?.toUpperCase() || '';
  
  switch (upperStatus) {
    case 'ACTIVE':
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    case 'DISABLED':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Disabled
        </Badge>
      );
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Pending Approval
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status || 'Unknown'}
        </Badge>
      );
  }
}

/**
 * Convert role to proper format
 */
export function standardizeRole(role: string): string {
  if (!role) return '';
  
  // Convert to uppercase
  const upperRole = role.toUpperCase();
  
  // Check for valid roles
  if (['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(upperRole)) {
    return upperRole;
  }
  
  // Handle alternate formats
  if (upperRole === 'SUPERADMIN') return 'SUPER_ADMIN';
  if (upperRole === 'MOD') return 'MODERATOR';
  
  return upperRole;
}

/**
 * Convert a role to proper display format
 */
export function roleToDisplay(role: string): string {
  if (!role) return 'Unknown';
  
  const upperRole = role.toUpperCase();
  
  switch (upperRole) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Admin';
    case 'MODERATOR':
      return 'Moderator';
    default:
      return role;
  }
}