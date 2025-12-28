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
  UtensilsCrossed,
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
import { ChristmasCountdownButton } from "@/components/christmas/christmas-countdown-button";
import { AdventCalendarModal } from "@/components/christmas/advent-calendar-modal";

const Header = () => {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const { items, toggleCart } = useCart();
  const { companyName, logoUrl } = useBranding();
  
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const [adventCalendarOpen, setAdventCalendarOpen] = useState(false);

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

  // Show full header for all pages except standalone pages (admin, kitchen display)
  // This includes home, menu, neighborhood pages, etc.
  const standalonePages = ["/kitchen", "/admin/dashboard", "/admin/faqs", "/admin/fix-points"];
  const isStandalonePage = standalonePages.some(page => location.startsWith(page));

  if (!isStandalonePage) {
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
                    <DropdownMenuContent align="end" className="w-72 p-3 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 shadow-2xl">
                      <div className="space-y-2">
                        <button
                          onClick={() => navigate("/profile")}
                          className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="font-semibold text-gray-900 text-base">My Profile</span>
                        </button>

                        <button
                          onClick={() => navigate("/orders")}
                          className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                            <ShoppingBag className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="font-semibold text-gray-900 text-base">My Orders</span>
                        </button>

                        <button
                          onClick={() => navigate("/rewards")}
                          className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                            <Star className="h-5 w-5 text-yellow-600" />
                          </div>
                          <span className="font-semibold text-gray-900 text-base">Rewards</span>
                        </button>

                        {(user.role === "employee" || user.isAdmin) && (
                          <button
                            onClick={() => navigate("/employee/clock")}
                            className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                          >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                              <Clock className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="font-semibold text-gray-900 text-base">Clock In/Out</span>
                          </button>
                        )}

                        {user.isAdmin && (
                          <>
                            <div className="h-px bg-gray-300 my-3"></div>
                            <button
                              onClick={() => navigate("/admin/dashboard")}
                              className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                                <BarChart3 className="h-5 w-5 text-red-600" />
                              </div>
                              <span className="font-semibold text-gray-900 text-base">Admin Dashboard</span>
                            </button>
                          </>
                        )}

                        {(user.isAdmin || user.role === "employee" || user.role === "kitchen" || user.role === "manager") && (
                          <>
                            {!user.isAdmin && <div className="h-px bg-gray-300 my-3"></div>}
                            <button
                              onClick={() => navigate("/kitchen")}
                              className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                                <ChefHat className="h-5 w-5 text-orange-600" />
                              </div>
                              <span className="font-semibold text-gray-900 text-base">Kitchen Display</span>
                            </button>
                          </>
                        )}

                        <div className="h-px bg-gray-300 my-3"></div>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                            <LogOut className="h-5 w-5 text-red-600" />
                          </div>
                          <span className="font-semibold text-red-600 text-base">Log Out</span>
                        </button>
                      </div>
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
          <div className="flex justify-around items-center h-16 px-2">
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

            {/* Catering Button */}
            <Link href="/catering">
              <div className={`flex flex-col items-center space-y-1 transition-colors ${
                location === "/catering" ? "text-[#d73a31]" : "text-gray-600 hover:text-[#d73a31]"
              }`}>
                <UtensilsCrossed className="h-6 w-6" />
                <span className="text-xs font-semibold">Catering</span>
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

        {/* Advent Calendar Modal */}
        <AdventCalendarModal
          open={adventCalendarOpen}
          onClose={() => setAdventCalendarOpen(false)}
        />

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

              <button
                onClick={() => handleNavigate("/catering")}
                className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
                  <UtensilsCrossed className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">Catering</h3>
                  <p className="text-sm text-gray-500">Order catering for your event</p>
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
            <DropdownMenuContent align="end" className="w-64 p-3 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 shadow-2xl">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                  <LogOut className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-semibold text-red-600 text-base">Log Out</span>
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;
