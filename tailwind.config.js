/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B132B',
          light: '#141d3d',
          dark: '#070d1c',
        },
        sky: {
          DEFAULT: '#38BDF8',
        },
        go: {
          DEFAULT: '#10B981',
        },
        surface: {
          DEFAULT: '#F8FAFC',
        },
        ink: {
          DEFAULT: '#1E293B',
        },
        role: {
          pilot: '#38BDF8',
          mechanic: '#F59E0B',
          controller: '#10B981',
          ops: '#A855F7',
          drone: '#F43F5E',
        },
      },
      fontFamily: {
        display: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        body: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        control: '10px',
      },
      spacing: {
        section: '96px',
        cardpad: '28px',
      },
    },
  },
  plugins: [],
}
