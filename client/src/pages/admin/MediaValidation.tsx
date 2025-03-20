/**
 * Media Validation Page
 * 
 * This page provides an interface for administrators to validate and fix media URLs.
 */
import React from 'react';
import MediaValidationPanel from '@/components/admin/MediaValidationPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MediaValidation() {
  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Media Validation</CardTitle>
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
  );
}