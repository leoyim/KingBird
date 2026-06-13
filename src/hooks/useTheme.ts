import { useEffect } from 'react';
import type { ThemeMode } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useTheme() {
  const theme = useUIStore((s) => s.preferences.theme);
  const eyeCareMode = useUIStore((s) => s.preferences.eyeCareMode);
  const einkMode = useUIStore((s) => s.preferences.einkMode);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (mode: ThemeMode) => {
      if (mode === 'dark') {
        root.classList.add('dark');
      } else if (mode === 'light') {
        root.classList.remove('dark');
      } else {
        // System
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('eye-care', eyeCareMode);
  }, [eyeCareMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('eink', einkMode);
  }, [einkMode]);

  return { theme, eyeCareMode, einkMode, setTheme, isDark: document.documentElement.classList.contains('dark') };
}
