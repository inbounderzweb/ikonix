/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['main', 'Luxia'],     // default utility class: font-sans
        fancy: ['second', 'Lato'],       // custom utility class: font-fancy
      },
    },
  },
  plugins: [],
}

