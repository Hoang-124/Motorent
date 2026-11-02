import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Vehicle } from '../types';

interface CartContextType {
  cartItems: Vehicle[];
  cartCount: number;
  isInCart: (vehicleId: string) => boolean;
  addToCart: (vehicle: Vehicle) => void;
  removeFromCart: (vehicleId: string) => void;
  toggleCart: (vehicle: Vehicle) => void;
  clearCart: () => void;
  cartToast: { type: 'success' | 'info'; text: string } | null;
  clearCartToast: () => void;
}

const STORAGE_KEY = 'motorent_vehicle_cart_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<Vehicle[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [cartToast, setCartToast] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [cartItems]);

  const showToast = useCallback((type: 'success' | 'info', text: string) => {
    setCartToast({ type, text });
    setTimeout(() => {
      setCartToast((curr) => (curr?.text === text ? null : curr));
    }, 3000);
  }, []);

  const clearCartToast = useCallback(() => {
    setCartToast(null);
  }, []);

  const isInCart = useCallback(
    (vehicleId: string) => cartItems.some((item) => item._id === vehicleId),
    [cartItems]
  );

  const addToCart = useCallback(
    (vehicle: Vehicle) => {
      setCartItems((prev) => {
        if (prev.some((v) => v._id === vehicle._id)) {
          showToast('info', `${vehicle.vehicleModel} (${vehicle.licensePlate}) đã có trong giỏ xe.`);
          return prev;
        }
        showToast('success', `Đã thêm ${vehicle.vehicleModel} (${vehicle.licensePlate}) vào giỏ thuê nhiều xe.`);
        return [...prev, vehicle];
      });
    },
    [showToast]
  );

  const removeFromCart = useCallback(
    (vehicleId: string) => {
      setCartItems((prev) => {
        const target = prev.find((v) => v._id === vehicleId);
        if (target) {
          showToast('info', `Đã bỏ ${target.vehicleModel} khỏi giỏ xe.`);
        }
        return prev.filter((v) => v._id !== vehicleId);
      });
    },
    [showToast]
  );

  const toggleCart = useCallback(
    (vehicle: Vehicle) => {
      if (cartItems.some((v) => v._id === vehicle._id)) {
        removeFromCart(vehicle._id);
      } else {
        addToCart(vehicle);
      }
    },
    [cartItems, addToCart, removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount: cartItems.length,
        isInCart,
        addToCart,
        removeFromCart,
        toggleCart,
        clearCart,
        cartToast,
        clearCartToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
};

