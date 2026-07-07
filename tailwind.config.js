/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",

  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Luxia', 'Georgia', 'serif'],     // default utility class: font-sans
        heading: ['Luxia', 'Georgia', 'serif'],  // custom utility class: font-heading
        fancy: ['Lato', 'sans-serif'],           // custom utility class: font-fancy
        
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
    require('@tailwindcss/line-clamp'),
    
  
  ],

}

