import { Switch, Route, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-supabase-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminProtectedRoute } from "@/lib/admin-protected-route";
import { CartProvider } from "@/hooks/use-cart";
import CartSidebar from "@/components/cart/cart-sidebar";
import Header from "@/components/layout/header";
import LoginModalWrapper from "@/components/auth/login-modal-wrapper";
import { WarningBanner } from "@/components/warning-banner";

// Lazy load route components
const NotFound = lazy(() => import("@/pages/not-found"));
const HomePage = lazy(() => import("@/pages/home-page"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const AuthCallback = lazy(() => import("@/pages/auth-callback"));
const EmailConfirmedPage = lazy(() => import("@/pages/email-confirmed"));
const MenuPage = lazy(() => import("@/pages/menu-page"));
const CateringPage = lazy(() => import("@/pages/catering-page"));
const CustomerDisplay = lazy(() => import("@/pages/customer-display"));
const CheckoutPage = lazy(() => import("@/pages/checkout-page"));
const OrderSuccessPage = lazy(() => import("@/pages/order-success"));
const OrdersPage = lazy(() => import("@/pages/orders-page"));
const RewardsPage = lazy(() => import("@/pages/rewards-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const KitchenPage = lazy(() => import("@/pages/kitchen-page"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const TestPage = lazy(() => import("@/pages/test-page"));
const FixOrderPage = lazy(() => import("@/pages/fix-order"));
const Fix169Page = lazy(() => import("@/pages/fix-169"));
const DebugOrdersPage = lazy(() => import("@/pages/debug-orders"));
const EmployeeClockPage = lazy(() => import("@/pages/employee-clock"));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/auth/callback" component={AuthCallback} />
          <Route path="/auth/confirm" component={EmailConfirmedPage} />
          <Route path="/menu" component={MenuPage} />
          <Route path="/catering" component={CateringPage} />
          <Route path="/display" component={CustomerDisplay} />
          <Route path="/test" component={TestPage} />
          <Route path="/fix-order" component={FixOrderPage} />
          <Route path="/debug-orders" component={DebugOrdersPage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/order-success" component={OrderSuccessPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/rewards" component={RewardsPage} />
          <Route path="/profile" component={ProfilePage} />
          <ProtectedRoute path="/kitchen" component={KitchenPage} />
          <AdminProtectedRoute path="/admin/dashboard" component={AdminDashboard} />
          <ProtectedRoute path="/employee/clock" component={EmployeeClockPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Header />
            <WarningBanner />
            <CartSidebar />
            <LoginModalWrapper />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
