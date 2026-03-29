import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        acai: '#5B2A86',
        cream: '#FFF9EF',
        slatebg: '#1C1C22'
      }
    }
  },
  plugins: []
};

export default config;
