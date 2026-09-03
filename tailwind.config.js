/** @type {import('tailwindcss').Config} */
// 디자인 시스템: 옵션 A "시네마틱 OS" — near-black + cyan, Inter 디스플레이 + JetBrains Mono 데이터
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#05070D', // 컨셉 원값 — 딥 블랙
          light: '#1E293B',
          dark: '#030509',    // 최심부(푸터 등, 배경보다 반 단계 아래)
        },
        panel: '#0B1220',      // 패널 — 컨셉 원값
        deep: '#13294B',       // 히어로 그라디언트용 딥 블루(컨셉 값)
        sky: {
          DEFAULT: '#00D4FF', // 시그니처 시안 — 컨셉 원값(포인트 전용, 대면적 사용 금지)
        },
        brand: {
          DEFAULT: '#2563EB', // 컨셉 프라이머리(행동 버튼) — 시안은 강조, 블루는 행동
          hover: '#1D4ED8',
        },
        go: {
          DEFAULT: '#10B981',
        },
        surface: {
          DEFAULT: '#05070D', // 페이지 배경 — 컨셉 원값
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
        display: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        body: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        control: '6px', // 컨셉 원값(버튼·입력 6px)
      },
      spacing: {
        section: '96px',
        cardpad: '28px',
      },
    },
  },
  plugins: [],
}
