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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d73a31]/10">
            <ShoppingCart className="h-8 w-8 text-[#d73a31]" />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Ready to checkout?
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 mt-2">
            Sign in or create an account to earn points and claim rewards on this order!
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Benefits section */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
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
              className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white py-3"
              size="lg"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account & Earn Points
            </Button>

            <Button
              onClick={onSignIn}
              variant="outline"
              className="w-full border-[#d73a31] text-[#d73a31] hover:bg-[#d73a31]/5 py-3"
              size="lg"
            >
              <User className="mr-2 h-4 w-4" />
              Sign In to Existing Account
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={onContinueAsGuest}
            className="w-full text-gray-600 hover:text-gray-800"
          >
            Continue as Guest (No Points Earned)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutPromptModal;