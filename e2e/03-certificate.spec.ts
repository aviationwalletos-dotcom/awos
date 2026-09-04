import { expect, test } from '@playwright/test'
import { login, openTab } from './helpers'

test('자격증 등록 → 목록에 보임 → 상세 → 삭제', async ({ page }) => {
  await login(page, 'student')
  await openTab(page, /자격증/)
  await page.locator('#category').selectOption({ label: '항공신체검사' })
  await page.locator('#issuedDate').fill('2026-01-15')
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
