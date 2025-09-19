import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { SelectUser } from "@shared/schema";
import { supabase } from './supabase';

type UnauthorizedBehavior = "throw" | "returnNull";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  try {
    // First try to get token from localStorage (where it's actually stored)
    const localStorageAuth = localStorage.getItem('favillasnypizza-auth-token');
    let token = null;

    if (localStorageAuth) {
      try {
        const authData = JSON.parse(localStorageAuth);
        token = authData.access_token;
        console.log('🔍 Using localStorage token:', {
          hasLocalAuth: !!localStorageAuth,
          hasAccessToken: !!token,
          tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
        });
      } catch (parseError) {
        console.warn('Failed to parse localStorage auth data:', parseError);
      }
    }

    // Fallback to Supabase session if localStorage token not found
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
      console.log('🔍 Fallback to Supabase session:', {
        hasSession: !!session,
        hasAccessToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
      });

      // Try to refresh if no token
      if (!token) {
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        token = refreshedSession?.access_token;
        console.log('🔍 Tried refreshed session:', {
          hasRefreshedToken: !!token
        });
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Adding Authorization header');
    } else {
      console.log('❌ No access token available from any source');
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
  // Use the original URL - Netlify will handle the redirect automatically
  const fullUrl = url.startsWith('http') ? url : url;
  
  const headers = await getAuthHeaders();
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    // Use the original URL - Netlify will handle the redirect automatically
    const fullUrl = url.startsWith('http') ? url : url;
    
    const headers = await getAuthHeaders();
    
    const res = await fetch(fullUrl, {
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
