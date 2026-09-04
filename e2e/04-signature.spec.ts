import { expect, test, type Browser } from '@playwright/test'
import { deleteEntriesByMarker, login, openTab, today } from './helpers'

const MARKER = 'E2E-SIGN'

/** 학생이 기록을 만들고 교관에게 서명 요청 → 교관이 서명 → 학생 화면에 서명 표시 */
test('교관 서명 흐름 (학생 요청 → 교관 서명 → 학생 반영)', async ({ browser }: { browser: Browser }) => {
  const studentCtx = await browser.newContext()
  const student = await studentCtx.newPage()
  await login(student, 'student')
  await openTab(student, /기록 입력/)
  await student.locator('#date').fill(today())
  await student.locator('#aircraftType').fill('C172R')
  await student.locator('#departure').fill('RKTL')
  await student.locator('#arrival').fill('RKTL')
  await student.locator('#blockTime').fill('0.8')
  await student.locator('#notes').fill(MARKER)
  await student.getByTestId('entry-submit').click()
  await expect(student.getByText(/비행기록이 추가되었습니다/)).toBeVisible()

  await openTab(student, /비행기록/)
  const item = student.getByTestId('entry-item').filter({ hasText: 'C172R' }).first()
  await item.getByRole('button').first().click()
  const dialog = student.getByRole('dialog')
  const select = dialog.locator('select').filter({ hasText: /\(/ }).first()
  await expect(select).toBeVisible()
  await dialog.getByRole('button', { name: /교관에게 서명 요청 보내기/ }).click()
  await expect(dialog.getByText(/서명 요청을 보냈습니다/)).toBeVisible()
  await dialog.getByRole('button', { name: /닫기/ }).first().click()

  // 교관
  const instructorCtx = await browser.newContext()
  const instructor = await instructorCtx.newPage()
  await login(instructor, 'instructor')
  await openTab(instructor, /서명 요청함/)
  const card = instructor.locator('article, div').filter({ hasText: MARKER }).filter({ has: instructor.getByTestId('signature-pad') }).first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  const pad = card.getByTestId('signature-pad')
  const box = await pad.boundingBox()
  if (!box) throw new Error('서명 패드 없음')
  await instructor.mouse.move(box.x + 20, box.y + box.height / 2)
  await instructor.mouse.down()
  await instructor.mouse.move(box.x + box.width - 20, box.y + box.height / 2 + 10, { steps: 12 })
  await instructor.mouse.up()
  await card.getByRole('button', { name: /^서명 완료$/ }).click()
  await expect(card.getByText(/완료됨/)).toBeVisible({ timeout: 30_000 })

  // 학생 반영
  await student.reload()
  await openTab(student, /비행기록/)
  await expect(student.getByTestId('entry-item').filter({ hasText: 'C172R' }).first().getByText(/교관 서명 완료/)).toBeVisible({ timeout: 60_000 })

  await deleteEntriesByMarker(student, MARKER).catch(() => undefined)
  await studentCtx.close()
  await instructorCtx.close()
})
