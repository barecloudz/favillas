import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { SelectUser } from "@shared/schema";
import { supabase } from './supabase';

type UnauthorizedBehavior = "throw" | "returnNull";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  try {
    // Use Supabase authentication with aggressive retry for timing issues
    let session = null;
    let retries = 0;
    const maxRetries = 8; // Increased from 3 to 8
    const retryDelay = 300; // Increased from 200ms to 300ms

    // Reduced logging for production
    // console.log('🔐 getAuthHeaders: Starting authentication check...');

    while (!session && retries < maxRetries) {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        session = currentSession;

        // Only log on first attempt or if failing
        // console.log(`🔍 Auth attempt ${retries + 1}/${maxRetries}:`, {
        //   hasSession: !!session,
        //   hasAccessToken: !!session?.access_token,
        //   userEmail: session?.user?.email
        // });

        if (!session && retries < maxRetries - 1) {
          // console.log(`🔄 No session found, retrying in ${retryDelay}ms... (${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retries++;
        } else {
          break;
        }
      } catch (sessionError) {
        console.error(`❌ Error getting session on attempt ${retries + 1}:`, sessionError);
        if (retries < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retries++;
        } else {
          break;
        }
      }
    }

    if (session?.access_token) {
      // console.log('🔑 SUCCESS: Using Supabase access token for authentication', {
      //   tokenLength: session.access_token.length,
      //   userEmail: session.user?.email
      // });
      headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      console.warn('⚠️ No Supabase session - requests will be unauthenticated');
    }

    return headers;
  } catch (error) {
    console.error('❌ Critical error getting auth headers:', error);
    return headers;
  }
}

export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: any,
  unauthorizedBehavior: UnauthorizedBehavior = "throw"
): Promise<Response> {
  const headers = await getAuthHeaders();

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include", // Include cookies for any remaining legacy endpoints
  };

  if (data) {
    fetchOptions.body = JSON.stringify(data);
  }

  // Reduced logging - only log failures
  // console.log(`🌐 API ${method} ${url}`, {
  //   hasAuth: !!headers.Authorization,
  //   authType: headers.Authorization ? 'Supabase' : 'none'
  // });

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    // Only log actual errors (not 401/403 which are expected sometimes)
    if (response.status !== 401 && response.status !== 403) {
      console.error(`❌ API ${method} ${url} failed (${response.status}):`, errorText.substring(0, 200));
    }

    if (response.status === 401 && unauthorizedBehavior === "returnNull") {
      return new Response("null", { status: 200 });
    }

    throw new Error(`${response.status}: ${errorText}`);
  }

  return response;
}

const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const [url] = queryKey as [string];
  const response = await apiRequest("GET", url, undefined, "returnNull");
  return await response.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('401')) {
          return false; // Don't retry unauthorized requests
        }
        return failureCount < 3;
      },
    },
  },
});