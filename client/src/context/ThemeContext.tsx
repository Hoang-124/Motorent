import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  isLight: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'motorent_theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return 'dark';
};

const applyThemeToDom = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', mode === 'light' ? '#F6F5F0' : '#101010');
  }
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme());

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    applyThemeToDom(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDom(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
        setThemeState(event.newValue);
        applyThemeToDom(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLight: theme === 'light',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
