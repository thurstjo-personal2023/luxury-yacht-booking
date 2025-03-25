/**
 * Admin Dashboard
 * 
 * This page provides access to various admin tools and features.
 */

import React from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Image, Database, FileText, Settings } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user, profileData } = useAuth();
  const { toast } = useToast();
  
  // Determine if user has admin or producer role from profile data
  const harmonizedUser = profileData?.harmonizedUser;
  const userRole = harmonizedUser?.role;
  const isAdmin = harmonizedUser?.isAdmin === true;
  const isProducer = userRole === 'producer';
  
  // If user is not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Please log in to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If user is not authorized
  if (!(isAdmin || isProducer)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render the admin dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500">
          Welcome to the admin dashboard. Use the tools below to manage the application.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Media Validation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Media Management
            </CardTitle>
            <CardDescription>
              Validate and repair media URLs across the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Tools for checking media integrity, resolving blob URLs, and fixing broken image and video links.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/admin/media-validation">Media Validation Tools</Link>
            </Button>
          </CardFooter>
        </Card>
        
        {/* Content Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Management
            </CardTitle>
            <CardDescription>
              Manage yacht listings, experiences, and content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Tools for managing site content, yacht experiences, and other application data.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/admin/content">Content Management</Link>
            </Button>
          </CardFooter>
        </Card>
        
        {/* Database Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Management
            </CardTitle>
            <CardDescription>
              View and manage database collections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Tools for viewing, editing, and managing database collections and documents.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/admin/database">Database Management</Link>
            </Button>
          </CardFooter>
        </Card>
        
        {/* System Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure application settings and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Tools for configuring system settings, user roles, and application preferences.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/admin/settings">System Settings</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Database Connection</span>
                <span className="text-green-600 font-medium">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Firestore Connection</span>
                <span className="text-green-600 font-medium">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Auth Service</span>
                <span className="text-green-600 font-medium">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span>API Endpoints</span>
                <span className="text-green-600 font-medium">Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Monitoring Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Media Validation</span>
                <span className="text-amber-600 font-medium">Requires Attention</span>
              </div>
              <div className="flex justify-between items-center">
                <span>API Performance</span>
                <span className="text-green-600 font-medium">Normal</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Error Rate</span>
                <span className="text-green-600 font-medium">Low</span>
              </div>
              <div className="flex justify-between items-center">
                <span>User Activity</span>
                <span className="text-green-600 font-medium">Normal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;