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
import MenuPage from "@/pages/menu-page";
import CheckoutPage from "@/pages/checkout-page";
import OrderSuccessPage from "@/pages/order-success";
import OrdersPage from "@/pages/orders-page";
import RewardsPage from "@/pages/rewards-page";
import ProfilePage from "@/pages/profile-page";
import KitchenPage from "@/pages/kitchen-page";
import AdminDashboard from "@/pages/admin-dashboard";
import TestPage from "@/pages/test-page";
import EmployeeClockPage from "@/pages/employee-clock";
import { AuthProvider } from "@/hooks/use-supabase-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { CartProvider } from "@/hooks/use-cart";
import CartSidebar from "@/components/cart/cart-sidebar";
import Header from "@/components/layout/header";
import LoginModalWrapper from "@/components/auth/login-modal-wrapper";

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
        <Route path="/menu" component={MenuPage} />
        <Route path="/test" component={TestPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/order-success" component={OrderSuccessPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/rewards" component={RewardsPage} />
        <Route path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/kitchen" component={KitchenPage} />
        <ProtectedRoute path="/admin" component={AdminDashboard} />
        <ProtectedRoute path="/employee/clock" component={EmployeeClockPage} />
        <Route component={NotFound} />
      </Switch>
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
