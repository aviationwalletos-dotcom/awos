import { expect, test } from '@playwright/test'

import { appears } from './helpers'

/**
 * 회원 탈퇴 E2E — 제일 파괴적인 흐름이라 자동 테스트로 지킨다(2026-09-10).
 *
 * 매번 버리는 계정을 새로 만든다(이메일에 시각을 붙임). Supabase 이메일 Auto Confirm 이 켜져 있어야 가입 즉시 로그인된다.
 * 흐름: 가입 → 로그인 → 계정 화면 → 회원 탈퇴 진행 → (기록 0건이라 CSV 단계 건너뜀) → 확인 체크 + 비밀번호 → 영구 삭제
 *       → 랜딩으로 이동 → 같은 계정으로 다시 로그인하면 실패.
 */
test('회원 탈퇴: 새 계정 가입 → 탈퇴 → 재로그인 불가', async ({ page }) => {
  const stamp = Date.now()
  const email = `e2e-delete-${stamp}@awos-test.invalid`
  const password = `E2eDel!${stamp}`

  // 1) 가입
  await page.goto('/signup')
  await page.locator('#signup-name').fill('탈퇴테스트')
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-phone').fill('010-0000-0000')
  await page.locator('#signup-password').fill(password)
  await page.locator('#signup-password2').fill(password)
  // 자격 구분(버튼형 체크박스) 하나 선택
  await page.getByRole('group', { name: /자격 구분 선택/ }).getByRole('checkbox').first().click()
  // 필수 약관 2개
  const agreements = page.locator('input[type="checkbox"]')
  const n = await agreements.count()
  for (let i = 0; i < n; i += 1) {
    const box = agreements.nth(i)
    if (!(await box.isChecked())) await box.check()
  }
  await page.getByRole('button', { name: /가입|회원가입|시작/ }).last().click()

  // 이메일 인증이 켜져 있으면(=Auto Confirm 꺼짐) 이 테스트는 진행할 수 없다 → 스킵으로 알림
  const needsVerify = page.getByText(/인증 메일|메일을 확인/)
  if (await appears(needsVerify, 5_000)) test.skip(true, 'Supabase 이메일 Auto Confirm 이 꺼져 있어 가입 직후 로그인이 안 됩니다.')

  // 2) 로그인
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await page.waitForURL(/\/(logbook|account)/, { timeout: 30_000 })

  // 3) 계정 화면 → 회원 탈퇴 섹션 펼치기
  await page.goto('/account')
  const section = page.locator('#account-delete')
  await expect(section).toBeVisible({ timeout: 30_000 })
  const header = section.getByRole('button', { name: /회원 탈퇴/ }).first()
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click()
  await section.getByRole('button', { name: /회원 탈퇴 진행하기/ }).click()

  // 기록이 있으면 CSV 백업 단계가 뜬다 — 새 계정은 0건이라 보통 안 뜨지만, 뜨면 "저장 없이 계속"
  const skipBackup = section.getByRole('button', { name: /저장 없이 계속/ })
  if (await appears(skipBackup, 2_000)) await skipBackup.click()

  // 4) 확인 체크 + 비밀번호 → 영구 삭제
  await expect(section.getByText(/정말 탈퇴하시겠어요/)).toBeVisible()
  await section.locator('input[type="checkbox"]').check()
  await section.getByPlaceholder('현재 비밀번호').fill(password)
  const confirmBtn = section.getByRole('button', { name: /네, 영구 삭제해요/ })
  await expect(confirmBtn).toBeEnabled()
  await confirmBtn.click()

  // 삭제 후 랜딩으로 이동
  await page.waitForURL((url) => !url.pathname.startsWith('/account'), { timeout: 30_000 })

  // 5) 같은 계정으로 다시 로그인 → 실패해야 한다
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await page.waitForTimeout(3_000)
  expect(page.url()).toMatch(/\/login/)
})
