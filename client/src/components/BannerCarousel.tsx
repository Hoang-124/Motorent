import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import type { Banner } from '../types';
import { getBannerImageUrl } from '../utils/imageHelper';

export const BannerCarousel: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/banners');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setBanners(res.data.data);
      } else if (Array.isArray(res.data)) {
        setBanners(res.data);
      } else {
        setBanners([]);
      }
    } catch {
      // If fetching fails, hide section per specification
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleNext = useCallback(() => {
    setBanners((currentBanners) => {
      if (currentBanners.length <= 1) return currentBanners;
      setCurrentIndex((prev) => (prev + 1) % currentBanners.length);
      return currentBanners;
    });
  }, []);

  const handlePrev = useCallback(() => {
    setBanners((currentBanners) => {
      if (currentBanners.length <= 1) return currentBanners;
      setCurrentIndex((prev) => (prev - 1 + currentBanners.length) % currentBanners.length);
      return currentBanners;
    });
  }, []);

  // Auto-slide effect every 5 seconds (paused on hover)
  useEffect(() => {
    if (isPaused || banners.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, banners.length, handleNext]);

  // Click on slide navigation
  const handleBannerClick = (banner: Banner) => {
    if (!banner.linkUrl) return;
    const url = banner.linkUrl.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (url.startsWith('/')) {
      navigate(url);
    }
  };

  // Rule FE: "Không có banner thì ẩn khu vực này, không để khoảng trống."
  if (!loading && banners.length === 0) {
    return null;
  }

  if (loading && banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  if (!currentBanner) return null;

  const currentImageUrl = getBannerImageUrl(currentBanner.imageUrl);
  const isClickable = Boolean(currentBanner.linkUrl);

  return (
    <section
      aria-label="Banner Quảng Cáo & Khuyến Mãi"
      className="relative w-full overflow-hidden border-b border-white/[0.08] bg-[#141414]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div
          onClick={() => isClickable && handleBannerClick(currentBanner)}
          className={`relative w-full h-44 sm:h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden border border-white/10 group transition-all ${
            isClickable ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          {/* Background banner image with lazy loading */}
          <img
            key={currentBanner._id || currentBanner.id || currentIndex}
            src={currentImageUrl}
            alt={currentBanner.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Luxury dark gradient scrim overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101010]/90 via-[#101010]/40 to-transparent" />

          {/* Banner text overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col justify-end">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#101010]/80 backdrop-blur-md border border-white/10 text-[11px] font-mono-tabular uppercase tracking-wider text-[#FFC799]">
                <span>MOTORENT Highlight</span>
                {isClickable && <ExternalLink className="w-3 h-3 text-[#FFC799]" />}
              </div>

              <h2 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F5F5] drop-shadow-md">
                {currentBanner.title}
              </h2>
            </div>
          </div>

          {/* Previous / Next Slide Controls (Shown only if more than 1 banner) */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#101010]/80 hover:bg-[#FFC799] text-[#F5F5F5] hover:text-[#101010] border border-white/15 hover:border-[#FFC799] flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 z-10 cursor-pointer shadow-lg backdrop-blur-md"
                aria-label="Slide trước"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#101010]/80 hover:bg-[#FFC799] text-[#F5F5F5] hover:text-[#101010] border border-white/15 hover:border-[#FFC799] flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 z-10 cursor-pointer shadow-lg backdrop-blur-md"
                aria-label="Slide tiếp theo"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Navigation Indicators / Dots */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center space-x-1.5 z-10 bg-[#101010]/70 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                {banners.map((b, idx) => (
                  <button
                    key={b._id || b.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentIndex
                        ? 'w-6 bg-[#FFC799]'
                        : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                    aria-label={`Chuyển đến slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;
