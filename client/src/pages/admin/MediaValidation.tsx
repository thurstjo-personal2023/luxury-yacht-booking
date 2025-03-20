/**
 * Media Validation Admin Page
 * 
 * This page provides the admin interface for validating and fixing media URLs.
 */
import React, { useState, useEffect } from 'react';
import { MediaValidationPanel } from '../../components/admin/MediaValidationPanel';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';

export const MediaValidationPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Check authentication after component mounts
    if (user === null) {
      setLocation('/login');
    } else if (user) {
      setLoading(false);
    }
  }, [user, setLocation]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-6">Media Validation</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // Check if user has admin (producer) role
  if (user && user.role !== 'producer') {
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-6">Media Validation</h1>
        <div className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to access this page. Producer role is required.</p>
        </div>
      </div>
    );
  }
  
  // Render media validation panel for authorized users
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Media Validation Dashboard</h1>
      <div className="bg-card rounded-lg shadow-sm p-6">
        <MediaValidationPanel />
      </div>
    </div>
  );
};

export default MediaValidationPage;