import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        pve: {
          red: '#dc2626',
          purple: '#7c3aed',
          'purple-dark': '#2d1b4e',
          bg: '#000000',
        },
      },
      fontFamily: {
        sans: [
          "Noto Sans JP",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        raleway: [
          'Raleway',
          'sans-serif'],
        'noto-sans': [
          'Noto Sans JP',
          'sans-serif'
        ],
      },
      fontWeight: {
        thin: '100',
        normal: '400',
        bold: '600', // Ralewayの600をboldとして使用
        extraBold: '700',
        black: '900',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // ...
  ],
} satisfies Config;
