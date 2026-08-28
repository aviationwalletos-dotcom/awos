/** @type {import('tailwindcss').Config} */
// 디자인 시스템: 옵션 A "시네마틱 OS" — near-black + cyan, Inter 디스플레이 + JetBrains Mono 데이터
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#04060B', // 딥 배경 (더 깊은 블랙으로 하향)
          light: '#0C1730',
          dark: '#000205',    // 페이지 최심부 배경
        },
        panel: '#070A12',      // 카드/패널 표면 (배경과 미세 대비만 유지)
        deep: '#081228',       // 히어로 그라디언트용 딥 블루(채도 하향)
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
