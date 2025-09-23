import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { SelectUser } from "@shared/schema";
import { supabase } from './supabase';

type UnauthorizedBehavior = "throw" | "returnNull";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  try {
    // For Netlify Functions, rely on cookies instead of Authorization headers
    // The authenticateToken function in Netlify will handle cookie-based auth
    // No need to set Authorization header since cookies are sent automatically

    // Fallback: try to get Supabase token only if no cookies are available
    const hasCookies = document.cookie.includes('auth-token') ||
                      document.cookie.includes('token') ||
                      document.cookie.includes('jwt');

    if (!hasCookies) {
      console.log('🔍 No auth cookies found, trying Supabase token as fallback');

      // Try localStorage first for Supabase token
      const localStorageAuth = localStorage.getItem('favillasnypizza-auth-token');
      let token = null;

      if (localStorageAuth) {
        try {
          const authData = JSON.parse(localStorageAuth);
          token = authData.access_token;
        } catch (parseError) {
          console.warn('Failed to parse localStorage auth data:', parseError);
        }
      }

      // Fallback to Supabase session
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;

        if (!token) {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          token = refreshedSession?.access_token;
        }
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔍 Using Supabase token as Authorization header');
      } else {
        console.log('❌ No access token available from any source');
      }
    } else {
      console.log('🍪 Using cookie-based authentication for Netlify Functions');
      console.log('🍪 Available cookies:', document.cookie);
    }
  } catch (error) {
    console.warn('Failed to get auth headers:', error);
  }

  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // For local development, route API calls to appropriate server
  let fullUrl = url;
  if (!url.startsWith('http')) {
    // Check if we're in local development
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev && url.startsWith('/api/')) {
      const currentPort = window.location.port;

      // If running on Vite dev server (5173), check for Netlify dev server
      if (currentPort === '5173') {
        // Check if user prefers Netlify dev (stored in localStorage)
        const useNetlifyDev = localStorage.getItem('use-netlify-dev') === 'true';

        if (useNetlifyDev) {
          // Use Netlify dev server (typically port 8888)
          const netlifyPort = localStorage.getItem('netlify-dev-port') || '8888';
          fullUrl = `http://localhost:${netlifyPort}${url}`;
        } else {
          // Use Express server
          const expressPort = localStorage.getItem('express-dev-port') || '5000';
          fullUrl = `http://localhost:${expressPort}${url}`;
        }
      } else {
        // If already on Netlify dev port, use relative URLs
        fullUrl = url;
      }
    } else {
      fullUrl = url;
    }
  }
  
  const headers = await getAuthHeaders();
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials: "include",
    };

    // Only add body for non-GET/HEAD methods
    if (method !== 'GET' && method !== 'HEAD' && data) {
      fetchOptions.body = JSON.stringify(data);
    }

    const res = await fetch(fullUrl, fetchOptions);

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('❌ API Request failed:', {
      url: fullUrl,
      method,
      error: error.message
    });

    // If it's a local dev request that failed, try fallback
    if (fullUrl.includes('localhost') && fullUrl.includes('/api/')) {
    }

    throw error;
  }
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    // For local development, route API calls to appropriate server
    let fullUrl = url;
    if (!url.startsWith('http')) {
      // Check if we're in local development
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev && url.startsWith('/api/')) {
        const currentPort = window.location.port;

        // If running on Vite dev server (5173), check for Netlify dev server
        if (currentPort === '5173') {
          // Check if user prefers Netlify dev (stored in localStorage)
          const useNetlifyDev = localStorage.getItem('use-netlify-dev') === 'true';

          if (useNetlifyDev) {
            // Use Netlify dev server (typically port 8888)
            const netlifyPort = localStorage.getItem('netlify-dev-port') || '8888';
            fullUrl = `http://localhost:${netlifyPort}${url}`;
          } else {
            // Use Express server
            const expressPort = localStorage.getItem('express-dev-port') || '5000';
            fullUrl = `http://localhost:${expressPort}${url}`;
          }
        } else {
          // If already on Netlify dev port, use relative URLs
          fullUrl = url;
        }
      } else {
        fullUrl = url;
      }
    }
    
    const headers = await getAuthHeaders();
    
    const res = await fetch(fullUrl, {
      method: 'GET',
      headers,
      credentials: "include",
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
      refetchOnWindowFocus: true, // Refetch when window regains focus
      staleTime: 30 * 1000, // Cache for only 30 seconds instead of 5 minutes
      cacheTime: 1 * 60 * 1000, // Keep cache for 1 minute after component unmounts
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
