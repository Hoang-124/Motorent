import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  PhoneCall,
  HelpCircle,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';
import { FaqModal } from './FaqModal';
import { useTranslation } from '../context/I18nContext';
import { api } from '../services/api';
import type { Branch, Category } from '../types';

export const Footer: React.FC = () => {
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/branches').catch(() => null),
      api.get('/categories').catch(() => null),
    ]).then(([branchRes, catRes]) => {
      if (!active) return;
      if (Array.isArray(branchRes?.data?.data)) {
        setBranches(branchRes.data.data);
      }
      if (Array.isArray(catRes?.data?.data)) {
        setCategories(catRes.data.data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Hide B2C marketing footer on the operational CounterDesk workspace
  if (location.pathname.startsWith('/counter')) {
    return null;
  }

  const primaryPhone = branches[0]?.phone || '';

  return (
    <>
      <footer className="bg-[#101010] text-[#A0A0A0] pt-16 pb-12 border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Editorial Masthead Banner inside Footer */}
          <div className="pb-12 mb-12 border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#FFC799] font-medium">
                {t('footer.mastheadBadge')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-semibold text-[#F5F5F5] tracking-tight leading-snug">
                {t('footer.mastheadTitle')}{' '}
                <span className="font-serif-display italic font-normal text-[#FFC799]">
                  {t('footer.mastheadAccent')}
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {primaryPhone && (
                <a
                  href={`tel:${primaryPhone.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center space-x-2.5 px-5 py-2.5 rounded-full bg-[#1E1E1E] border border-white/12 text-[#F5F5F5] hover:border-[#FFC799]/50 text-xs font-medium transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>{t('footer.hotlineLabel')}</span>
                  <span className="font-mono-tabular font-semibold">{primaryPhone}</span>
                </a>
              )}
              <button
                onClick={() => setIsFaqOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#F5F5F5] hover:bg-[#FFD6B3] text-[#101010] text-xs font-semibold transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t('footer.faqButton')}</span>
              </button>
            </div>
          </div>

          {/* Main 12-Column Editorial Directory */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/[0.08]">

            {/* Column 1: Atelier Identity & Legal (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-bold tracking-[0.14em] text-[#F5F5F5] uppercase">
                  MOTORENT
                </span>
                <span className="font-serif-display italic text-base text-[#FFC799]">
                  Đà Nẵng
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed pr-4">
                Hệ thống trạm cho thuê xe máy tự lái đô thị tại TP. Đà Nẵng. Đội xe chính hãng vận hành êm ái, tiết kiệm nhiên liệu, được kiểm tra an toàn trước mỗi chuyến đi. Giao nhận nhanh tại các chi nhánh toàn thành phố, hợp đồng số hóa eKYC <strong className="text-[#F5F5F5] font-medium">không giữ CCCD gốc</strong>.
              </p>

              <div className="space-y-2 text-xs text-[#A0A0A0] pt-2 border-t border-white/[0.06]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] flex-shrink-0" />
                  <span>Dữ liệu trạm, danh mục &amp; đội xe đồng bộ thời gian thực</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799] flex-shrink-0" />
                  <span>Bảo hiểm trách nhiệm dân sự &amp; Hỗ trợ kỹ thuật nội thành 24/7</span>
                </div>
              </div>
            </div>

            {/* Column 2: Vehicle Collection from DB Categories (2 cols) */}
            <div className="lg:col-span-2">
              <h4 className="text-[11px] font-semibold text-[#F5F5F5] uppercase tracking-[0.14em] mb-4">
                {t('footer.colFleet')}
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/bikes" className="hover:text-[#F5F5F5] transition-colors flex items-center justify-between font-medium text-[#FFC799]">
                    <span>{t('footer.allFleet')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat._id}>
                    <Link to={`/bikes?type=${cat.slug}`} className="hover:text-[#F5F5F5] transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Service Principles (3 cols) */}
            <div className="lg:col-span-3">
              <h4 className="text-[11px] font-semibold text-[#F5F5F5] uppercase tracking-[0.14em] mb-4">
                {t('footer.colPolicy')}
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link
                    to="/rental-policy"
                    className="inline-flex items-center space-x-1.5 text-[#F5F5F5] hover:text-[#FFC799] font-medium transition-colors"
                  >
                    <span>{t('footer.rentalPolicy')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#FFC799]" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faq"
                    className="w-full text-left inline-flex items-center space-x-1.5 text-[#F5F5F5] hover:text-[#FFC799] font-medium transition-colors"
                  >
                    <span>{t('footer.faqLink')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#FFC799]" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-[#F5F5F5] transition-colors flex items-center space-x-1.5"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                    <span>{t('footer.termsLink')}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-[#F5F5F5] transition-colors flex items-center space-x-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                    <span>{t('footer.privacyLink')}</span>
                  </Link>
                </li>
                <li className="flex items-center space-x-2 text-[#A0A0A0]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                  <span>Hoàn cọc 100% khi báo hủy trước 24 giờ</span>
                </li>
                <li className="text-[#A0A0A0]">
                  Trang bị tiêu chuẩn: 02 mũ 3/4 khử khuẩn UV &amp; 02 áo mưa
                </li>
              </ul>
            </div>

            {/* Column 4: Open Typographic Station Ledger from DB Branches (3 cols) */}
            <div className="lg:col-span-3">
              <h4 className="text-[11px] font-semibold text-[#F5F5F5] uppercase tracking-[0.14em] mb-4">
                {t('footer.colStations')}
              </h4>
              <div className="divide-y divide-white/[0.08] border-y border-white/[0.08] text-xs">
                {branches.map((br) => (
                  <div key={br._id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[#F5F5F5] truncate">
                        {br.name.replace('Chi nhánh ', '')}
                      </p>
                      <span className="font-mono-tabular text-[10px] text-[#FFC799] shrink-0">
                        {br.hours_open}–{br.hours_close}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A0A0A0] mt-0.5 flex items-start">
                      <MapPin className="w-3 h-3 text-[#A0A0A0] mr-1 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{br.address}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Colophon */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-[#6E6E6E] space-y-4 sm:space-y-0">
            <p>{t('footer.copyright')}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
              <Link to="/rental-policy" className="hover:text-[#F5F5F5] transition-colors">
                {t('footer.rentalPolicy')}
              </Link>
              <Link to="/faq" className="hover:text-[#F5F5F5] transition-colors">
                FAQ
              </Link>
              <Link to="/terms" className="hover:text-[#F5F5F5] transition-colors">
                {t('footer.termsLink')}
              </Link>
              <Link to="/privacy" className="hover:text-[#F5F5F5] transition-colors">
                {t('footer.privacyLink')}
              </Link>
              <Link to="/branches" className="hover:text-[#F5F5F5] transition-colors">
                {t('footer.stationMap')}
              </Link>
              <Link to="/bikes" className="hover:text-[#F5F5F5] transition-colors">
                {t('nav.fleetPricing')}
              </Link>
            </div>
          </div>

        </div>
      </footer>

      {/* Interactive FAQ Modal */}
      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />
    </>
  );
};
