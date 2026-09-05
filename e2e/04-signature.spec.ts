import { type Browser, expect, test } from '@playwright/test'
import { deleteEntriesByMarker, login, openTab, today } from './helpers'

const MARKER = 'E2E-SIGN'

/**
 * 교관 서명 흐름 — approval_requests(schema12) 기준.
 * 학생이 기록을 만들고 교관에게 서명 요청 → 교관이 서명함에서 서명 → 학생 화면에 서명 반영.
 *
 * 전제: 교관 계정(E2E_INSTRUCTOR_*)이 "항공기" 구분으로 교관 승인을 받은 상태여야 한다
 *       (계정정보 → 교관 승인 신청 → 관리자 승인). 아니면 서명 요청함 탭이 없어 명확한 메시지로 실패한다.
 */
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

  // 학생: 상세 열고 교관 지정 → 요청
  await openTab(student, /비행기록/)
  // 목록 카드에는 메모가 안 보이므로 기종+공항으로 찾는다(최신 기록이 맨 위)
  const item = student.getByTestId('entry-item').filter({ hasText: 'C172R' }).filter({ hasText: 'RKTL' }).first()
  await item.getByRole('button').first().click()
  const dialog = student.getByRole('dialog')
  const select = dialog.locator('#target-instructor')
  await expect(select).toBeVisible()
  // 소속 필터로 교관이 안 보이면 전체 보기
  if ((await select.locator('option:not([disabled])').count()) === 0) {
    const showAll = dialog.getByRole('button', { name: /전체 보기/ })
    if (await showAll.isVisible().catch(() => false)) await showAll.click()
  }
  await expect(select.locator('option:not([disabled])').first()).toBeAttached({ timeout: 15_000 })
  await dialog.getByTestId('signature-request-send').click()
  await expect(dialog.getByText(/서명 요청을 보냈습니다/)).toBeVisible()
  await dialog.getByRole('button', { name: /닫기/ }).first().click()

  // 교관: 서명함에서 카드 찾고 서명
  const instructorCtx = await browser.newContext()
  const instructor = await instructorCtx.newPage()
  await login(instructor, 'instructor')
  // 탭은 교관 승인 조회가 끝난 뒤 붙는다 — 넉넉히 기다리고, 안 보이면 한 번 새로고침해 재확인
  let inboxTab = instructor.getByRole('tab', { name: /서명 요청함/ })
  if (!(await inboxTab.isVisible({ timeout: 30_000 }).catch(() => false))) {
    await instructor.reload()
    inboxTab = instructor.getByRole('tab', { name: /서명 요청함/ })
    if (!(await inboxTab.isVisible({ timeout: 30_000 }).catch(() => false))) {
      throw new Error('교관 계정에 "서명 요청함" 탭이 없습니다 — 계정정보에서 항공기 교관 승인 신청 후 관리자 승인을 먼저 완료해 주세요.')
    }
  }
  await inboxTab.click()
  const card = instructor.getByTestId('signature-request-card').filter({ hasText: MARKER }).first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  const pad = card.getByTestId('signature-pad')
  // 패드가 화면 밖이면 마우스 좌표가 캔버스를 벗어나 아무것도 안 그려진다 → 먼저 화면 안으로
  await pad.scrollIntoViewIfNeeded()
  const box = await pad.boundingBox()
  if (!box) throw new Error('서명 패드 없음')
  await instructor.mouse.move(box.x + 20, box.y + box.height / 2)
  await instructor.mouse.down()
  await instructor.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 15, { steps: 10 })
  await instructor.mouse.move(box.x + box.width - 20, box.y + box.height / 2 + 10, { steps: 10 })
  await instructor.mouse.up()
  const completeButton = card.getByTestId('signature-complete')
  // 그려졌다면 버튼이 활성화된다. 아니면 이유를 분명히 남긴다
  await expect(completeButton, '서명 패드에 그린 획이 인식되지 않았어요(버튼이 비활성 상태)').toBeEnabled({ timeout: 5_000 })
  await completeButton.click()
  // 서명 완료 후 카드는 "대기중" 목록에서 사라진다(완료됨 탭으로 이동)
  await expect(card).toHaveCount(0, { timeout: 30_000 })
  await instructor.getByRole('tab', { name: /^완료됨$/ }).click()
  await expect(instructor.getByTestId('signature-request-card').filter({ hasText: MARKER }).first().getByText(/완료됨/)).toBeVisible({ timeout: 15_000 })

  // 학생: 새로고침 후 서명 반영(AutoSyncEntryDecisions 60초 폴링 + 진입 즉시 1회)
  await student.reload()
  await openTab(student, /비행기록/)
  await expect(
    student.getByTestId('entry-item').filter({ hasText: 'C172R' }).filter({ hasText: 'RKTL' }).first().getByText(/교관 서명 완료/),
  ).toBeVisible({ timeout: 60_000 })

  // 정리: 방금 만든 기록 삭제(상세 → 삭제하기 → 삭제 확인)
  await deleteEntriesByMarker(student, MARKER).catch(() => undefined)
  const leftover = student.getByTestId('entry-item').filter({ hasText: 'C172R' }).filter({ hasText: 'RKTL' }).first()
  if ((await leftover.count()) > 0) {
    await leftover.getByRole('button').first().click()
    const d = student.getByRole('dialog')
    await d.getByRole('button', { name: /삭제하기/ }).click()
    await d.getByRole('button', { name: /삭제 확인|삭제/ }).first().click().catch(() => undefined)
  }
  await studentCtx.close()
  await instructorCtx.close()
})
