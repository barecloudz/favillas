import React, { useState } from "react";
import { useAuth } from "@/hooks/use-supabase-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Mail, Lock, Phone, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "login" | "register";
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = "login"
}) => {
  const [activeTab, setActiveTab] = useState(mode);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const { loginMutation, registerMutation, signInWithGoogle, supabase } = useAuth();
  const { toast } = useToast();

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    marketingOptIn: true, // Auto-checked for marketing emails
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await loginMutation.mutateAsync(loginData);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-submission if mutation is already in progress
    if (registerMutation.isPending) {
      console.log('⏳ Registration already in progress, ignoring duplicate submission');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username: registerData.email, // Use email as username
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email,
        phone: registerData.phone || '',
        address: registerData.address || '',
        password: registerData.password,
        role: 'customer',
        isActive: true,
        marketingOptIn: registerData.marketingOptIn ?? true,
      });
      toast({
        title: "Registration successful",
        description: "Welcome to Favilla's!",
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      // Enhanced error handling for rate limit
      if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
        toast({
          title: "Too many attempts",
          description: "Please wait a few minutes before trying again. You may already have an account - try signing in instead.",
          variant: "destructive",
        });
      }
      // Other errors are handled by the mutation
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // User will be redirected to Google OAuth, then back to callback
      // The auth state change will trigger success automatically
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Sign-in failed",
        description: "Unable to sign in with Google. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    toast({
      title: "Continuing as guest",
      description: "You can complete your order without an account",
    });
    onSuccess?.();
    onClose();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Failed to send reset email",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-w-[95vw] p-0 gap-0 bg-gradient-to-br from-white via-gray-50 to-red-50 overflow-hidden">
        {/* Premium Header with Gradient Background */}
        <div className="relative bg-gradient-to-r from-[#d73a31] via-[#c22d25] to-[#d73a31] text-white px-6 py-8 rounded-t-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 left-4 text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            ← Back
          </Button>
          <div className="text-center mt-2">
            <DialogTitle className="text-3xl font-bold mb-2 drop-shadow-lg">
              Welcome to Favilla's
            </DialogTitle>
            <DialogDescription className="text-red-100 text-base font-medium">
              Sign in to earn rewards on every order
            </DialogDescription>
          </div>
          {/* Decorative pizza slice icon */}
          <div className="absolute top-0 right-0 text-white/10 text-[120px] leading-none select-none">
            🍕
          </div>
        </div>

        {/* Main Content with Padding */}
        <div className="px-8 py-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border-2 border-gray-200 p-1 shadow-sm">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d73a31] data-[state=active]:to-[#c22d25] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d73a31] data-[state=active]:to-[#c22d25] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
            >
              Create Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-base font-semibold text-gray-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    We'll send you a link to reset your password
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 h-12 text-base font-semibold"
                  >
                    Back to Login
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#d73a31] to-[#c22d25] hover:from-[#c22d25] hover:to-[#b21d15] shadow-lg hover:shadow-xl transition-all duration-200 h-12 text-base font-semibold"
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : null}
                    Send Reset Link
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-base font-semibold text-gray-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-base font-semibold text-gray-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-[#d73a31] hover:text-[#c22d25] font-semibold hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#d73a31] to-[#c22d25] hover:from-[#c22d25] hover:to-[#b21d15] text-white shadow-lg hover:shadow-xl transition-all duration-200 py-6 text-lg font-semibold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  Sign In
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="register" className="space-y-5">
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="register-firstName" className="text-base font-semibold text-gray-700">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="register-firstName"
                      type="text"
                      placeholder="First name"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-lastName" className="text-base font-semibold text-gray-700">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="register-lastName"
                      type="text"
                      placeholder="Last name"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-base font-semibold text-gray-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-base font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirmPassword" className="text-base font-semibold text-gray-700">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <Input
                    id="register-confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-12 h-14 text-base border-2 border-gray-200 rounded-xl focus:border-[#d73a31] focus:ring-2 focus:ring-[#d73a31]/20 transition-all shadow-sm hover:border-gray-300"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing-opt-in"
                  checked={registerData.marketingOptIn ?? true}
                  onCheckedChange={(checked) =>
                    setRegisterData(prev => ({ ...prev, marketingOptIn: Boolean(checked) }))
                  }
                />
                <Label htmlFor="marketing-opt-in" className="text-sm text-gray-600">
                  Subscribe to marketing emails for exclusive offers and updates
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#d73a31] to-[#c22d25] hover:from-[#c22d25] hover:to-[#b21d15] text-white shadow-lg hover:shadow-xl transition-all duration-200 py-6 text-lg font-semibold"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Premium Footer Section */}
        <div className="flex-col space-y-4 mt-6">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm font-medium uppercase tracking-wide">
              <span className="bg-gradient-to-br from-white via-gray-50 to-red-50 px-3 text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full border-2 border-gray-300 hover:border-gray-400 hover:bg-white shadow-sm hover:shadow-md transition-all duration-200 py-6 text-base font-semibold"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm font-medium uppercase tracking-wide">
              <span className="bg-gradient-to-br from-white via-gray-50 to-red-50 px-3 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleContinueAsGuest}
            className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 py-5 text-base font-medium"
          >
            Continue as Guest
          </Button>
        </div>

        </div> {/* Close main content div */}
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
