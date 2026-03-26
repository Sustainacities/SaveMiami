import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SaveMiami brand palette — ocean blues, mangrove greens, coral alerts
        miami: {
          ocean:    '#0A2E4A',
          teal:     '#00B4D8',
          cyan:     '#90E0EF',
          sand:     '#F4E285',
          coral:    '#FF6B6B',
          mangrove: '#2D6A4F',
          lime:     '#74C69D',
          ash:      '#6C757D',
          night:    '#0D1117',
          panel:    '#111827',
          border:   '#1F2937',
        },
        nvidia: {
          green:  '#76B900',
          dark:   '#1A1A1A',
        },
        waste: {
          danger:  '#DC2626',
          warning: '#F59E0B',
          caution: '#FBBF24',
          pfas:    '#7C3AED',
          ash:     '#6B7280',
          clean:   '#10B981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-ocean': 'linear-gradient(135deg, #0A2E4A 0%, #0D1117 100%)',
        'gradient-waste': 'linear-gradient(135deg, #1a0a0a 0%, #0D1117 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'particle-drift': 'particle-drift 8s ease-in-out infinite',
        'fire-flicker': 'fire-flicker 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'particle-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.8' },
          '50%': { transform: 'translate(4px, -8px) scale(1.1)', opacity: '0.6' },
        },
        'fire-flicker': {
          '0%': { opacity: '0.8', transform: 'scale(1)' },
          '100%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
