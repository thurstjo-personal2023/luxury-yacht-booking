import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get a fresh token directly from Firebase Auth
  let token = null;
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken(true);
      // Update stored token
      localStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error getting fresh ID token:', error);
      // Fall back to stored token
      token = localStorage.getItem('authToken');
    }
  } else {
    // Fall back to stored token
    token = localStorage.getItem('authToken');
  }
  
  // Build headers
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get a fresh token directly from Firebase Auth
    let token = null;
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken(true);
        // Update stored token
        localStorage.setItem('authToken', token);
      } catch (error) {
        console.error('Error getting fresh ID token in query:', error);
        // Fall back to stored token
        token = localStorage.getItem('authToken');
      }
    } else {
      // Fall back to stored token
      token = localStorage.getItem('authToken');
    }
    
    // Build headers with auth token if available
    const headers: Record<string, string> = 
      token ? { "Authorization": `Bearer ${token}` } : {};
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch on window focus for better data freshness
      staleTime: 15000, // Lower stale time to 15 seconds to help with updates
      retry: false,
      // Custom behavior for refetching to catch image updates
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnReconnect: true, // Refetch when reconnecting
    },
    mutations: {
      retry: false,
    },
  },
});
