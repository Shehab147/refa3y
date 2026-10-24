/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        forest: '#123C2E',
        leaf: '#2F6B4F',
        mint: '#E7F1E9',
        cream: '#F7F6F1',
        ink: '#17211D',
        muted: '#68736E',
        line: '#E2E7E3',
        gold: '#D8A84E',
      },
      fontFamily: { sans: ['Noto Sans'] },
    },
  },
  plugins: [],
};
