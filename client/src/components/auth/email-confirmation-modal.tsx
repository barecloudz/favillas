import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle } from "lucide-react";

interface EmailConfirmationModalProps {
  open: boolean;
  email?: string;
  onConfirmation: () => void;
}

export function EmailConfirmationModal({
  open,
  email,
  onConfirmation
}: EmailConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmation = async () => {
    setIsConfirming(true);
    // Add a small delay to give the user time to see the loading state
    await new Promise(resolve => setTimeout(resolve, 1000));
    onConfirmation();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Registration Successful!
          </DialogTitle>
          <DialogDescription className="mt-2 text-center">
            We've sent a confirmation link to:
            <div className="mt-2 font-medium text-foreground">{email}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            <div className="font-medium mb-2">📧 Check your email</div>
            <div>Click the confirmation link in your email to complete your account setup.</div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            After confirming your email, click the button below to continue.
          </div>

          <Button
            onClick={handleConfirmation}
            disabled={isConfirming}
            className="w-full bg-[#d73a31] hover:bg-[#c73128]"
          >
            {isConfirming ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "I Confirmed My Email"
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or contact support.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}