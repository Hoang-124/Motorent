import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Languages,
  Search,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { useTranslation } from '../context/I18nContext';
import {
  DEFAULT_TRANSLATIONS,
  I18N_KEY_CATALOG,
  type I18nNamespace,
  type SupportedLocale,
  type TranslationKey,
} from '../i18n/translations';

const NAMESPACE_FILTERS: Array<{ id: 'all' | I18nNamespace; label: string }> = [
  { id: 'all', label: 'Tất cả phân hệ' },
  { id: 'nav', label: 'Điều hướng (Header)' },
  { id: 'home', label: 'Trang chủ (Hero)' },
  { id: 'footer', label: 'Chân trang (Footer)' },
  { id: 'admin', label: 'Quản trị (Admin)' },
  { id: 'common', label: 'Dùng chung' },
];

export const I18nManager: React.FC = () => {
  const {
    locale,
    setLocale,
    defaultLocale,
    overrides,
    saveAdminTranslations,
  } = useTranslation();

  const [draftDefaultLocale, setDraftDefaultLocale] = useState<SupportedLocale>(defaultLocale);
  const [draftVi, setDraftVi] = useState<Record<string, string>>({});
  const [draftEn, setDraftEn] = useState<Record<string, string>>({});
  const [selectedNamespace, setSelectedNamespace] = useState<'all' | I18nNamespace>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyCustomized, setOnlyCustomized] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    setDraftDefaultLocale(defaultLocale);
  }, [defaultLocale]);

  useEffect(() => {
    setDraftVi({ ...(overrides.vi || {}) });
    setDraftEn({ ...(overrides.en || {}) });
  }, [overrides]);

  const customizedCount = useMemo(() => {
    let count = 0;
    for (const item of I18N_KEY_CATALOG) {
      const k = item.key;
      const customVi = draftVi[k]?.trim();
      const customEn = draftEn[k]?.trim();
      if (
        (customVi && customVi !== DEFAULT_TRANSLATIONS.vi[k]) ||
        (customEn && customEn !== DEFAULT_TRANSLATIONS.en[k])
      ) {
        count += 1;
      }
    }
    return count;
  }, [draftVi, draftEn]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return I18N_KEY_CATALOG.filter((entry) => {
      if (selectedNamespace !== 'all' && entry.namespace !== selectedNamespace) {
        return false;
      }

      const viVal = draftVi[entry.key] ?? DEFAULT_TRANSLATIONS.vi[entry.key];
      const enVal = draftEn[entry.key] ?? DEFAULT_TRANSLATIONS.en[entry.key];
      const isCustom =
        Boolean(draftVi[entry.key] && draftVi[entry.key] !== DEFAULT_TRANSLATIONS.vi[entry.key]) ||
        Boolean(draftEn[entry.key] && draftEn[entry.key] !== DEFAULT_TRANSLATIONS.en[entry.key]);

      if (onlyCustomized && !isCustom) {
        return false;
      }

      if (!q) return true;
      return (
        entry.key.toLowerCase().includes(q) ||
        viVal.toLowerCase().includes(q) ||
        enVal.toLowerCase().includes(q)
      );
    });
  }, [selectedNamespace, searchQuery, onlyCustomized, draftVi, draftEn]);

  const handleFieldChange = (lang: SupportedLocale, key: TranslationKey, nextVal: string) => {
    setFeedback(null);
    const baseVal = DEFAULT_TRANSLATIONS[lang][key];
    if (lang === 'vi') {
      setDraftVi((prev) => {
        const next = { ...prev };
        if (!nextVal.trim() || nextVal === baseVal) {
          delete next[key];
        } else {
          next[key] = nextVal;
        }
        return next;
      });
    } else {
      setDraftEn((prev) => {
        const next = { ...prev };
        if (!nextVal.trim() || nextVal === baseVal) {
          delete next[key];
        } else {
          next[key] = nextVal;
        }
        return next;
      });
    }
  };

  const handleResetKey = (key: TranslationKey) => {
    setFeedback(null);
    setDraftVi((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDraftEn((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleResetAll = () => {
    setFeedback(null);
    setDraftVi({});
    setDraftEn({});
    setDraftDefaultLocale('vi');
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await saveAdminTranslations({
        defaultLocale: draftDefaultLocale,
        overrides: {
          vi: draftVi,
          en: draftEn,
        },
      });
      setFeedback({
        type: 'success',
        message: 'Đã lưu bộ từ điển đa ngôn ngữ (Tiếng Việt & English) lên hệ thống và áp dụng tức thì.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Không thể lưu bản dịch lên máy chủ. Vui lòng kiểm tra quyền SystemAdmin và thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top KPI & Live Language Studio Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Ngôn ngữ đang xem (Live)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFC799]/15 text-[#FFC799] font-mono-tabular text-[10px] font-bold uppercase">
              {locale}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setLocale('vi')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                locale === 'vi'
                  ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                  : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5]'
              }`}
            >
              Tiếng Việt (VI)
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                locale === 'en'
                  ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                  : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5]'
              }`}
            >
              English (EN)
            </button>
          </div>
        </div>

        <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Ngôn ngữ mặc định hệ thống</span>
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDraftDefaultLocale('vi')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                draftDefaultLocale === 'vi'
                  ? 'bg-[#F5F5F5] text-[#101010] border-[#F5F5F5]'
                  : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5]'
              }`}
            >
              Mặc định: VI
            </button>
            <button
              type="button"
              onClick={() => setDraftDefaultLocale('en')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                draftDefaultLocale === 'en'
                  ? 'bg-[#F5F5F5] text-[#101010] border-[#F5F5F5]'
                  : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5]'
              }`}
            >
              Mặc định: EN
            </button>
          </div>
        </div>

        <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#FFC799]" />
            <span>Tổng khóa từ điển (VI / EN)</span>
          </span>
          <div className="pt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono-tabular text-[#F5F5F5]">
              {I18N_KEY_CATALOG.length}
            </p>
            <span className="text-xs text-[#A0A0A0]">100% song ngữ</span>
          </div>
        </div>

        <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FFC799]" />
            <span>Mục đã tùy chỉnh bởi Admin</span>
          </span>
          <div className="pt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono-tabular text-[#FFC799]">
              {customizedCount}
            </p>
            <span className="text-xs text-[#A0A0A0]">Lưu trữ MongoDB</span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-[#FF8080]/10 border-[#FF8080]/30 text-[#FF8080]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter, Search & Save Toolbar */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {NAMESPACE_FILTERS.map((ns) => (
              <button
                key={ns.id}
                type="button"
                onClick={() => setSelectedNamespace(ns.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedNamespace === ns.id
                    ? 'bg-[#FFC799] text-[#101010]'
                    : 'bg-[#101010] text-[#A0A0A0] hover:text-[#F5F5F5] border border-white/10'
                }`}
              >
                {ns.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#101010] hover:bg-white/[0.06] border border-white/10 text-xs font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-50 text-[#101010] text-xs font-bold transition-all cursor-pointer shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu…' : 'Lưu bộ từ điển (UC-122)'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khóa (nav.home) hoặc nội dung Tiếng Việt / Tiếng Anh…"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F5F5] placeholder:text-[#6E6E6E] focus:outline-none focus:border-[#FFC799]"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyCustomized((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              onlyCustomized
                ? 'bg-[#FFC799]/15 border-[#FFC799]/40 text-[#FFC799]'
                : 'bg-[#101010] border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Chỉ hiện mục đã tùy chỉnh ({customizedCount})</span>
          </button>
        </div>
      </div>

      {/* Bilingual Translation Matrix */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 bg-[#101010] border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
          <div className="col-span-3">Mã khóa (Translation Key)</div>
          <div className="col-span-4">Tiếng Việt (VI)</div>
          <div className="col-span-4">English (EN)</div>
          <div className="col-span-1 text-right">Thao tác</div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-2">
            <Globe className="w-6 h-6 text-[#FFC799] mx-auto" />
            <p className="text-sm font-semibold text-[#F5F5F5]">
              Không tìm thấy mục từ điển phù hợp
            </p>
            <p className="text-xs text-[#A0A0A0]">
              Thử xóa bộ lọc hoặc từ khóa tìm kiếm để xem toàn bộ danh mục ngôn ngữ.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.08] max-h-[620px] overflow-y-auto">
            {filteredEntries.map((entry) => {
              const baseVi = DEFAULT_TRANSLATIONS.vi[entry.key];
              const baseEn = DEFAULT_TRANSLATIONS.en[entry.key];
              const currentVi = draftVi[entry.key] ?? baseVi;
              const currentEn = draftEn[entry.key] ?? baseEn;
              const isViModified = Boolean(draftVi[entry.key] && draftVi[entry.key] !== baseVi);
              const isEnModified = Boolean(draftEn[entry.key] && draftEn[entry.key] !== baseEn);
              const isAnyModified = isViModified || isEnModified;
              const isLongText = baseVi.length > 75 || baseEn.length > 75;

              return (
                <div
                  key={entry.key}
                  className={`p-4 sm:px-5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start transition-colors ${
                    isAnyModified ? 'bg-[#FFC799]/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="lg:col-span-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="px-2 py-0.5 rounded bg-[#101010] border border-white/10 font-mono-tabular text-[11px] text-[#FFC799]">
                        {entry.key}
                      </code>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] uppercase tracking-wider text-[#A0A0A0]">
                        {entry.namespace}
                      </span>
                    </div>
                    {isAnyModified && (
                      <p className="text-[11px] text-[#FFC799] font-medium">
                        Đã tùy chỉnh bản dịch
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-4 space-y-1">
                    <span className="lg:hidden text-[10px] uppercase tracking-wider text-[#A0A0A0] font-semibold">
                      Tiếng Việt (VI)
                    </span>
                    {isLongText ? (
                      <textarea
                        rows={3}
                        value={currentVi}
                        onChange={(e) => handleFieldChange('vi', entry.key, e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-[#101010] border text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799] resize-y ${
                          isViModified ? 'border-[#FFC799]/50' : 'border-white/10'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={currentVi}
                        onChange={(e) => handleFieldChange('vi', entry.key, e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-[#101010] border text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799] ${
                          isViModified ? 'border-[#FFC799]/50' : 'border-white/10'
                        }`}
                      />
                    )}
                  </div>

                  <div className="lg:col-span-4 space-y-1">
                    <span className="lg:hidden text-[10px] uppercase tracking-wider text-[#A0A0A0] font-semibold">
                      English (EN)
                    </span>
                    {isLongText ? (
                      <textarea
                        rows={3}
                        value={currentEn}
                        onChange={(e) => handleFieldChange('en', entry.key, e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-[#101010] border text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799] resize-y ${
                          isEnModified ? 'border-[#FFC799]/50' : 'border-white/10'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={currentEn}
                        onChange={(e) => handleFieldChange('en', entry.key, e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-[#101010] border text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799] ${
                          isEnModified ? 'border-[#FFC799]/50' : 'border-white/10'
                        }`}
                      />
                    )}
                  </div>

                  <div className="lg:col-span-1 flex lg:justify-end">
                    {isAnyModified && (
                      <button
                        type="button"
                        onClick={() => handleResetKey(entry.key)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#101010] hover:bg-white/[0.06] border border-white/10 text-[11px] text-[#A0A0A0] hover:text-[#FFC799] transition-colors cursor-pointer"
                        title="Khôi phục câu gốc"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="lg:hidden">Mặc định</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
