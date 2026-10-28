import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import {
  DEFAULT_TRANSLATIONS,
  type SupportedLocale,
  type TranslationKey,
} from '../i18n/translations';

const LOCALE_STORAGE_KEY = 'motorent_locale';

export interface I18nOverridesMap {
  vi: Record<string, string>;
  en: Record<string, string>;
}

interface I18nContextValue {
  locale: SupportedLocale;
  isEnglish: boolean;
  defaultLocale: SupportedLocale;
  overrides: I18nOverridesMap;
  setLocale: (next: SupportedLocale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  refreshTranslations: () => Promise<void>;
  saveAdminTranslations: (payload: {
    defaultLocale?: SupportedLocale;
    overrides: I18nOverridesMap;
  }) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const readStoredLocale = (): SupportedLocale | null => {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === 'vi' || saved === 'en') {
    return saved;
  }
  return null;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => readStoredLocale() || 'vi');
  const [defaultLocale, setDefaultLocale] = useState<SupportedLocale>('vi');
  const [overrides, setOverrides] = useState<I18nOverridesMap>({ vi: {}, en: {} });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next: SupportedLocale = prev === 'vi' ? 'en' : 'vi';
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const refreshTranslations = useCallback(async () => {
    try {
      const res = await api.get('/system/i18n');
      const data = res.data?.data;
      if (!data) return;

      const serverDefault: SupportedLocale = data.defaultLocale === 'en' ? 'en' : 'vi';
      setDefaultLocale(serverDefault);

      const nextOverrides: I18nOverridesMap = {
        vi: data.overrides?.vi && typeof data.overrides.vi === 'object' ? data.overrides.vi : {},
        en: data.overrides?.en && typeof data.overrides.en === 'object' ? data.overrides.en : {},
      };
      setOverrides(nextOverrides);

      // Apply server default locale only when visitor has not explicitly chosen a preference yet
      if (!readStoredLocale()) {
        setLocaleState(serverDefault);
      }
    } catch {
      // Fallback gracefully to bundled dictionary when offline
    }
  }, []);

  useEffect(() => {
    void refreshTranslations();
  }, [refreshTranslations]);

  const saveAdminTranslations = useCallback(
    async (payload: { defaultLocale?: SupportedLocale; overrides: I18nOverridesMap }) => {
      const res = await api.put('/system/i18n', payload);
      const data = res.data?.data;
      if (data) {
        const updatedDefault: SupportedLocale = data.defaultLocale === 'en' ? 'en' : 'vi';
        setDefaultLocale(updatedDefault);
        setOverrides({
          vi: data.overrides?.vi || {},
          en: data.overrides?.en || {},
        });
      }
    },
    []
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const customText = overrides[locale]?.[key];
      const baseText = DEFAULT_TRANSLATIONS[locale]?.[key] || DEFAULT_TRANSLATIONS.vi[key] || key;
      let resolved = customText && customText.trim().length > 0 ? customText : baseText;

      if (params) {
        for (const [paramKey, paramVal] of Object.entries(params)) {
          resolved = resolved.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramVal));
        }
      }

      return resolved;
    },
    [locale, overrides]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      isEnglish: locale === 'en',
      defaultLocale,
      overrides,
      setLocale,
      toggleLocale,
      t,
      refreshTranslations,
      saveAdminTranslations,
    }),
    [
      locale,
      defaultLocale,
      overrides,
      setLocale,
      toggleLocale,
      t,
      refreshTranslations,
      saveAdminTranslations,
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
};
