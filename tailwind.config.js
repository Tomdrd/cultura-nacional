/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          green:  '#009C3B',
          yellow: '#FFDF00',
          blue:   '#002776',
        },
        cn: {
          primary:   '#009C3B',
          secondary: '#002776',
          accent:    '#FFDF00',
          dark:      '#0A0A0A',
          card:      '#1A1A1A',
          muted:     '#6B6B6B',
        }
      },
      fontFamily: {
        sans:  ['System'],
        mono:  ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
