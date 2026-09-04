import { expect, test } from '@playwright/test'
import { login, openTab, tinyPng } from './helpers'

test('자격증 등록 → 목록에 보임 → 상세 → 삭제', async ({ page }) => {
  await login(page, 'student')
  await openTab(page, /자격증/)

  await page.locator('#category').selectOption({ label: '항공신체검사' })
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
  await expect(page.getByText(/자격증이 추가되었습니다/)).toBeVisible()

  const item = page.getByTestId('cert-item').filter({ hasText: /항공신체검사/ }).first()
  await expect(item).toBeVisible()
  await item.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /삭제/ }).first().click()
  const confirm = page.getByRole('alertdialog')
  if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) await confirm.getByRole('button', { name: /삭제|확인/ }).click()
  await expect(item).toHaveCount(0)
})
