import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function WarningBanner() {
  const [location] = useLocation();

  // Don't show on auth pages, kitchen, or admin pages
  if (location.startsWith("/auth") || location.startsWith("/kitchen") || location.startsWith("/admin") || location.startsWith("/employee")) {
    return null;
  }

  return (
    <div className="fixed w-full z-40 bg-red-600 text-white py-3 px-4 md:top-[72px] top-[56px]" style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm sm:text-base">
            <strong>We're almost ready with our new system. Expected to be ready Tuesday, Oct 14. Status needs printer server.</strong> Any orders placed through here will not be received. If you are looking to place an order now:
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="flex-shrink-0 bg-white text-red-600 hover:bg-gray-100 font-semibold"
          onClick={() => window.open('https://www.restaurantlogin.com/api/fb/0y_q57', '_blank')}
        >
          Click Here
        </Button>
      </div>
    </div>
  );
}
