/** @type {import('tailwindcss').Config} */
// 디자인 시스템: 옵션 A "시네마틱 OS" — near-black + cyan, Inter 디스플레이 + JetBrains Mono 데이터
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F172A', // 딥 네이비 — 퓨어 블랙 대비 눈 피로/할레이션 완화
          light: '#1E293B',
          dark: '#0A1020',    // 최심부(네비/푸터 등)
        },
        panel: '#152033',      // 카드/패널 — 배경보다 한 단계 밝게 해 경계를 인지시킨다
        deep: '#1B2C4D',       // 히어로 그라디언트용 딥 블루
        sky: {
          DEFAULT: '#22D3EE', // 시그니처 시안 — 형광도를 낮춰 어두운 배경 번짐(할레이션) 완화
        },
        go: {
          DEFAULT: '#10B981',
        },
        surface: {
          DEFAULT: '#0F172A', // 페이지 배경 — 다크 네이비
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
