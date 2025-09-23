import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const [adminUser, setAdminUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for admin session in localStorage
    try {
      const storedAdmin = localStorage.getItem('admin-user');
      if (storedAdmin) {
        const admin = JSON.parse(storedAdmin);
        if (admin.role === 'admin' && admin.isAdmin) {
          setAdminUser(admin);
        }
      }
    } catch (error) {
      console.error('Error parsing admin session:', error);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!adminUser) {
    return (
      <Route path={path}>
        <Redirect to="/admin" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}