import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-supabase-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  User,
  MapPin,
  CreditCard,
  Star,
  ShoppingBag,
  Lock,
  Eye,
  EyeOff,
  Save,
  LogOut,
  Home,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ProfilePage: React.FC = () => {
  const { user, logoutMutation, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Form states
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");
  const [zipCode, setZipCode] = useState(user?.zipCode || "");

  // Sync form state with user data when it changes
  useEffect(() => {
    if (user) {
      console.log('👤 Syncing form with user data:', {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
      });

      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
      setCity(user.city || "");
      setState(user.state || "");
      setZipCode(user.zipCode || "");
    }
  }, [user]);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete account states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { first_name?: string; last_name?: string; email?: string; phone: string; address: string; city: string; state: string; zip_code: string }) => {
      console.log('🔄 Updating profile with data:', data);
      const response = await apiRequest("PATCH", "/api/user-profile", data);
      const result = await response.json();
      console.log('✅ Profile update response:', result);
      return result;
    },
    onSuccess: async (updatedData) => {
      console.log('🎉 Profile update successful:', updatedData);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      // Refresh user profile to get updated data
      await refreshUserProfile();

      // Also update form state immediately with the returned data
      if (updatedData) {
        setFirstName(updatedData.first_name || "");
        setLastName(updatedData.last_name || "");
        setEmail(updatedData.email || "");
        setPhone(updatedData.phone || "");
        setAddress(updatedData.address || "");
        setCity(updatedData.city || "");
        setState(updatedData.state || "");
        setZipCode(updatedData.zip_code || "");
      }
    },
    onError: (error: any) => {
      console.error('❌ Profile update failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("PATCH", "/api/user/password", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user/delete-account", {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account and personal data have been permanently deleted.",
      });
      // Log the user out and redirect to home
      setTimeout(() => {
        logoutMutation.mutate();
        navigate("/");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmText === "DELETE") {
      deleteAccountMutation.mutate();
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    } else {
      toast({
        title: "Confirmation Required",
        description: "Please type DELETE to confirm account deletion",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('📝 Form data being submitted:', {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      city,
      state,
      zip_code: zipCode,
    });

    updateProfileMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      city,
      state,
      zip_code: zipCode,
    });
  };

  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      city,
      state,
      zip_code: zipCode,
    });
  };
  
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };
  
  const isGoogleUser = user?.isGoogleUser || false;
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
            <p className="text-gray-600 mb-4">You need to be logged in to view your profile.</p>
            <Link href="/auth">
              <Button className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Profile | Favilla's NY Pizza</title>
        <meta name="description" content="Manage your account information, saved addresses, and preferences." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Hero Header with Profile Circle */}
        <div className="bg-gradient-to-r from-[#d73a31] to-[#ff6b35] text-white pt-20 lg:pt-24 pb-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30 transform hover:scale-105 transition-transform">
                <span className="text-5xl font-bold text-white">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-3">Welcome back, {user.firstName}!</h1>
              <p className="text-white/90 text-lg">Manage your account and explore your rewards</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-20">
          <div className="max-w-4xl mx-auto">

            {/* Quick Actions Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Link href="/">
                  <Card className="bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                        <Home className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">Return Home</h3>
                      <p className="text-gray-500 text-sm">Back to menu</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/orders">
                  <Card className="bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <ShoppingBag className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">My Orders</h3>
                      <p className="text-gray-500 text-sm">View order history</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/rewards">
                  <Card className="bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <Star className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">My Rewards</h3>
                      <p className="text-gray-500 text-sm">Earn & redeem points</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              <div className="text-center">
                <Button
                  variant="outline"
                  className="w-full max-w-xs bg-white border-2 border-gray-200 text-gray-700 hover:text-red-600 hover:bg-red-50 hover:border-red-300 shadow-lg"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">

              {/* Main Content */}
              <div className="space-y-6">
                {/* Personal Information */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-[#d73a31] to-[#ff6b6b] text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <User className="h-6 w-6" />
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-red-100">
                      Update your basic account information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="bg-[#d73a31] hover:bg-[#c73128] text-white"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MapPin className="h-6 w-6" />
                      Delivery Address
                    </CardTitle>
                    <CardDescription className="text-green-100">
                      Manage your default delivery address
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Main St"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="State"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipCode">ZIP Code</Label>
                          <Input
                            id="zipCode"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save Address"}
                      </Button>

                      <p className="text-sm text-gray-500">
                        This address will be used as your default for delivery orders
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>
                      Manage your saved payment methods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 mb-4">No saved payment methods</p>
                      <p className="text-sm text-gray-500">
                        Payment methods will be saved during checkout for faster future orders
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Change Password - Only for non-Google users */}
                {!isGoogleUser ? (
                  <Card className="bg-white shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Lock className="h-6 w-6" />
                        Change Password
                      </CardTitle>
                      <CardDescription className="text-purple-100">
                        Update your account password
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="newPassword">New Password</Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              minLength={6}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              minLength={6}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          disabled={changePasswordMutation.isPending}
                          variant="outline"
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Lock className="h-6 w-6" />
                        Password Management
                      </CardTitle>
                      <CardDescription className="text-blue-100">
                        Password management for Google accounts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Account</h3>
                        <p className="text-gray-600 mb-4">
                          You signed in with Google, so your password is managed by Google.
                        </p>
                        <p className="text-sm text-gray-500">
                          To change your password, please visit your Google Account settings.
                        </p>
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => window.open('https://myaccount.google.com/security', '_blank')}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Go to Google Account Settings
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Danger Zone */}
                <Card className="bg-white shadow-lg border-2 border-red-300">
                  <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <AlertTriangle className="h-6 w-6" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription className="text-red-100">
                      Irreversible actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Trash2 className="h-6 w-6 text-red-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">Delete My Account</h3>
                          <p className="text-gray-700 mb-2">
                            Permanently delete your account and all personal data. This action cannot be undone.
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>• All personal information will be deleted</li>
                            <li>• Your rewards and points will be lost</li>
                            <li>• Order history will be anonymized (kept for business records)</li>
                            <li>• You cannot recover your account after deletion</li>
                          </ul>
                          <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete My Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Account - Are You Absolutely Sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-semibold text-gray-900">
                This action cannot be undone. This will permanently delete your account and remove your personal data from our servers.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>What will be deleted:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                  <li>• Your name, email, phone, and address</li>
                  <li>• Your rewards account and points balance</li>
                  <li>• Your saved preferences</li>
                  <li>• Your account login credentials</li>
                </ul>
                <p className="text-sm text-gray-700">
                  <strong>What will be kept (anonymized):</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Order history (for business/tax records)</li>
                  <li>• Transaction records (required by law)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm" className="text-gray-900 font-semibold">
                  Type <span className="text-red-600 font-mono">DELETE</span> to confirm:
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfilePage;