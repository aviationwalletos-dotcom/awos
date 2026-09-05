import { expect, test } from '@playwright/test'
import { deleteEntriesByMarker, expandEntryDetails, login, openTab, today } from './helpers'

const MARKER = 'E2E-ENTRY'

test.describe('비행기록', () => {
  test.afterEach(async ({ page }) => {
    await deleteEntriesByMarker(page, MARKER).catch(() => undefined)
  })

  test('기록 추가 → 목록에 보임 → 상세 열림 → 총계 반영', async ({ page }) => {
    await login(page, 'student')
    await openTab(page, /기록 입력/)
    await page.locator('#date').fill(today())
    await page.locator('#aircraftType').fill('C172S')
    await page.locator('#departure').fill('RKTL')
    await page.locator('#arrival').fill('RKPU')
    await page.locator('#blockTime').fill('1.2')
    // 이착륙 횟수는 접힌 "상세 시간 입력" 안에 있다
    await expandEntryDetails(page)
    await page.locator('#dayLandings').fill('2')
    await page.locator('#notes').fill(MARKER)
    await page.getByTestId('entry-submit').click()
    await expect(page.getByText(/비행기록이 추가/)).toBeVisible()

    await openTab(page, /비행기록/)
    const item = page.getByTestId('entry-item').filter({ hasText: 'RKTL' }).filter({ hasText: 'C172S' }).first()
    await expect(item).toBeVisible()
    await item.getByRole('button').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/비행 기록 상세/)).toBeVisible()
    await expect(dialog.getByText('1.2시간')).toBeVisible()
    await dialog.getByRole('button', { name: /닫기/ }).first().click()
  })

  test('필수 항목 누락 시 첫 오류로 스크롤되고 저장되지 않는다', async ({ page }) => {
    await login(page, 'student')
    await openTab(page, /기록 입력/)
    await page.locator('#blockTime').fill('')
    await page.locator('#aircraftType').fill('')
    await page.getByTestId('entry-submit').click()
    await expect(page.locator('[aria-invalid="true"], .text-rose-400').first()).toBeVisible()
    await expect(page.getByText(/비행기록이 추가/)).toHaveCount(0)
  })
})
