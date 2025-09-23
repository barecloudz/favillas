import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useAuth } from "@/hooks/use-supabase-auth";

export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, loading } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Wait for auth to either succeed or fail
  useEffect(() => {
    if (!loading) {
      // Wait a moment for any async auth operations to complete
      const timer = setTimeout(() => {
        setHasCheckedAuth(true);
      }, 200); // Increased delay to allow API call to complete
      return () => clearTimeout(timer);
    }
  }, [loading, user]); // Also depend on user changes

  // Show loading until auth check is completely done
  if (loading || !hasCheckedAuth) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  return <Route path={path} component={Component} />;
}