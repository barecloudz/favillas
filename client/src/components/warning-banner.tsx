import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WarningBanner() {
  return (
    <div className="fixed top-[64px] left-0 right-0 z-40 bg-red-600 text-white py-3 px-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm sm:text-base">
            <strong>This is our new system but it's not quite ready yet. It should be ready by Tuesday, Oct 7.</strong> Any orders placed through here will not be received. If you are looking to place an order now:
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="flex-shrink-0 bg-white text-red-600 hover:bg-gray-100"
          onClick={() => window.open('https://www.restaurantlogin.com/api/fb/0y_q57', '_blank')}
        >
          Click Here
        </Button>
      </div>
    </div>
  );
}
