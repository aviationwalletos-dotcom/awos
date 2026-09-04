import { expect, test } from '@playwright/test'
import { login, openTab } from './helpers'

test('비행경력증명서 PDF 저장 → PDF 파일이 내려온다', async ({ page }) => {
  await login(page, 'student')
  await openTab(page, /비행기록/)
  const button = page.getByRole('button', { name: /비행경력증명서 PDF 저장/ })
  await expect(button).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), button.click()])
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  const path = await download.path()
  expect(path).toBeTruthy()
})
