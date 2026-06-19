import { useEffect } from 'react';
import type { ThemeMode } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useTheme() {
  const theme = useUIStore((s) => s.preferences.theme);
  const einkMode = useUIStore((s) => s.preferences.einkMode);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;

    if (einkMode) {
      root.classList.remove('dark');
    } else {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      }
    }

    root.classList.toggle('eink', einkMode);

    if (theme === 'system' && !einkMode) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (!useUIStore.getState().preferences.einkMode) {
          root.classList.toggle('dark', mediaQuery.matches);
        }
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, einkMode]);

  return { theme, einkMode, setTheme, isDark: document.documentElement.classList.contains('dark') };
}
