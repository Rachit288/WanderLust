import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // 1. Scan the src folder (Most likely location)
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    
    // 2. Scan the root folder (If you aren't using src)
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        deepNavy: '#0A1A2F',
        goldAccent: '#D4AF37',
        creamWhite: '#F4ECD8',
        mutedGrey: '#6A6A6A',
        offWhite: '#FAFAFA',
      },
      backgroundImage: {
        'hero-pattern': "url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')",
      },
    },
  },
  plugins: [],
};
export default config;