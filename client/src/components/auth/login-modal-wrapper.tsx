import React from "react";
import { useCart } from "@/hooks/use-cart";
import LoginModal from "./login-modal";

const LoginModalWrapper: React.FC = () => {
  const { isLoginModalOpen, hideLoginModal, addPendingItemToCart } = useCart();

  const handleSuccess = () => {
    // Add pending item to cart after successful login
    addPendingItemToCart();
  };

  return (
    <LoginModal
      isOpen={isLoginModalOpen}
      onClose={hideLoginModal}
      onSuccess={handleSuccess}
    />
  );
};

export default LoginModalWrapper;
