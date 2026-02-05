import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export function WarningBanner() {
  const [location] = useLocation();

  // Don't show on kitchen or admin pages
  if (location.startsWith("/kitchen") || location.startsWith("/admin") || location.startsWith("/employee")) {
    return null;
  }

  return (
    <div className="fixed w-full z-40 bg-yellow-500 text-black py-4 px-4 md:top-[72px] top-[56px]" style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div className="container mx-auto flex items-center justify-center gap-3 text-center">
        <AlertCircle className="h-6 w-6 flex-shrink-0" />
        <p className="text-base sm:text-lg font-bold">
          New website, new owners. This page is no longer operational.
        </p>
      </div>
    </div>
  );
}

// Export flag to disable ordering globally
export const ORDERING_DISABLED = true;
