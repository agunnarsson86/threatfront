/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a1a',
          light: '#12122a',
          lighter: '#1a1a3a',
        },
        accent: {
          cyan: '#00d4ff',
          yellow: '#ffcc00',
          orange: '#ff6600',
          red: '#ff0033',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
