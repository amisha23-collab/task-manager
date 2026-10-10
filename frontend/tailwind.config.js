/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        ink: '#14212b',
        paper: '#f4f6f7',
        brand: {
          50: '#effaf8',
          100: '#d3f3ee',
          600: '#0f766e',
          700: '#0d5f59',
          800: '#0b4b47',
        },
      },
    },
  },
  plugins: [],
};
