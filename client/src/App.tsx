import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import AuthCallback from "@/pages/auth-callback";
import EmailConfirmedPage from "@/pages/email-confirmed";
import MenuPage from "@/pages/menu-page";
import CateringPage from "@/pages/catering-page";
import CustomerDisplay from "@/pages/customer-display";
import CheckoutPage from "@/pages/checkout-page";
import PayPage from "@/pages/pay-page";
import OrderSuccessPage from "@/pages/order-success";
import OrderDetailsPage from "@/pages/order-details-page";
import OrdersPage from "@/pages/orders-page";
import RewardsPage from "@/pages/rewards-page";
import ProfilePage from "@/pages/profile-page";
import KitchenPage from "@/pages/kitchen-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminFAQsPage from "@/pages/admin-faqs-page";
import TestPage from "@/pages/test-page";
import FixOrderPage from "@/pages/fix-order";
import Fix169Page from "@/pages/fix-169";
import DebugOrdersPage from "@/pages/debug-orders";
import EmployeeClockPage from "@/pages/employee-clock";
import FixPointsPage from "@/pages/fix-points-page";
import TermsPage from "@/pages/terms-page";
import PrivacyPage from "@/pages/privacy-page";
import { AuthProvider } from "@/hooks/use-supabase-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminProtectedRoute } from "@/lib/admin-protected-route";
import { CartProvider } from "@/hooks/use-cart";
import CartSidebar from "@/components/cart/cart-sidebar";
import Header from "@/components/layout/header";
import LoginModalWrapper from "@/components/auth/login-modal-wrapper";
import { UpdateBanner } from "@/components/update-banner";

// Pages that should NOT show the main header (standalone full-screen pages)
const STANDALONE_PAGES = ['/kitchen', '/display'];

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
        <Route path="/pay/:token" component={PayPage} />
        <Route path="/order-success" component={OrderSuccessPage} />
        <Route path="/order-details" component={OrderDetailsPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/rewards" component={RewardsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <ProtectedRoute path="/kitchen" component={KitchenPage} />
        <AdminProtectedRoute path="/admin/dashboard" component={AdminDashboard} />
        <AdminProtectedRoute path="/admin/faqs" component={AdminFAQsPage} />
        <ProtectedRoute path="/employee/clock" component={EmployeeClockPage} />
        <AdminProtectedRoute path="/admin/fix-points" component={FixPointsPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  const [location] = useLocation();
  const isStandalonePage = STANDALONE_PAGES.includes(location);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <UpdateBanner />
            {!isStandalonePage && <Header />}
            {!isStandalonePage && <CartSidebar />}
            <LoginModalWrapper />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
