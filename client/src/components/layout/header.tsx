import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-supabase-auth";
import { useCart } from "@/hooks/use-cart";
import { useBranding } from "@/hooks/use-branding";
import { 
  Home, 
  Menu as MenuIcon, 
  ShoppingBag, 
  User,
  MapPin,
  Phone,
  X,
  LogOut,
  ChefHat,
  BarChart3,
  Star,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const { items, toggleCart } = useCart();
  const { companyName, logoUrl } = useBranding();
  
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
      setMobileProfileMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigate = (path: string) => {
    setMobileProfileMenuOpen(false);
    navigate(path);
  };

  // Don't show header on auth pages
  if (location.startsWith("/auth")) {
    return null;
  }

  // Show bottom navigation for main pages on mobile (excluding admin dashboard)
  if (["/", "/menu", "/catering", "/checkout", "/kitchen", "/orders", "/rewards", "/employee/clock", "/profile"].includes(location)) {
    return (
      <>
        {/* Desktop Header */}
        <header className={`fixed w-full top-0 z-50 transition-all duration-300 hidden lg:block ${
          isScrolled ? "bg-white shadow-lg" : "bg-white/95 backdrop-blur-sm shadow-md"
        }`} style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
          top: 'env(safe-area-inset-top, 0px)'
        }}>
          {/* Main navigation */}
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center space-x-4">
                  <img src={logoUrl} alt={companyName} className="h-12" />
                  <div className="hidden lg:block">
                    <h1 className="text-xl font-bold text-[#d73a31]">{companyName}</h1>
                  </div>
                </div>
              </Link>
              
              {/* Navigation Links */}
              <nav className="hidden lg:flex items-center space-x-8">
                <Link href="/">
                  <div className={`text-lg font-medium transition-colors ${
                    location === "/" ? "text-[#d73a31]" : "text-gray-700 hover:text-[#d73a31]"
                  }`}>
                    Home
                  </div>
                </Link>
                <Link href="/menu">
                  <div className={`text-lg font-medium transition-colors ${
                    location === "/menu" ? "text-[#d73a31]" : "text-gray-700 hover:text-[#d73a31]"
                  }`}>
                    Menu
                  </div>
                </Link>
                <button 
                  onClick={() => {
                    if (location === "/") {
                      // If already on home page, scroll to location section
                      const locationSection = document.getElementById('location');
                      if (locationSection) {
                        locationSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      // If on a different page, navigate to home page with hash
                      window.location.href = '/#location';
                    }
                  }}
                  className="text-lg font-medium text-gray-700 hover:text-[#d73a31] transition-colors"
                >
                  Location
                </button>
                <Link href="/catering">
                  <div className={`text-lg font-medium transition-colors ${
                    location === "/catering" ? "text-[#d73a31]" : "text-gray-700 hover:text-[#d73a31]"
                  }`}>
                    Catering
                  </div>
                </Link>
              </nav>
              
              {/* Cart and User */}
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCart}
                  className="relative hover:bg-gray-100"
                  data-cart-button="true"
                  data-desktop-cart="true"
                  data-cart-icon="desktop"
                >
                  <ShoppingBag className="h-6 w-6 text-gray-700" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
                
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="hover:bg-gray-100">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline">{user.firstName}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/orders")}>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        <span>My Orders</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/rewards")}>
                        <Star className="mr-2 h-4 w-4" />
                        <span>Rewards</span>
                      </DropdownMenuItem>
                      {(user.role === "employee" || user.isAdmin) && (
                        <DropdownMenuItem onClick={() => navigate("/employee/clock")}>
                          <Clock className="mr-2 h-4 w-4" />
                          <span>Clock In/Out</span>
                        </DropdownMenuItem>
                      )}
                      {user.isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      {(user.isAdmin || user.role === "employee" || user.role === "kitchen" || user.role === "manager") && (
                        <>
                          {!user.isAdmin && <DropdownMenuSeparator />}
                          <DropdownMenuItem onClick={() => navigate("/kitchen")}>
                            <ChefHat className="mr-2 h-4 w-4" />
                            <span>Kitchen Display</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/auth">
                    <Button className="bg-[#d73a31] hover:bg-[#c73128] text-white font-medium">
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Top Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 lg:hidden" style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
          top: 'env(safe-area-inset-top, 0px)'
        }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-20"></div>
            <Link href="/" className="flex items-center space-x-2">
              <img src={logoUrl} alt={companyName} className="h-8" />
              <div>
                <h1 className="text-sm font-bold text-[#d73a31]">{companyName}</h1>
              </div>
            </Link>
            <div className="flex items-center space-x-2 w-20 justify-end">
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => setMobileProfileMenuOpen(true)}>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              ) : (
                <Link href="/auth">
                  <Button size="sm" className="bg-[#d73a31] hover:bg-[#c73128] text-white">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-lg border-t-2 border-[#d73a31] lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex justify-around items-center h-16 px-4">
            <Link href="/">
              <div className={`flex flex-col items-center space-y-1 transition-colors ${
                location === "/" ? "text-[#d73a31]" : "text-gray-600 hover:text-[#d73a31]"
              }`}>
                <Home className="h-6 w-6" />
                <span className="text-xs font-semibold">Home</span>
              </div>
            </Link>
            
            <Link href="/menu">
              <div className={`flex flex-col items-center space-y-1 transition-colors ${
                location === "/menu" ? "text-[#d73a31]" : "text-gray-600 hover:text-[#d73a31]"
              }`}>
                <MenuIcon className="h-6 w-6" />
                <span className="text-xs font-semibold">Menu</span>
              </div>
            </Link>
            
            <div
              className={`flex flex-col items-center space-y-1 relative transition-colors cursor-pointer ${
                location === "/checkout" ? "text-[#d73a31]" : "text-gray-600 hover:text-[#d73a31]"
              }`}
              data-cart-button="true"
              data-mobile-cart="true"
              data-cart-icon="mobile"
              onClick={toggleCart}
            >
              <ShoppingBag className="h-6 w-6" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#d73a31] text-xs font-bold">
                  {cartItemCount}
                </Badge>
              )}
              <span className="text-xs font-semibold">Cart</span>
            </div>
            
            <div className="flex flex-col items-center space-y-1">
              {user ? (
                <div
                  className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
                    location === "/profile" ? "text-[#d73a31]" : "text-gray-600 hover:text-[#d73a31]"
                  }`}
                  onClick={() => setMobileProfileMenuOpen(true)}
                >
                  <User className="h-6 w-6" />
                  <span className="text-xs font-semibold">Profile</span>
                </div>
              ) : (
                <Link href="/auth">
                  <div className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[#d73a31] transition-colors">
                    <User className="h-6 w-6" />
                    <span className="text-xs font-semibold">Login</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Full-Screen Mobile Profile Menu Overlay */}
        {mobileProfileMenuOpen && (
          <div
            className="fixed inset-0 z-[100] bg-white lg:hidden animate-in slide-in-from-right duration-300"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg bg-[#d73a31] text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-lg">{user?.firstName} {user?.lastName}</h2>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileProfileMenuOpen(false)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col p-4 space-y-2">
              <button
                onClick={() => handleNavigate("/profile")}
                className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">My Profile</h3>
                  <p className="text-sm text-gray-500">View and edit your profile</p>
                </div>
              </button>

              <button
                onClick={() => handleNavigate("/orders")}
                className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50">
                  <ShoppingBag className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">My Orders</h3>
                  <p className="text-sm text-gray-500">Track your order history</p>
                </div>
              </button>

              <button
                onClick={() => handleNavigate("/rewards")}
                className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-50">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">Rewards</h3>
                  <p className="text-sm text-gray-500">View your points and rewards</p>
                </div>
              </button>

              {(user?.role === "employee" || user?.isAdmin) && (
                <button
                  onClick={() => handleNavigate("/employee/clock")}
                  className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-50">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">Clock In/Out</h3>
                    <p className="text-sm text-gray-500">Manage your time</p>
                  </div>
                </button>
              )}

              {user?.isAdmin && (
                <>
                  <div className="h-px bg-gray-200 my-2"></div>
                  <button
                    onClick={() => handleNavigate("/admin/dashboard")}
                    className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
                      <BarChart3 className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900">Admin Dashboard</h3>
                      <p className="text-sm text-gray-500">Manage your restaurant</p>
                    </div>
                  </button>
                </>
              )}

              {(user?.isAdmin || user?.role === "employee" || user?.role === "kitchen" || user?.role === "manager") && (
                <button
                  onClick={() => handleNavigate("/kitchen")}
                  className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-50">
                    <ChefHat className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">Kitchen Display</h3>
                    <p className="text-sm text-gray-500">View orders in kitchen</p>
                  </div>
                </button>
              )}

              <div className="h-px bg-gray-200 my-2"></div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-4 p-4 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
                  <LogOut className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-red-600">Log Out</h3>
                  <p className="text-sm text-gray-500">Sign out of your account</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Add bottom padding to main content for mobile */}
        <div className="pb-16 lg:pb-0"></div>
      </>
    );
  }

  // Fallback header for other pages
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback className="text-xs">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                {user.firstName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;
