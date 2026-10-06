/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./src/**/index.html",
  ],
  theme: {
    extend: {
      colors: {
        edge: {
          blue: '#0078D4',
          hover: '#106EBE',
          bg: '#F3F2F1',
          surface: '#FFFFFF',
          border: '#E1DFDD',
          text: '#201F1E',
          muted: '#605E5C'
        }
      }
    },
  },
  plugins: [],
}
