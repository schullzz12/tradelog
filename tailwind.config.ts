import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#1D9E75',
          600: '#0F6E56',
          700: '#085041',
        },
        surface: {
          bg: '#faf9f6',
          card: '#f8f7f4',
          hover: '#f0efe8',
          border: '#e5e4e0',
        },
        win: '#1D9E75',
        loss: '#E24B4A',
        entry: '#378ADD',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
