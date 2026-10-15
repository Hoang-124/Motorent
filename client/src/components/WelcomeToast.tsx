import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const WelcomeToast: React.FC = () => {
  const { welcomeNotice, clearWelcomeNotice } = useAuth();

  useEffect(() => {
    if (!welcomeNotice) return;

    // Automatically dismiss after 3.5 seconds
    const timer = setTimeout(() => {
      clearWelcomeNotice();
    }, 3500);

    return () => clearTimeout(timer);
  }, [welcomeNotice, clearWelcomeNotice]);

  if (!welcomeNotice) return null;

  const isNew = !!welcomeNotice.isNewUser;

  return (
    <div className="fixed top-[72px] right-3 sm:right-6 lg:right-8 z-50 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-[#161616]/95 backdrop-blur-md rounded-xl py-2 px-3 sm:px-3.5 border border-[#FFC799]/20 shadow-2xl shadow-black/80 flex items-center space-x-2.5 max-w-[calc(100vw-24px)]">
        {/* Subtle green vector icon badge */}
        <div className="w-6 h-6 rounded-full bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>

        {/* Clean, compact text */}
        <div className="text-xs text-[#A0A0A0] min-w-0 pr-1 leading-tight">
          <div className="font-bold text-white truncate">
            {isNew ? 'Chào mừng bạn đến với Motorent!' : 'Chào mừng bạn quay trở lại!'}
          </div>
          {welcomeNotice.name && (
            <div className="text-[11px] text-[#A0A0A0] truncate mt-0.5">
              Xin chào <span className="font-semibold text-[#FFC799]">{welcomeNotice.name}</span>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={clearWelcomeNotice}
          className="p-1 text-[#A0A0A0] hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
          aria-label="Đóng"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
