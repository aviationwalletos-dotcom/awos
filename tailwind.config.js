/** @type {import('tailwindcss').Config} */
// 디자인 시스템: 옵션 A "시네마틱 OS" — near-black + cyan, Inter 디스플레이 + JetBrains Mono 데이터
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A0F1E', // 딥 배경(구 #0B132B)
          light: '#12203E',
          dark: '#05070D',    // 페이지 최심부 배경
        },
        panel: '#0B1220',      // 카드/패널 표면 (구 bg-white 카드가 이 색으로 전환됨)
        deep: '#0B1836',       // 히어로 그라디언트용 딥 블루
        sky: {
          DEFAULT: '#00D4FF', // 시그니처 시안 (구 #38BDF8)
        },
        go: {
          DEFAULT: '#10B981',
        },
        surface: {
          DEFAULT: '#05070D', // 페이지 배경 (구 라이트 #F8FAFC → 시네마틱 블랙)
        },
        ink: {
          DEFAULT: '#F2F5FA', // 기본 텍스트 (다크 전환으로 라이트 반전)
        },
        role: {
          pilot: '#00D4FF',
          mechanic: '#F59E0B',
          controller: '#10B981',
          ops: '#A855F7',
          drone: '#F43F5E',
        },
      },
      fontFamily: {
        display: ['Inter', 'Pretendard Variable', 'Pretendard', 'sans-serif'],
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
