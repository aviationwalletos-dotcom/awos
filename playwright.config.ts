import { defineConfig, devices } from '@playwright/test'

/**
 * AWOS 핵심 흐름 E2E. 실제 배포 사이트(또는 E2E_BASE_URL)에 테스트 계정으로 로그인해 돌린다.
 * 필요한 환경변수: E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD / E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD
 * (GitHub Secrets 또는 로컬 .env.e2e)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://aviationwallet.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /signature|pdf/ },
    // 태블릿(아이패드 미니 크기·터치) — 중간 폭 레이아웃에서 흐름이 깨지지 않는지. 서명·PDF 는 데스크톱에서만.
    { name: 'tablet', use: { ...devices['iPad Mini'], browserName: 'chromium' }, testIgnore: /signature|pdf/ },
  ],
})
