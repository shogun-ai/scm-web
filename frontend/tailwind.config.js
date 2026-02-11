/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Sans болон Display хоёуланг нь Montserrat болгоно
        sans: ['Montserrat', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'], 
      },
      colors: {
        primary: "#00A651",
        secondary: "#003B5C",
        gold: "#D4AF37",
      }
    },
  },
  plugins: [],
}