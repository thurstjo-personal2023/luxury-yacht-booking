/**
 * Media Validation Page
 * 
 * This page provides an interface for administrators to validate and fix media URLs.
 */
import React from 'react';
import MediaValidationPanel from '@/components/admin/MediaValidationPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helmet } from 'react-helmet';
// Import directly using relative path to fix TypeScript module resolution
import AdminLayout from '../../components/layouts/AdminLayout';

export default function MediaValidation() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Media Validation - Etoile Yachts Admin</title>
      </Helmet>
      
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Media Validation</h1>
          <p className="text-muted-foreground">Validate and fix media URLs across the platform</p>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Media Validation Tool</CardTitle>
            <CardDescription>
              Manage media URLs across the platform. Identify and fix broken or invalid links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Use this tool to scan for problematic media URLs across all collections in the database. 
              The system can detect broken links, incorrect media types, and relative URLs that need fixing.
            </p>
          </CardContent>
        </Card>
        
        <MediaValidationPanel />
      </div>
    </AdminLayout>
  );
}