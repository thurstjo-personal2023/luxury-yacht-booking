/**
 * Media Validation Page
 * 
 * This page provides an interface for administrators to validate and fix media URLs.
 * Uses withAdminLayout HOC for consistent admin layout integration.
 */
import React from 'react';
import { Link } from 'wouter';
import MediaValidationPanel from '@/components/admin/MediaValidationPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CloudIcon, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet';
import withAdminLayout from '@/components/admin/withAdminLayout';

function MediaValidation() {
  return (
    <>
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
          <CardFooter className="bg-gray-50 border-t">
            <div className="flex justify-between items-center w-full">
              <span className="text-sm text-gray-500">Try our new background processing system</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/pubsub-validation">
                  <CloudIcon className="mr-2 h-4 w-4" />
                  PubSub Validation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <MediaValidationPanel />
      </div>
    </>
  );
}

export default withAdminLayout(MediaValidation);