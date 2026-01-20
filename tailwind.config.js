/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1e3a5f', // Dark Navy Blue
          dark: '#0d1b2a',
          darker: '#0a1929',
          light: '#2d4a6f',
          lighter: '#3d5a7f',
          glow: '#2d4a6f',
        },
        dark: {
          bg: '#0a0614',
          card: '#1a1625',
          border: '#2d1b3d',
          text: '#e2e8f0',
          'text-light': '#cbd5e1',
          'text-muted': '#94a3b8',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      transitionDuration: {
        '400': '400ms',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow-purple': '0 0 20px rgba(30, 58, 95, 0.4), 0 0 40px rgba(30, 58, 95, 0.2)',
        'glow-lg': '0 0 30px rgba(30, 58, 95, 0.5), 0 0 60px rgba(30, 58, 95, 0.3)',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0a0614 0%, #0d1b2a 50%, #0a1929 100%)',
        'gradient-purple': 'linear-gradient(135deg, #0d1b2a 0%, #1e3a5f 50%, #2d4a6f 100%)',
        'gradient-glow': 'radial-gradient(circle at 50% 50%, rgba(30, 58, 95, 0.15) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}

