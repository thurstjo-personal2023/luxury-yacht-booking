/**
 * Media Admin Page
 * 
 * This page serves as the central hub for media-related administrative tasks.
 * Uses withAdminLayout HOC for consistent admin layout integration.
 */
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MediaValidationPanel from '@/components/admin/MediaValidationPanel';
import withAdminLayout from '@/components/admin/withAdminLayout';

function MediaAdmin() {
  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Media Administration</CardTitle>
          <CardDescription>
            Manage media assets and validation across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="validation">
            <TabsList>
              <TabsTrigger value="validation">Media Validation</TabsTrigger>
              <TabsTrigger value="management">Media Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="validation">
              <MediaValidationPanel />
            </TabsContent>
            
            <TabsContent value="management">
              <Card>
                <CardHeader>
                  <CardTitle>Media Management</CardTitle>
                  <CardDescription>Manage media assets across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Media management tools will be available in a future update.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAdminLayout(MediaAdmin);