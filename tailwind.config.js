/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,scss}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette WARAH - Bleu marine (marque) + Or (accent)
        primary: {
          DEFAULT: '#0F4C81', // Bleu marine WARAH
          50: '#EAF1F8',
          100: '#D2E3F0',
          200: '#A8C7E1',
          300: '#7DABD1',
          400: '#3E83B0',
          500: '#0F4C81',
          600: '#0C3D68',
          700: '#0A2650',
          800: '#081E41',
          900: '#050F22',
          light: '#1B6FB8',
          dark: '#0A2650',
        },
        secondary: {
          DEFAULT: '#C9982E', // Or WARAH
          50: '#FBF3E0',
          100: '#F5E4B8',
          200: '#ECCB7E',
          300: '#E2B257',
          400: '#D4A03D',
          500: '#C9982E',
          600: '#AD7E22',
          700: '#8C641B',
          800: '#6B4B14',
          900: '#4A330D',
          light: '#E0B655',
          dark: '#9C7320',
        },
        accent: {
          DEFAULT: '#C9982E', // Alias de secondary, pour compatibilité
          light: '#E0B655',
          dark: '#9C7320',
        },
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        // Grays pour backgrounds
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'primary': '0 4px 6px -1px rgba(15, 76, 129, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
