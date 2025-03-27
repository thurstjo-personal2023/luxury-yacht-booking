/**
 * Page Header Component
 * 
 * This component provides a consistent page header with title and optional description.
 */
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  children 
}) => {
  return (
    <div className="flex flex-col gap-1 mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
};