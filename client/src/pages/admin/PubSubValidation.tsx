/**
 * PubSub Validation Page
 * 
 * Admin page for PubSub media validation functionality
 */
import React from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import PubSubValidation from '../../components/admin/PubSubValidation';

const PubSubValidationPage = () => {
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">PubSub Media Validation</h1>
        <PubSubValidation />
      </div>
    </AdminLayout>
  );
};

export default PubSubValidationPage;