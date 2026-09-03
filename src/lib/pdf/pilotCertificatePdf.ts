// 시행규칙 [별지 제36호서식] 비행경력증명서 — PDF 직접 생성(A4 가로).
// 23개 열. 행이 많으면 페이지를 넘기며 머리글을 반복하고, 마지막 페이지에 합계·증명문·서명란을 둔다.

import { PILOT_CERT_NUM_KEYS, buildPilotCertRows, dateKr, sumPilotCertRows } from '../flightExperienceRows'
import type { PilotCertRow } from '../flightExperienceRows'
import type { LogbookEntry } from '../../types/logbook'
import { cellLines, cellText, createPdf, drawDraftBadge, drawLine, drawPageNo, drawRect, drawText, mm, newPage } from './pdfCore'
import type { PdfCtx } from './pdfCore'

export interface PilotCertificateHolder {
  name?: string
  company?: string
  idNumber?: string
}

const h = (v: number) => (v && v > 0 ? v.toFixed(1) : '')

// 열 비율(합 100) — HTML 버전과 동일
const COL_PCT = [5.2, 7, 3.4, 3.9, 4.1, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.6, 4.4]
const HEAD_H = [7, 7, 9, 9] // 4단 머리글 높이(mm)

function drawHeader(ctx: PdfCtx, x0: number, yTop: number, cols: number[]): number {
  const cx = (i: number) => x0 + cols.slice(0, i).reduce((a, b) => a + b, 0)
  const cw = (i: number, n = 1) => cols.slice(i, i + n).reduce((a, b) => a + b, 0)
  const hh = HEAD_H.map(mm)
  const H = hh.reduce((a, b) => a + b, 0)
  const y1 = yTop, y2 = y1 + hh[0], y3 = y2 + hh[1], y4 = y3 + hh[2]
  const fill: [number, number, number] = [0.945, 0.961, 0.976]
  drawRect(ctx, x0, yTop, cw(0, cols.length), H, { fill, stroke: [0.2, 0.2, 0.2] })

  const box = (i: number, n: number, y: number, hgt: number, lines: string[]) => {
    drawRect(ctx, cx(i), y, cw(i, n), hgt, { stroke: [0.2, 0.2, 0.2] })
    cellLines(ctx, lines, cx(i), y, cw(i, n), hgt, 6)
  }
  box(0, 1, y1, H, ['일자'])
  box(1, 1, y1, H, ['항공기', '형식'])
  box(2, 1, y1, H, ['착륙', '횟수'])
  box(3, 7, y1, hh[0], ['비행임무별 비행시간'])
  box(10, 8, y1, hh[0], ['비행종류별 비행시간'])
  box(18, 2, y1, hh[0] + hh[1], ['계기비행'])
  box(20, 1, y1, H, ['기타'])
  box(21, 1, y1, H, ['계'])
  // 2단
  box(3, 1, y2, hh[1] + hh[2] + hh[3], ['기장'])
  box(4, 2, y2, hh[1], ['부기장'])
  box(6, 1, y2, hh[1] + hh[2] + hh[3], ['교관', '조종사'])
  box(7, 1, y2, hh[1] + hh[2] + hh[3], ['학생', '조종사'])
  box(8, 1, y2, hh[1] + hh[2] + hh[3], ['항공', '기관사'])
  box(9, 1, y2, hh[1] + hh[2] + hh[3], ['소계'])
  box(10, 4, y2, hh[1], ['주간비행'])
  box(14, 4, y2, hh[1], ['야간비행'])
  // 3단
  box(4, 1, y3, hh[2] + hh[3], ['기장', '감독하의', '조종행위'])
  box(5, 1, y3, hh[2] + hh[3], ['기장', '외의', '조종사'])
  box(10, 2, y3, hh[2], ['시계비행'])
  box(12, 2, y3, hh[2], ['야외비행'])
  box(14, 2, y3, hh[2], ['시계비행'])
  box(16, 2, y3, hh[2], ['야외비행'])
  box(18, 1, y3, hh[2] + hh[3], ['실제', '비행'])
  box(19, 1, y3, hh[2] + hh[3], ['모의', '비행'])
  // 4단
  for (let i = 10; i < 18; i += 2) {
    box(i, 1, y4, hh[3], ['기장'])
    box(i + 1, 1, y4, hh[3], ['기장', '외의', '조종사'])
  }
  return H
}

function drawRow(ctx: PdfCtx, x0: number, yTop: number, cols: number[], r: PilotCertRow, rowH: number, bold = false): void {
  const cx = (i: number) => x0 + cols.slice(0, i).reduce((a, b) => a + b, 0)
  const vals: Array<[string, 'left' | 'center' | 'right']> = [
    [dateKr(r.date), 'center'], [r.type, 'left'], [r.landings ? String(r.landings) : '', 'right'],
    [h(r.pic), 'right'], [h(r.picSupervised), 'right'], [h(r.sic), 'right'], [h(r.instructor), 'right'], [h(r.student), 'right'], [h(r.engineer), 'right'], [h(r.dutyTotal), 'right'],
    [h(r.dayVfrPic), 'right'], [h(r.dayVfrOther), 'right'], [h(r.dayXcPic), 'right'], [h(r.dayXcOther), 'right'],
    [h(r.nightVfrPic), 'right'], [h(r.nightVfrOther), 'right'], [h(r.nightXcPic), 'right'], [h(r.nightXcOther), 'right'],
    [h(r.instActual), 'right'], [h(r.instSim), 'right'], [h(r.other), 'right'], [r.total.toFixed(1), 'right'],
  ]
  if (bold) drawRect(ctx, x0, yTop, cols.reduce((a, b) => a + b, 0), rowH, { fill: [0.973, 0.98, 0.988] })
  vals.forEach(([v, align], i) => {
    drawRect(ctx, cx(i), yTop, cols[i], rowH, { stroke: [0.2, 0.2, 0.2] })
    cellText(ctx, v, cx(i), yTop, cols[i], rowH, { size: 6.5, align })
  })
}

export async function buildPilotFlightExperienceCertificatePdf(entries: LogbookEntry[], holder: PilotCertificateHolder = {}): Promise<Uint8Array> {
  const ctx = await createPdf(`비행경력증명서(초안) — ${holder.name ?? ''}`)
  const rows = buildPilotCertRows(entries)
  const totals = sumPilotCertRows(rows)
  const x0 = ctx.margin
  const tableW = ctx.width - ctx.margin * 2
  const cols = COL_PCT.map((p) => (tableW * p) / 100)
  const rowH = mm(4.6)
  const footerNeed = mm(38) // 증명문+서명란+주
  const bottomLimit = ctx.height - ctx.margin - mm(6)

  const drawTop = () => {
    let y = ctx.margin
    drawDraftBadge(ctx)
    drawText(ctx, '■ 항공안전법 시행규칙 [별지 제36호서식]', x0, y, { size: 7, color: [0.25, 0.25, 0.25] })
    y += mm(6)
    drawText(ctx, '비 행 경 력 증 명 서', ctx.width / 2, y, { size: 16, align: 'center' })
    y += mm(9)
    // 인적사항 박스
    const bh = mm(7)
    drawRect(ctx, x0, y, tableW, bh, { stroke: [0.2, 0.2, 0.2] })
    const third = tableW / 3
    cellText(ctx, `1. 성명: ${holder.name ?? ''}`, x0, y, third, bh, { size: 8, align: 'left' })
    cellText(ctx, `2. 소속: ${holder.company ?? ''}`, x0 + third, y, third, bh, { size: 8, align: 'left' })
    cellText(ctx, `3. 주민등록번호 또는 여권번호: ${holder.idNumber ?? ''} (      )`, x0 + third * 2, y, third, bh, { size: 8, align: 'left' })
    y += bh + mm(2.5)
    y += drawHeader(ctx, x0, y, cols)
    return y
  }

  let y = drawTop()
  for (const r of rows) {
    if (y + rowH > bottomLimit) {
      drawPageNo(ctx)
      newPage(ctx)
      y = drawTop()
    }
    drawRow(ctx, x0, y, cols, r, rowH)
    y += rowH
  }
  // 합계 행 + 하단 — 공간 부족하면 새 페이지
  if (y + rowH + footerNeed > bottomLimit) {
    drawPageNo(ctx)
    newPage(ctx)
    y = drawTop()
  }
  const totalRow: PilotCertRow = { date: '계', type: '', ...(Object.fromEntries(PILOT_CERT_NUM_KEYS.map((k) => [k, totals[k]])) as Omit<PilotCertRow, 'date' | 'type'>) }
  drawRow(ctx, x0, y, cols, totalRow, rowH, true)
  y += rowH + mm(4)

  drawText(ctx, '「항공안전법 시행규칙」 제77조제2항에 따라 위 사람의 비행경력을 위와 같이 증명합니다.', x0, y, { size: 8.5 })
  y += mm(7)
  const today = new Date()
  const issue = `${today.getFullYear()}.  ${String(today.getMonth() + 1).padStart(2, '0')}.  ${String(today.getDate()).padStart(2, '0')}.`
  const quarter = tableW / 4
  drawText(ctx, `발급일: ${issue}`, x0, y, { size: 8 })
  drawText(ctx, '발급기관명/주소: ________________________', x0 + quarter, y, { size: 8 })
  drawText(ctx, '발급자: ______________ (서명 또는 인)', x0 + quarter * 2, y, { size: 8 })
  drawText(ctx, '전화번호: ______________', x0 + quarter * 3, y, { size: 8 })
  y += mm(7)
  drawLine(ctx, x0, y, x0 + tableW, y, 0.3, [0.6, 0.6, 0.6])
  y += mm(2)
  const notes = [
    '이 문서는 AWOS 디지털 로그북에서 생성한 초안입니다. 발급기관(교육기관·운항사)의 확인과 서명·날인 전에는 효력이 없습니다. 주민등록번호는 앱이 저장하지 않으므로 발급 시 직접 기재합니다.',
    '주간·야간 × 시계·야외 구분은 로그북의 주간/야간 시간과 야외비행 시간을 바탕으로 배정한 값이며(야외는 주간부터 배정), "기장/기장 외" 열은 해당 비행의 PIC 시간 유무로 나눴습니다. 모의비행 열은 모의계기 + 모의비행훈련장치 시간입니다. 미인증 비행경력증명서 이월 기록은 제외했습니다.',
  ]
  for (const n of notes) {
    // 간단 줄바꿈
    const words = n.split(' ')
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.font.widthOfTextAtSize(test, 6.5) > tableW) {
        drawText(ctx, line, x0, y, { size: 6.5, color: [0.3, 0.3, 0.3] })
        y += mm(3.2)
        line = w
      } else line = test
    }
    if (line) {
      drawText(ctx, line, x0, y, { size: 6.5, color: [0.3, 0.3, 0.3] })
      y += mm(3.2)
    }
  }
  drawPageNo(ctx)
  return ctx.doc.save()
}
