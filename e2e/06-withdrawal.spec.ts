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
  // 계정은 전화번호당 하나만 만들 수 있다 — 고정 번호를 쓰면 두 번째 실행부터 가입이 막힌다(2026-09-13).
  // 010-9xxx-xxxx 대역에서 실행마다 다른 번호를 만든다. 탈퇴가 성공하면 번호도 함께 풀린다.
  const phone = `010-9${String(stamp % 1000).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

  // 1) 가입
  await page.goto('/signup')
  await page.locator('#signup-name').fill('탈퇴테스트')
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-phone').fill(phone)
  await page.locator('#signup-password').fill(password)
  await page.locator('#signup-password2').fill(password)
  // 자격 구분은 role="checkbox" 인 버튼, 약관은 진짜 input[type=checkbox] — 서로 다른 요소라 따로 누른다
  await page.getByRole('group', { name: /자격 구분 선택/ }).getByRole('checkbox').first().click()
  await page.locator('label:has-text("이용약관에 동의") input[type="checkbox"]').check()
  await page.locator('label:has-text("개인정보 수집·이용에 동의") input[type="checkbox"]').check()
  await page.getByRole('button', { name: /^가입하기$|기관 사용자로 가입하기/ }).click()

  // 가입 결과를 먼저 확인한다. 확인 못 하면 로그인에서 30초 기다리다 죽으므로 여기서 판정한다.
  const done = page.getByRole('heading', { name: '회원가입이 완료됐어요' })
  const needsVerify = page.getByRole('heading', { name: /인증 메일을 보냈어요|이미 가입된 이메일/ })
  const ok = await appears(done, 20_000)
  if (!ok) {
    if (await appears(needsVerify, 1_000)) {
      test.skip(true, 'Supabase 이메일 Auto Confirm 이 꺼져 있어 가입 직후 로그인이 안 됩니다.')
    }
    // 폼 유효성 오류 등 — 화면 텍스트를 그대로 남겨 원인을 알 수 있게 한다
    const body = (await page.locator('main, body').first().innerText()).replace(/\s+/g, ' ')
    const reason = body.match(/[^.]*(?:이미 있어요|동의|형식|8자|일치하지)[^.]*\./)?.[0]?.trim()
    throw new Error(`가입이 완료되지 않았어요${reason ? ` — ${reason}` : ''}\n화면: ${body.slice(0, 400)}`)
  }

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
