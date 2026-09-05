import { expect, test } from '@playwright/test'
import { appears, login, openTab, tinyPng } from './helpers'
import type { Page } from '@playwright/test'

async function expandCertList(page: Page) {
  const toggle = page.getByTestId('cert-list-toggle')
  if (await appears(toggle, 1_500)) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  }
}

test('자격증 등록 → 목록에 보임 → 상세 → 삭제', async ({ page }) => {
  await login(page, 'student')
  await openTab(page, /자격증/)

  // 예전 실행이 남긴 테스트 자격증 정리(최대 5개, 실패해도 진행)
  await expandCertList(page)
  for (let i = 0; i < 5; i += 1) {
    const stale = page.getByTestId('cert-item').filter({ hasText: /E2E-의료기관|E2E 항공전문의료기관/ }).first()
    if ((await stale.count()) === 0) break
    await stale.click()
    const d = page.getByRole('dialog')
    await d.getByRole('button', { name: /삭제하기/ }).click().catch(() => undefined)
    await d.getByRole('button', { name: /삭제 확인/ }).click().catch(() => undefined)
    await expect(stale).toHaveCount(0, { timeout: 10_000 }).catch(() => undefined)
  }

  await page.locator('#category').selectOption({ label: '항공신체검사' })
  // 항공신체검사는 발급기관 자동값이 없다(지정 의료기관마다 달라서 비워 둔다) — 직접 채워야 제출된다.
  // 이번 실행에서만 쓰는 고유 발급기관명 — 예전 실행이 남긴 자격증과 섞이지 않게 이걸로 찾는다
  const issuerTag = `E2E-의료기관-${Date.now().toString(36)}`
  await page.locator('#issuer').fill(issuerTag)
  await page.locator('#issuedDate').fill('2026-01-15')
  // 항공신체검사는 만료일이 필수다(expiryRequirement = 'required').
  await page.locator('#expiryDate').fill('2027-01-14')
  // 신규 등록에는 자격증 사진 첨부가 필수다 — 예전 스펙은 이걸 빼서 제출이 막혔고,
  // 화면에는 "자격증 사진을 첨부해 주세요" 오류만 떠서 토스트를 기다리다 타임아웃했다.
  await page.getByTestId('cert-photo').setInputFiles({
    name: 'e2e-cert.png',
    mimeType: 'image/png',
    buffer: tinyPng(),
  })

  await page.getByTestId('cert-submit').click()

  // 폼 검증에 막히면 토스트를 90초 기다리다 "timeout"만 남는다. 막힌 이유를 실패 메시지로 보여준다.
  const fieldError = page.locator('[id$="-error"]').first()
  if (await appears(fieldError, 1_500)) {
    throw new Error(`자격증 폼 검증에 막혔습니다: ${(await fieldError.innerText()).trim()}`)
  }

  await expect(page.getByText(/자격증이 추가되었습니다/)).toBeVisible()

  // 목록은 기본 3개만 보이고 나머지는 접혀 있다 — 새 자격증이 뒤쪽이면 펼친다
  await expandCertList(page)
  const item = page.getByTestId('cert-item').filter({ hasText: issuerTag }).first()
  await expect(item).toBeVisible()
  await item.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // 삭제는 2단계다: "삭제하기" → 다이얼로그 안 확인 영역(role="alert")의 "삭제 확인".
  // 예전 스펙은 role="alertdialog" 를 찾아서(존재하지 않음) 확인 단계를 건너뛰었고, 결국 지워지지 않았다.
  await dialog.getByRole('button', { name: /삭제하기/ }).click()
  await dialog.getByRole('button', { name: /삭제 확인/ }).click()
  await expect(item).toHaveCount(0)
})
