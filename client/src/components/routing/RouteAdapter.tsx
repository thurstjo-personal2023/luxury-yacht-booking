/**
 * Route Adapter Component
 * 
 * This component adapts the new PrivateRoute component to work with the legacy App routing structure.
 * It serves as a compatibility layer during the transition to the new auth architecture.
 */

import React, { ReactNode } from 'react';
import { PrivateRoute as NewPrivateRoute } from './PrivateRoute';

/**
 * Props for the legacy route adapter
 */
interface RouteAdapterProps {
  component: React.ComponentType<any>;
  routeType?: 'user' | 'admin' | 'producer' | 'partner' | 'consumer';
  [key: string]: any;
}

/**
 * Route adapter that makes the new PrivateRoute work with legacy component={Component} pattern
 */
export const PrivateRoute: React.FC<RouteAdapterProps> = ({ 
  component: Component, 
  routeType = 'user',
  ...rest 
}) => {
  // Render the protected children based on the routeType
  const renderChildren = () => <Component {...rest} />;
  
  return (
    <NewPrivateRoute routeType={routeType}>
      {renderChildren()}
    </NewPrivateRoute>
  );
};

export default PrivateRoute;