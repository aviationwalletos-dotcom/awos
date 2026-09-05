import { type Browser, expect, test } from '@playwright/test'
import { appears, deleteEntriesByMarker, login, openTab, today } from './helpers'

// 실행마다 고유한 표식 — 이전 실행이 남긴 요청 카드와 섞이지 않게(카드는 이 문구가 든 메모로 찾는다)
const MARKER = `E2E-SIGN-${Date.now().toString(36)}`

/**
 * 교관 서명 흐름 — approval_requests(schema12) 기준.
 * 학생이 기록을 만들고 교관에게 서명 요청 → 교관이 서명함에서 서명 → 학생 화면에 서명 반영.
 *
 * 전제: 교관 계정(E2E_INSTRUCTOR_*)이 "항공기" 구분으로 교관 승인을 받은 상태여야 한다
 *       (계정정보 → 교관 승인 신청 → 관리자 승인). 아니면 서명 요청함 탭이 없어 명확한 메시지로 실패한다.
 */
test('교관 서명 흐름 (학생 요청 → 교관 서명 → 학생 반영)', async ({ browser }: { browser: Browser }) => {
  // 두 계정을 오가며 요청이 많고, CI 네트워크가 걸리면 요청당 20초씩 늦어질 수 있어 넉넉히 잡는다
  test.setTimeout(240_000)
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
    if (await appears(showAll, 3_000)) await showAll.click()
  }
  await expect(select.locator('option:not([disabled])').first()).toBeAttached({ timeout: 15_000 })
  await dialog.getByTestId('signature-request-send').click()
  await expect(dialog.getByText(/서명 요청을 보냈습니다/)).toBeVisible()
  await dialog.getByRole('button', { name: /닫기/ }).first().click()

  // 교관: 서명함에서 카드 찾고 서명
  const instructorCtx = await browser.newContext()
  const instructor = await instructorCtx.newPage()
  // 진단: 모든 API 요청(정적 파일 제외)의 시작/응답을 기록하고, 응답이 오지 않은 요청은 PENDING 으로 남긴다
  const netLog: string[] = []
  const consoleLog: string[] = []
  const pending = new Map<string, string>()
  const shortUrl = (u: string) => u.replace(/^https?:\/\/[^/]+/, '').slice(0, 120)
  const isApi = (u: string) => /supabase\.co|\/rest\/v1|\/auth\/v1|\/storage\/v1|\/rpc\//.test(u)
  let apiOrigin = ''
  instructor.on('request', (req) => {
    if (!isApi(req.url())) return
    if (!apiOrigin && /supabase\.co/.test(req.url())) apiOrigin = new URL(req.url()).origin
    pending.set(req.url() + req.method(), `${req.method()} ${shortUrl(req.url())}`)
  })
  instructor.on('response', (res) => {
    const req = res.request()
    if (!isApi(req.url())) return
    pending.delete(req.url() + req.method())
    netLog.push(`${res.status()} ${req.method()} ${shortUrl(req.url())}`)
  })
  instructor.on('requestfailed', (req) => {
    if (!isApi(req.url())) return
    pending.delete(req.url() + req.method())
    netLog.push(`FAILED(${req.failure()?.errorText ?? '?'}) ${req.method()} ${shortUrl(req.url())}`)
  })
  instructor.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') consoleLog.push(`${msg.type()}: ${msg.text()}`.slice(0, 200))
  })
  instructor.on('pageerror', (err) => consoleLog.push(`pageerror: ${err.message}`.slice(0, 200)))
  await login(instructor, 'instructor')
  // 탭은 교관 승인 조회가 끝난 뒤 붙는다 — 넉넉히 기다리고, 안 보이면 한 번 새로고침해 재확인
  // [교훈] 예전엔 isVisible({ timeout }) 으로 기다린다고 믿었지만 즉시 판정이라, 승인 조회(0.3초)보다 먼저
  // "탭 없음"으로 실패했다. appears() 는 진짜로 기다린다.
  let inboxTab = instructor.getByRole('tab', { name: /서명 요청함/ })
  if (!(await appears(inboxTab, 30_000))) {
    await instructor.goto('/logbook')
    inboxTab = instructor.getByRole('tab', { name: /서명 요청함/ })
    if (!(await appears(inboxTab, 30_000))) {
      // 무엇이 보였는지 그대로 남긴다(계정 착오·라우팅 문제·탭 누락을 한 번에 구분)
      const tabNames = await instructor.getByRole('tab').allInnerTexts().catch(() => [] as string[])
      const email = process.env.E2E_INSTRUCTOR_EMAIL ?? '(미설정)'
      const bodyText = (await instructor.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)
      // 연결 진단: 브라우저에서 supabase.co / 우리 사이트로 직접 요청, 러너(Node)에서도 supabase.co 로 요청
      const supabaseOrigin = apiOrigin
      const probe = await instructor
        .evaluate(async (sbOrigin: string) => {
          const timed = async (url: string, init?: RequestInit) => {
            const t0 = Date.now()
            try {
              const r = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
              return `${r.status} (${Date.now() - t0}ms)`
            } catch (e) {
              return `ERR ${(e as Error).name}: ${(e as Error).message} (${Date.now() - t0}ms)`
            }
          }
          const sb = sbOrigin
          return {
            site: await timed('/manifest.webmanifest', { cache: 'no-store' }),
            supabaseRest: sb ? await timed(`${sb}/rest/v1/`, { headers: { apikey: 'probe' } }) : '(supabase origin 미확인)',
            supabaseAuth: sb ? await timed(`${sb}/auth/v1/health`) : '(supabase origin 미확인)',
          }
        }, supabaseOrigin)
        .catch((e) => ({ error: String(e) }))
      let runnerProbe = '(skip)'
      if (supabaseOrigin) {
        const t0 = Date.now()
        runnerProbe = await instructor.request
          .get(`${supabaseOrigin}/auth/v1/health`, { timeout: 10_000 })
          .then((r) => `${r.status()} (${Date.now() - t0}ms)`)
          .catch((e) => `ERR ${String(e).slice(0, 80)} (${Date.now() - t0}ms)`)
      }
      throw new Error(
        `교관 계정(${email})에 "서명 요청함" 탭이 없습니다 — 현재 주소: ${instructor.url()} / 보이는 탭: [${tabNames.map((t) => t.trim()).join(', ')}]\n` +
          `화면 텍스트: ${bodyText}\n` +
          `네트워크(최근 20건):\n${netLog.slice(-20).join('\n')}\n` +
          `응답 없이 걸린 요청:\n${[...pending.values()].join('\n') || '(없음)'}\n` +
          `브라우저 직접 요청: ${JSON.stringify(probe)}\n` +
          `러너(Node) 직접 요청 → supabase auth/health: ${runnerProbe}\n` +
          `콘솔(최근 8건):\n${consoleLog.slice(-8).join('\n')}`,
      )
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
  // 목록이 다시 그려지는 순간과 겹치면 클릭이 빗나갈 수 있어 최대 3번 시도한다
  let clicked = false
  for (let attempt = 0; attempt < 3 && !clicked; attempt += 1) {
    try {
      await card.getByTestId('signature-complete').click({ timeout: 15_000 })
      clicked = true
    } catch (err) {
      if (attempt === 2) throw err
      await instructor.waitForTimeout(1_500)
    }
  }
  // 서명 완료 후 카드는 "대기중" 목록에서 사라진다(완료됨 탭으로 이동).
  // 안 사라지면 카드 안 문구(서버 오류 메시지 등)를 그대로 남긴다.
  try {
    await expect(card).toHaveCount(0, { timeout: 60_000 })
  } catch {
    const cardText = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)
    throw new Error(`서명 완료 후에도 카드가 대기중에 남아 있어요. 카드 내용: ${cardText}`)
  }
  await instructor.getByRole('tab', { name: /^완료됨$/ }).click()
  // 완료됨 탭의 새 조회가 CI에서 걸리면 20초 뒤 재시도되므로 넉넉히 기다린다
  await expect(
    instructor.getByTestId('signature-request-card').filter({ hasText: MARKER }).filter({ hasText: /완료됨/ }).first(),
  ).toBeVisible({ timeout: 60_000 })

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
