/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Matches the public site's royal maroon & gold palette
        // (client/public/styles.css --primary / --primary-dark / --bronze).
        navy: '#7A0C28',
        'navy-deep': '#4A0718',
        'card-blue': '#F5DCE0',
        cream: '#F5DFBC',
        green: '#157347',
        saffron: '#B87A3D',
        ink: '#1a1a1a',
        white: '#FAEBD2',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '20px',
        xl: '28px',
      },
    },
  },
  plugins: [],
}
