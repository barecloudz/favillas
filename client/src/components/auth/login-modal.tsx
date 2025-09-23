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
  const { loginMutation, registerMutation, signInWithGoogle } = useAuth();
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
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email,
        phone: registerData.phone,
        address: registerData.address,
        password: registerData.password,
        marketingOptIn: registerData.marketingOptIn,
      });
      toast({
        title: "Registration successful",
        description: "Welcome to Favilla's!",
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by the mutation
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </Button>
            <DialogTitle className="text-center text-2xl font-bold text-[#d73a31] flex-1">
              Welcome
            </DialogTitle>
            <div className="w-12"></div> {/* Spacer for centering */}
          </div>
          <DialogDescription className="text-center">
            Sign in to your account or continue as a guest
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#d73a31] hover:bg-[#c73128]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="register-firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-firstName"
                      type="text"
                      placeholder="First name"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-lastName"
                      type="text"
                      placeholder="Last name"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="Enter your email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-address"
                    type="text"
                    placeholder="Enter your address"
                    value={registerData.address}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, address: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing-opt-in"
                  checked={registerData.marketingOptIn}
                  onCheckedChange={(checked) =>
                    setRegisterData(prev => ({ ...prev, marketingOptIn: checked === true }))
                  }
                />
                <Label htmlFor="marketing-opt-in" className="text-sm text-gray-600">
                  Subscribe to marketing emails for exclusive offers and updates
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#d73a31] hover:bg-[#c73128]"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col space-y-3">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full border-gray-300 hover:bg-gray-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
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
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleContinueAsGuest}
            className="w-full text-gray-600 hover:text-gray-800"
          >
            Continue as Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
