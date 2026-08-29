/** @type {import('tailwindcss').Config} */
// 디자인 시스템: 옵션 A "시네마틱 OS" — near-black + cyan, Inter 디스플레이 + JetBrains Mono 데이터
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A1122', // 딥 네이비(컨셉 하향) — 퓨어 블랙과 리뷰 절충
          light: '#1E293B',
          dark: '#05070D',    // 최심부(컨셉 원색)
        },
        panel: '#0D1526',      // 패널 — 헤어라인 미학에 맞춘 은은한 층
        deep: '#13294B',       // 히어로 그라디언트용 딥 블루(컨셉 값)
        sky: {
          DEFAULT: '#22D3EE', // 시그니처 시안 — 형광도를 낮춰 어두운 배경 번짐(할레이션) 완화
        },
        go: {
          DEFAULT: '#10B981',
        },
        surface: {
          DEFAULT: '#070B14', // 페이지 배경 — 컨셉 딥 블랙과 리뷰 네이비의 절충
        },
        ink: {
          DEFAULT: '#F2F5FA', // 기본 텍스트 (다크 전환으로 라이트 반전)
        },
        role: {
          pilot: '#22D3EE',
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
