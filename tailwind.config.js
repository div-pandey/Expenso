/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#052E16',
        },
        brand: {
          50: '#F0F8F5',
          100: '#DCF0E7',
          200: '#BADECF',
          300: '#8EC7AF',
          400: '#5EAA8D',
          500: '#2F8566',
          600: '#196B50',
          700: '#12543F',
          800: '#0F4333',
          900: '#0C372B',
          950: '#051F18',
        },
        warm: {
          50: '#FAF9F6',
          100: '#F5F3ED',
          200: '#EBE7DE',
          300: '#DED8CB',
          400: '#C7BEAB',
          500: '#AFA38E',
          600: '#948772',
          700: '#756A59',
          800: '#584F43',
          900: '#3D372F',
        },
        charcoal: {
          50: '#F7F8F8',
          100: '#EDEFF1',
          200: '#D9DDE1',
          300: '#B6BDC5',
          400: '#8A94A0',
          500: '#67717E',
          600: '#4F5863',
          700: '#3A414A',
          800: '#252A30',
          900: '#14181B',
          950: '#0B0D0F',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
