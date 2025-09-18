import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { SelectUser } from "@shared/schema";
import { supabase } from './supabase';

type UnauthorizedBehavior = "throw" | "returnNull";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Debug: log the full session to see what's available
    console.log('🔍 Full session debug:', {
      hasSession: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      access_token: session?.access_token,
      accessToken: (session as any)?.accessToken,
      token: (session as any)?.token,
      userToken: session?.user ? (session.user as any).token : undefined
    });

    // Try multiple possible token property names
    const token = session?.access_token ||
                  (session as any)?.accessToken ||
                  (session as any)?.token ||
                  (session?.user as any)?.token;

    console.log('🔍 Client auth check:', {
      hasSession: !!session,
      hasAccessToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
    });

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Adding Authorization header');
    } else {
      console.log('❌ No access token available - session may be expired');
      // Try to refresh the session
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (refreshedSession?.access_token) {
        headers['Authorization'] = `Bearer ${refreshedSession.access_token}`;
        console.log('✅ Used refreshed token');
      } else {
        console.log('❌ Failed to refresh session:', error);
      }
    }
  } catch (error) {
    console.warn('Failed to get Supabase session:', error);
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
