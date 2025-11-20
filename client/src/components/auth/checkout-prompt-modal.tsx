import React from "react";
import { useAuth } from "@/hooks/use-supabase-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Star, Gift, User, UserPlus } from "lucide-react";

interface CheckoutPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onContinueAsGuest: () => void;
}

const CheckoutPromptModal: React.FC<CheckoutPromptModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  onSignUp,
  onContinueAsGuest
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Premium Header with Gradient and Animation */}
        <div className="relative bg-gradient-to-r from-[#d73a31] via-[#c22d25] to-[#d73a31] text-white px-8 py-10 text-center">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 text-6xl animate-pulse">🍕</div>
            <div className="absolute top-0 right-0 text-6xl animate-pulse delay-100">🍕</div>
            <div className="absolute bottom-0 left-1/4 text-6xl animate-pulse delay-200">🍕</div>
            <div className="absolute bottom-0 right-1/4 text-6xl animate-pulse delay-300">🍕</div>
          </div>

          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-xl animate-bounce">
              <ShoppingCart className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
            <DialogTitle className="text-3xl font-bold text-white drop-shadow-lg mb-2">
              Ready to Checkout?
            </DialogTitle>
            <DialogDescription className="text-lg text-red-100 font-medium">
              🎉 Create an account & start earning rewards!
            </DialogDescription>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 py-6 flex-1 overflow-y-auto">
          {/* Benefits section */}
          <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5 mb-6 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Member Benefits</span>
            </div>
            <ul className="space-y-2 text-sm text-yellow-700">
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Earn points on every purchase
              </li>
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Redeem points for free food & discounts
              </li>
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Exclusive member-only offers
              </li>
            </ul>
          </div>

          {/* Warning for guest checkout */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>⚠️ Important:</strong> You won't be able to earn points on this order if you continue as a guest.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={onSignUp}
              className="w-full bg-gradient-to-r from-[#d73a31] to-[#c22d25] hover:from-[#c22d25] hover:to-[#b21d15] text-white shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 py-7 text-lg font-bold"
              size="lg"
            >
              <UserPlus className="mr-2 h-6 w-6" />
              Create Account & Earn Points
            </Button>

            <Button
              onClick={onSignIn}
              variant="outline"
              className="w-full border-2 border-[#d73a31] text-[#d73a31] hover:bg-[#d73a31]/10 hover:border-[#c22d25] shadow-md hover:shadow-lg transition-all duration-200 py-6 text-base font-semibold"
              size="lg"
            >
              <User className="mr-2 h-5 w-5" />
              Sign In to Existing Account
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-col space-y-3 flex-shrink-0 border-t-2 border-gray-200 bg-gray-50 px-8 py-5">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm font-medium uppercase tracking-wide">
              <span className="bg-gray-50 px-3 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onContinueAsGuest}
            className="w-full border-2 border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 py-4 text-sm font-medium"
          >
            Continue as Guest (No Points Earned)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutPromptModal;