import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

/** Convert hex color to space-separated RGB for Tailwind CSS variable */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 122 255'; // fallback blue
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

/** Sync highlightColor preference to CSS variable */
export function useHighlightColor(): void {
  const highlightColor = useUIStore((s) => s.preferences.highlightColor);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ezrss-accent-rgb', hexToRgb(highlightColor || '#007AFF'));
  }, [highlightColor]);
}
