/**
 * PubSub Validation Page
 * 
 * Admin page for PubSub media validation functionality.
 * Uses withAdminLayout HOC for consistent admin layout integration.
 */
import React from 'react';
import PubSubValidation from '../../components/admin/PubSubValidation';
import withAdminLayout from '@/components/admin/withAdminLayout';

const PubSubValidationPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">PubSub Media Validation</h1>
      <PubSubValidation />
    </div>
  );
};

export default withAdminLayout(PubSubValidationPage);