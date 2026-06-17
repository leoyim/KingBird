/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mac: {
          blue: 'rgb(var(--kingbird-accent-rgb, 0 122 255) / <alpha-value>)',
          'blue-dark': '#0056CC',
          'blue-light': '#E8F2FF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          bg: '#F5F5F7',
          'bg-dark': '#1C1C1E',
          card: '#FFFFFF',
          'card-dark': '#2C2C2E',
          text: '#1D1D1F',
          'text-secondary': '#86868B',
          'text-dark': '#F5F5F7',
          'text-dark-secondary': '#98989D',
          sidebar: 'rgba(245, 245, 247, 0.72)',
          'sidebar-dark': 'rgba(28, 28, 30, 0.85)',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"SF Pro Display"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}

