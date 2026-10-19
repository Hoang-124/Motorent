import React, { useEffect } from 'react';
import { AlertCircle, X, Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

export const WishlistToast: React.FC = () => {
  const { toast, clearToast } = useWishlist();

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      clearToast();
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed top-[72px] right-3 sm:right-6 lg:right-8 z-50 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        className={`bg-[#161616]/95 backdrop-blur-md rounded-xl py-2 px-3 sm:px-3.5 border shadow-2xl shadow-black/80 flex items-center space-x-2.5 max-w-[calc(100vw-24px)] ${
          isSuccess
            ? 'border-[#FFC799]/30 text-[#F5F5F5]'
            : 'border-red-500/40 text-red-200'
        }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
            isSuccess
              ? 'bg-[#FFC799]/15 text-[#FFC799] border-[#FFC799]/30'
              : 'bg-red-500/15 text-red-400 border-red-500/30'
          }`}
        >
          {isSuccess ? (
            <Heart className="w-3.5 h-3.5 fill-[#FFC799] stroke-[#FFC799]" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </div>

        <div className="text-xs min-w-0 pr-1 leading-tight font-medium">
          {toast.text}
        </div>

        <button
          type="button"
          onClick={clearToast}
          className="p-1 text-[#A0A0A0] hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
          aria-label="Đóng"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
