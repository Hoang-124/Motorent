import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: Set<string>;
  wishlistCount: number;
  loading: boolean;
  isInWishlist: (vehicleId: string) => boolean;
  toggleWishlist: (vehicleId: string) => Promise<boolean>;
  isToggling: (vehicleId: string) => boolean;
  refreshWishlistIds: () => Promise<void>;
  toast: { type: 'success' | 'error'; text: string } | null;
  clearToast: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((current) => (current?.text === text ? null : current));
    }, 3500);
  }, []);

  // Tải /wishlist/ids một lần khi đăng nhập
  const fetchWishlistIds = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setWishlistIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/wishlist/ids');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setWishlistIds(new Set(res.data.data));
      }
    } catch (err) {
      console.warn('Lỗi khi tải wishlist ids:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchWishlistIds();
  }, [fetchWishlistIds]);

  const isInWishlist = useCallback(
    (vehicleId: string): boolean => {
      return wishlistIds.has(vehicleId);
    },
    [wishlistIds]
  );

  const isToggling = useCallback(
    (vehicleId: string): boolean => {
      return togglingIds.has(vehicleId);
    },
    [togglingIds]
  );

  const toggleWishlist = async (vehicleId: string): Promise<boolean> => {
    // 1. Chưa đăng nhập bấm tim: chuyển tới login kèm returnUrl, đăng nhập xong quay lại
    if (!isAuthenticated || !user) {
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?returnUrl=${returnUrl}`);
      return false;
    }

    // 2. Chống double-click: nếu đang xử lý xe này thì bỏ qua
    if (togglingIds.has(vehicleId)) {
      return false;
    }

    const currentlyLiked = wishlistIds.has(vehicleId);
    const willLike = !currentlyLiked;

    // 3. Cập nhật ngay (Optimistic Update)
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (willLike) {
        next.add(vehicleId);
      } else {
        next.delete(vehicleId);
      }
      return next;
    });

    // Đánh dấu đang toggle xe này
    setTogglingIds((prev) => new Set(prev).add(vehicleId));

    try {
      if (willLike) {
        await api.post(`/wishlist/${vehicleId}`);
        showToast('success', 'Đã thêm vào danh sách xe yêu thích.');
      } else {
        await api.delete(`/wishlist/${vehicleId}`);
        showToast('success', 'Đã xóa khỏi danh sách xe yêu thích.');
      }
      return true;
    } catch (error: any) {
      // 4. Lỗi thì rollback + toast
      setWishlistIds((prev) => {
        const rollback = new Set(prev);
        if (currentlyLiked) {
          rollback.add(vehicleId);
        } else {
          rollback.delete(vehicleId);
        }
        return rollback;
      });

      const message =
        error.response?.data?.message ||
        'Không thể cập nhật danh sách yêu thích. Vui lòng thử lại sau.';
      showToast('error', message);
      return false;
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(vehicleId);
        return next;
      });
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.size,
        loading,
        isInWishlist,
        toggleWishlist,
        isToggling,
        refreshWishlistIds: fetchWishlistIds,
        toast,
        clearToast,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
