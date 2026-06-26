/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#d8ecff',
          200: '#b9ddff',
          300: '#89c7ff',
          400: '#52a8ff',
          500: '#2b86fc',
          600: '#1567f1',
          700: '#0e52de',
          800: '#1143b4',
          900: '#133c8e',
          950: '#0f2660',
        },
        success: '#16a34a',
        danger:  '#dc2626',
        warning: '#d97706',
        muted:   '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}
