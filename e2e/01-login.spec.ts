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
  // 랜딩은 처음 그려질 때 아직 로그인 상태를 모르고 "시작하기"(=/signup)를 보여준다.
  // 곧바로 누르면 회원가입으로 가버려서 waitForURL(/logbook/) 이 타임아웃됐다.
  // 로그인 상태가 반영된 라벨로 바뀔 때까지 기다린 뒤 누른다.
  const cta = page.getByRole('button', { name: /내 로그북 열기/ }).first()
  await expect(cta).toBeVisible({ timeout: 30_000 })
  await cta.click()
  await page.waitForURL(/\/logbook/)
})
