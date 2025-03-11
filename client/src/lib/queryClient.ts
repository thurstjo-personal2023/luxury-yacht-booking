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
  // Build request options
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: await createRequestHeaders(!!data),
  };
  
  // Add body if data is provided
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  // Make request
  const res = await fetch(url, options);
  
  // Handle response
  await throwIfResNotOk(res);
  return res;
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
    // Get standardized request headers with auth
    const headers = await createRequestHeaders();
    
    // Make API request
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    // Handle 401 according to specified behavior
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Check for errors
    await throwIfResNotOk(res);
    
    // Parse and return JSON response
    return await res.json();
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
