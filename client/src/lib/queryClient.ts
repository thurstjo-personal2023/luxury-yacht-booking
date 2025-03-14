import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";
import { toast } from "@/hooks/use-toast";
import { syncAuthClaims } from "./user-profile-utils";

/**
 * Helper function to check if a response is ok and throw an error if not
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Try to get error text from response
    let errorMessage;
    try {
      const text = await res.text();
      errorMessage = text || res.statusText;
    } catch (e) {
      errorMessage = res.statusText;
    }
    
    // Throw formatted error
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

/**
 * Get the current user's role from the auth token
 * This helps in checking permission before making API calls
 */
async function getUserRoleFromToken(): Promise<string | null> {
  if (!auth.currentUser) {
    console.log('No current user in auth - cannot determine role');
    return null;
  }
  
  try {
    const tokenResult = await auth.currentUser.getIdTokenResult();
    const role = tokenResult.claims.role as string;
    return role || null;
  } catch (error) {
    console.error('Error obtaining user role from token:', error);
    return null;
  }
}

/**
 * Get a fresh auth token with guaranteed validity
 * This is a crucial function for ensuring proper authentication
 */
async function getFreshAuthToken(): Promise<string | null> {
  if (!auth.currentUser) {
    console.log('No current user in auth - cannot get fresh token');
    return localStorage.getItem('authToken'); // Fallback
  }
  
  try {
    // Force token refresh to ensure we have a valid token with all claims
    const token = await auth.currentUser.getIdToken(true);
    console.log('Successfully obtained fresh auth token');
    
    // Store for convenience but always prefer getting fresh one
    localStorage.setItem('authToken', token);
    return token;
  } catch (error) {
    console.error('Error obtaining fresh auth token:', error);
    // Fallback to stored token
    return localStorage.getItem('authToken');
  }
}

/**
 * Create standard headers for API requests including auth and content-type
 */
async function createRequestHeaders(includeContentType: boolean = false): Promise<Record<string, string>> {
  // Start with cache control headers
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
  
  // Add content type if needed
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add auth token
  const token = await getFreshAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Make API request with proper authentication and automatic role validation
 * 
 * For producer/partner-specific operations, this function will check if the user 
 * has the correct role before making the request, and attempt to synchronize roles
 * if there's a mismatch.
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options: {
    requireRole?: 'producer' | 'partner' | 'consumer';
    skipRoleCheck?: boolean;
  } = {}
): Promise<Response> {
  // Enable debug logging
  const enableDebug = true;
  
  if (enableDebug) {
    console.log(`apiRequest: Making ${method} request to ${url}`);
    if (data) console.log('apiRequest: Request data:', JSON.stringify(data).substring(0, 100) + '...');
  }
  
  // Check if this is a role-protected endpoint
  const isProducerEndpoint = url.includes('/api/producer/');
  const isPartnerEndpoint = url.includes('/api/partner/');
  
  // Determine required role based on URL pattern if not explicitly specified
  const requiredRole = options.requireRole || 
    (isProducerEndpoint ? 'producer' : 
     isPartnerEndpoint ? 'partner' : undefined);
  
  // Skip role check if specified or if no required role
  const shouldCheckRole = !options.skipRoleCheck && !!requiredRole;
  
  // If this is a role-protected endpoint and role checking is enabled,
  // verify the user has the correct role before making the request
  if (shouldCheckRole) {
    console.log(`apiRequest: Checking user role for ${requiredRole}-protected endpoint`);
    
    const userRole = await getUserRoleFromToken();
    console.log(`apiRequest: User role from token: ${userRole || 'none'}`);
    
    // If the roles don't match, try to synchronize them
    if (userRole !== requiredRole) {
      console.warn(`apiRequest: Role mismatch detected! Token has ${userRole}, but ${requiredRole} is required`);
      console.log('apiRequest: Attempting to synchronize roles before proceeding...');
      
      try {
        // Attempt to sync the roles
        const syncResult = await syncAuthClaims();
        
        if (syncResult.success) {
          console.log('apiRequest: Role sync successful:', syncResult);
          
          // If current user exists, force a token refresh
          if (auth.currentUser) {
            console.log('apiRequest: Forcing token refresh to apply new claims');
            await auth.currentUser.getIdToken(true);
            
            // Check if role is now correct
            const newTokenResult = await auth.currentUser.getIdTokenResult();
            const newRole = newTokenResult.claims.role as string;
            
            console.log(`apiRequest: After sync, token has role: ${newRole}`);
            
            if (newRole !== requiredRole) {
              // Still not the right role, alert the user
              toast({
                title: 'Permission Error',
                description: `You need ${requiredRole} permissions for this action. Please contact support if you believe this is an error.`,
                variant: 'destructive',
              });
              
              throw new Error(`Permission denied: ${requiredRole} role required`);
            } else {
              toast({
                title: 'Permissions Updated',
                description: `Your ${requiredRole} role permissions have been restored.`,
                variant: 'default',
              });
            }
          }
        } else {
          console.error('apiRequest: Role sync failed:', syncResult);
          
          // Alert the user about the permission issue
          toast({
            title: 'Permission Error',
            description: `You need ${requiredRole} permissions for this action. (Sync failed: ${syncResult.message})`,
            variant: 'destructive',
          });
          
          throw new Error(`Permission denied: ${requiredRole} role required`);
        }
      } catch (syncError) {
        console.error('apiRequest: Error during role synchronization:', syncError);
        
        // Alert the user about the permission issue
        toast({
          title: 'Permission Error',
          description: `You need ${requiredRole} permissions for this action.`,
          variant: 'destructive',
        });
        
        throw new Error(`Permission denied: ${requiredRole} role required`);
      }
    }
  }

  // Build request options with enhanced debugging
  const headers = await createRequestHeaders(!!data);
  
  if (enableDebug && 'Authorization' in headers) {
    const token = headers['Authorization'].replace('Bearer ', '');
    const tokenPreview = token.length > 10 ? 
      `${token.substring(0, 10)}...${token.substring(token.length - 5)}` : 
      '[invalid token]';
    console.log(`apiRequest: Using token: ${tokenPreview}`);
  }
  
  const requestOptions: RequestInit = {
    method,
    credentials: "include",
    headers,
  };
  
  // Add body if data is provided
  if (data) {
    requestOptions.body = JSON.stringify(data);
  }
  
  try {
    // Make request
    if (enableDebug) console.log('apiRequest: Sending fetch request...');
    const res = await fetch(url, requestOptions);
    
    if (enableDebug) {
      console.log(`apiRequest: Response status: ${res.status} ${res.statusText}`);
      if (res.status >= 400) {
        console.warn(`apiRequest: Error response received (${res.status})`);
      }
    }
    
    // Handle response
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('apiRequest: Error during request:', error);
    throw error;
  }
}

/**
 * TanStack Query fetcher function with auth support and role detection
 */
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Enable debug logging
    const enableDebug = true;
    
    if (enableDebug) {
      console.log(`QueryFn: Fetching data from ${queryKey[0]}`);
    }
    
    const url = queryKey[0] as string;
    
    // Check if this is a role-protected endpoint
    const isProducerEndpoint = url.includes('/api/producer/');
    const isPartnerEndpoint = url.includes('/api/partner/');
    
    // Determine required role based on URL pattern
    const requiredRole = isProducerEndpoint ? 'producer' : 
                         isPartnerEndpoint ? 'partner' : undefined;
    
    // If this is a role-protected endpoint, verify the user has the correct role
    if (requiredRole) {
      console.log(`QueryFn: Endpoint requires '${requiredRole}' role`);
      
      const userRole = await getUserRoleFromToken();
      console.log(`QueryFn: User role from token: ${userRole || 'none'}`);
      
      // If the roles don't match, trigger a synchronization and show a message
      if (userRole !== requiredRole) {
        console.warn(`QueryFn: Role mismatch detected! Token has ${userRole}, but ${requiredRole} is required`);
        
        // Attempt role synchronization in background, don't block the request
        // This will help fix subsequent requests if possible
        syncAuthClaims()
          .then(result => {
            if (result.success) {
              console.log('QueryFn: Background role sync successful:', result);
              // Force token refresh in background
              if (auth.currentUser) {
                auth.currentUser.getIdToken(true)
                  .then(() => console.log('QueryFn: Token refreshed after background sync'))
                  .catch(err => console.error('QueryFn: Error refreshing token after sync:', err));
              }
            } else {
              console.warn('QueryFn: Background role sync failed:', result);
            }
          })
          .catch(err => console.error('QueryFn: Error in background role sync:', err));
        
        // For queries, we don't block - we'll let the server decide on authorization
        // This prevents UI disruption but server will still enforce proper permissions
        console.log('QueryFn: Proceeding with request despite role mismatch - server will enforce authorization');
      }
    }
    
    // Get standardized request headers with auth
    const headers = await createRequestHeaders();
    
    if (enableDebug && 'Authorization' in headers) {
      const token = headers['Authorization'].replace('Bearer ', '');
      const tokenPreview = token.length > 10 ? 
        `${token.substring(0, 10)}...${token.substring(token.length - 5)}` : 
        '[invalid token]';
      console.log(`QueryFn: Using token: ${tokenPreview}`);
    } else if (enableDebug) {
      console.warn('QueryFn: No authorization header available');
    }
    
    try {
      // Make API request
      if (enableDebug) console.log('QueryFn: Sending fetch request...');
      
      const res = await fetch(url, {
        credentials: "include",
        headers
      });
      
      if (enableDebug) {
        console.log(`QueryFn: Response status: ${res.status} ${res.statusText}`);
      }
  
      // Handle 401 according to specified behavior
      if (res.status === 401) {
        if (enableDebug) console.warn('QueryFn: Received 401 Unauthorized response');
        
        // Automatically try to sync roles if it's an unauthorized error
        // This handles cases where token has the wrong role
        if (requiredRole) {
          console.log('QueryFn: Attempting automatic role sync after 401...');
          
          syncAuthClaims()
            .then(result => {
              if (result.success) {
                console.log('QueryFn: Role sync after 401 successful:', result);
                // Refresh the page to get fresh tokens
                window.location.reload();
              } else {
                console.error('QueryFn: Role sync after 401 failed:', result);
              }
            })
            .catch(err => console.error('QueryFn: Error in role sync after 401:', err));
        }
        
        if (unauthorizedBehavior === "returnNull") {
          console.log('QueryFn: Returning null for 401 as configured');
          return null;
        }
      }
  
      // Check for errors
      await throwIfResNotOk(res);
      
      // Check content type and handle non-JSON responses
      const contentType = res.headers.get('content-type');
      
      // If we received HTML instead of JSON, this usually indicates a routing error on the server
      if (contentType && contentType.includes('text/html')) {
        console.error('QueryFn: Received HTML response instead of JSON');
        
        try {
          const htmlContent = await res.text();
          
          // Try to extract useful information from the HTML
          const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
          const errorTitle = titleMatch ? titleMatch[1] : 'Unknown error';
          
          console.error(`QueryFn: HTML error page title: ${errorTitle}`);
          console.error('QueryFn: First 200 characters of HTML:', htmlContent.substring(0, 200));
          
          // Log URL path for debugging
          console.error(`QueryFn: URL path that returned HTML: ${queryKey[0]}`);
          
          // For producer API endpoints, try fallback URL pattern if needed
          if (queryKey[0].toString().includes('/api/producer/')) {
            console.log('QueryFn: Detected producer API endpoint, will retry with corrected path');
            
            // Create a corrected version of the URL by removing any double slashes
            // This typically happens with route confusion in the Express server
            const correctedUrl = queryKey[0].toString()
              .replace(/\/\/+/g, '/') // Replace multiple consecutive slashes with a single slash
              .replace('http:/', 'http://') // Fix protocol if affected
              .replace('https:/', 'https://'); // Fix protocol if affected
              
            if (correctedUrl !== queryKey[0]) {
              console.log(`QueryFn: Retrying with corrected URL: ${correctedUrl}`);
              
              // Make a new request with the corrected URL
              const retryRes = await fetch(correctedUrl, {
                credentials: "include",
                headers
              });
              
              if (retryRes.ok) {
                console.log('QueryFn: Retry with corrected URL succeeded!');
                return await retryRes.json();
              } else {
                console.error('QueryFn: Retry with corrected URL also failed');
              }
            }
          }
          
          throw new Error(`API returned HTML instead of JSON: ${errorTitle}`);
        } catch (htmlError) {
          console.error('QueryFn: Error processing HTML response:', htmlError);
          throw new Error('Received HTML response instead of JSON data');
        }
      }
      
      // Parse and return JSON response
      try {
        const data = await res.json();
        
        if (enableDebug) {
          console.log(`QueryFn: Successfully parsed JSON response with ${Object.keys(data).length} keys`);
          if (Array.isArray(data)) {
            console.log(`QueryFn: Array response with ${data.length} items`);
          }
        }
        
        return data;
      } catch (jsonError) {
        console.error('QueryFn: Error parsing JSON response:', jsonError);
        console.error('QueryFn: Response content-type:', contentType);
        
        // Try to get the response text for debugging
        try {
          const text = await res.clone().text();
          console.error('QueryFn: Raw response:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        } catch (textError) {
          console.error('QueryFn: Could not read response text');
        }
        
        throw new Error('Failed to parse JSON response');
      }
    } catch (error) {
      console.error('QueryFn: Error fetching data:', error);
      throw error;
    }
  };

/**
 * Configure and export query client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch on window focus for better data freshness
      staleTime: 5000, // Lower stale time to 5 seconds to help with updates
      retry: 1, // Allow 1 retry for network issues
      // Custom behavior for refetching to catch image updates
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnReconnect: true, // Refetch when reconnecting
    },
    mutations: {
      retry: 1, // Allow 1 retry for network issues
    },
  },
});
