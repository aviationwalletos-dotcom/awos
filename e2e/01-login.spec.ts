import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('이메일 로그인 → 로그북 첫 화면(자격 카드·탭)이 뜬다', async ({ page }) => {
  await login(page, 'student')
  await expect(page.getByText(/내 자격 현황/)).toBeVisible()
  await expect(page.getByRole('tab', { name: /자격증/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /커런시/ })).toBeVisible()
})

test('랜딩의 "시작하기"는 로그인 상태면 로그북으로 간다', async ({ page }) => {
  await login(page, 'student')
  await page.goto('/')
  await page.getByRole('button', { name: /내 로그북 열기|시작하기/ }).first().click()
  await page.waitForURL(/\/logbook/)
})
