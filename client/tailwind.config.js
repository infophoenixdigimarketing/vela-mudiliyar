/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1F3864',
        'navy-deep': '#14264a',
        'card-blue': '#EAF2FA',
        green: '#157347',
        saffron: '#C77B24',
        ink: '#1a1a1a',
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
