/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'github-dark': '#0D1117',
        'github-border': '#30363d',
        'atc-blue': '#58A6FF',   // Human
        'atc-purple': '#BC8CFF', // AI
        'atc-orange': '#D29922', // Conflict
        'atc-red': '#FF7B72',    // Alert
        'atc-green': '#3FB950',  // Success
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
