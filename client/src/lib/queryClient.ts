import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { SelectUser } from "@shared/schema";
import { supabase } from './supabase';

type UnauthorizedBehavior = "throw" | "returnNull";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  try {
    // Use Supabase authentication only
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('🔑 Using Supabase access token for authentication');
      headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      console.log('ℹ️ No Supabase session found - requests will be unauthenticated');
    }

    return headers;
  } catch (error) {
    console.error('Error getting auth headers:', error);
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

  console.log(`🌐 API ${method} ${url}`, {
    hasAuth: !!headers.Authorization,
    authType: headers.Authorization ? 'Supabase' : 'none'
  });

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ API Request failed: ${JSON.stringify({
      url,
      method,
      error: errorText
    })}`);

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