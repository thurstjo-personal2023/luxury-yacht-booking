import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

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
 * Make API request with proper authentication
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Enable debug logging
  const enableDebug = true;
  
  if (enableDebug) {
    console.log(`apiRequest: Making ${method} request to ${url}`);
    if (data) console.log('apiRequest: Request data:', JSON.stringify(data).substring(0, 100) + '...');
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
  
  const options: RequestInit = {
    method,
    credentials: "include",
    headers,
  };
  
  // Add body if data is provided
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    // Make request
    if (enableDebug) console.log('apiRequest: Sending fetch request...');
    const res = await fetch(url, options);
    
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
 * TanStack Query fetcher function with auth support
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
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });
      
      if (enableDebug) {
        console.log(`QueryFn: Response status: ${res.status} ${res.statusText}`);
      }
  
      // Handle 401 according to specified behavior
      if (res.status === 401) {
        if (enableDebug) console.warn('QueryFn: Received 401 Unauthorized response');
        
        if (unauthorizedBehavior === "returnNull") {
          console.log('QueryFn: Returning null for 401 as configured');
          return null;
        }
      }
  
      // Check for errors
      await throwIfResNotOk(res);
      
      // First check if the response is HTML (usually an error page)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('QueryFn: Received HTML response instead of JSON');
        
        try {
          const htmlContent = await res.text();
          const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
          const errorTitle = titleMatch ? titleMatch[1] : 'Unknown error';
          
          console.error(`QueryFn: HTML error page title: ${errorTitle}`);
          
          throw new Error(`Received HTML page instead of JSON: ${errorTitle}`);
        } catch (htmlError) {
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
