import { expect, type Locator, type Page } from '@playwright/test'

export const creds = {
  student: { email: process.env.E2E_STUDENT_EMAIL ?? '', password: process.env.E2E_STUDENT_PASSWORD ?? '' },
  instructor: { email: process.env.E2E_INSTRUCTOR_EMAIL ?? '', password: process.env.E2E_INSTRUCTOR_PASSWORD ?? '' },
}

export function requireCreds(role: keyof typeof creds) {
  const c = creds[role]
  if (!c.email || !c.password) throw new Error(`E2E_${role.toUpperCase()}_EMAIL / _PASSWORD 환경변수가 필요합니다.`)
  return c
}

/** 이메일 로그인 → 로그북 진입까지 */
export async function login(page: Page, role: keyof typeof creds) {
  const c = requireCreds(role)
  await page.goto('/login')
  await page.locator('#login-email').fill(c.email)
  await page.locator('#login-password').fill(c.password)
  await page.getByTestId('login-submit').click()
  await page.waitForURL(/\/(logbook|account|dashboard)/, { timeout: 30_000 })
  if (!page.url().includes('/logbook')) await page.goto('/logbook')
  await expect(page.getByRole('tab', { name: /비행기록/ })).toBeVisible()
}

export async function openTab(page: Page, name: RegExp) {
  await page.getByRole('tab', { name }).click()
  // 기록 입력 탭의 입력 폼은 기본 접힘 — 테스트는 바로 채우므로 펼쳐 둔다
  if (name.test('기록 입력')) {
    const toggle = page.getByTestId('new-entry-toggle')
    if (await appears(toggle, 5_000)) {
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    }
  }
}

/** 테스트가 남긴 기록 정리: 오늘 날짜 + 테스트 마커 비고를 가진 기록을 상세에서 삭제 */
export async function deleteEntriesByMarker(page: Page, marker: string) {
  await openTab(page, /비행기록/)
  for (let i = 0; i < 10; i += 1) {
    const item = page.getByTestId('entry-item').filter({ hasText: marker }).first()
    if ((await item.count()) === 0) break
    await item.getByRole('button').first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /삭제하기/ }).click()
    const confirm = page.getByRole('alertdialog')
    if (await appears(confirm, 2_000)) await confirm.getByRole('button', { name: /삭제|확인/ }).click()
    await expect(item).toHaveCount(0)
  }
}

export const today = () => new Date().toISOString().slice(0, 10)

/**
 * [주의] locator.isVisible({ timeout }) 은 timeout 을 무시하고 즉시 판정한다(Playwright 명세).
 * "나타날 때까지 기다렸다가 있으면 true" 가 필요할 때는 반드시 이 함수를 쓴다.
 */
export async function appears(locator: Locator, timeoutMs: number): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: timeoutMs })
    return true
  } catch {
    return false
  }
}

/** 첨부 필수 필드 테스트용 1x1 PNG (외부 파일 없이 setInputFiles 로 넘긴다) */
export function tinyPng(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
}
