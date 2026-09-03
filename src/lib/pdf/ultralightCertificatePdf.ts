// 초경량·무인 운영세칙 [별지 제2호서식] 비행경력증명서 — PDF 직접 생성(A4 가로).
// 무인: ② 비행횟수·④ 비행장소 / 유인: ② 착륙횟수·④ 비행경로(FROM/TO). 인증 만료 후 비행은 제외하고 건수 표기.

import { isUnmannedKind, vehicleKindLabel } from '../tracks'
import { dateKr } from '../flightExperienceRows'
import type { LogbookEntry } from '../../types/logbook'
import { isInspectionValidOn } from '../../types/vehicle'
import type { Vehicle } from '../../types/vehicle'
import { cellLines, cellText, createPdf, drawDraftBadge, drawLine, drawPageNo, drawRect, drawText, mm, newPage } from './pdfCore'

export interface UltralightHolder {
  name?: string
  birthDate?: string | null
  company?: string
  phone?: string
}

const h = (v: number | undefined) => (v == null ? '' : v.toFixed(1))

export async function buildUltralightCertificatePdf(entries: LogbookEntry[], vehicles: Vehicle[], holder: UltralightHolder = {}): Promise<Uint8Array> {
  const ctx = await createPdf(`비행경력증명서(초안) — ${holder.name ?? ''}`)
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
  const anyManned = sorted.some((e) => e.vehicleKind && !isUnmannedKind(e.vehicleKind))
  const included = sorted.filter((e) => !e.vehicleId || isInspectionValidOn(vehicleById.get(e.vehicleId), e.date))
  const excludedCount = sorted.length - included.length

  const x0 = ctx.margin
  const tableW = ctx.width - ctx.margin * 2
  const pct = anyManned
    ? [5.5, 3.8, 7, 9, 7, 5.5, 4.2, 4.2, 6, 6, 4.5, 4.2, 4.2, 4.2, 4.2, 6.3, 6, 6, 6]
    : [5.5, 3.8, 7, 9, 7, 5.5, 4.2, 4.2, 10, 4.5, 4.2, 4.2, 4.2, 4.2, 8.3, 6, 6, 6]
  const cols = pct.map((p) => (tableW * p) / 100)
  const cx = (i: number) => x0 + cols.slice(0, i).reduce((a, b) => a + b, 0)
  const cw = (i: number, n = 1) => cols.slice(i, i + n).reduce((a, b) => a + b, 0)
  const rowH = mm(5)
  const bottomLimit = ctx.height - ctx.margin - mm(6)
  const placeCols = anyManned ? 2 : 1

  const drawHeader = (yTop: number) => {
    const h1 = mm(8), h2 = mm(9)
    const H = h1 + h2
    drawRect(ctx, x0, yTop, tableW, H, { fill: [0.945, 0.961, 0.976], stroke: [0.2, 0.2, 0.2] })
    const box = (i: number, n: number, y: number, hh: number, lines: string[]) => {
      drawRect(ctx, cx(i), y, cw(i, n), hh, { stroke: [0.2, 0.2, 0.2] })
      cellLines(ctx, lines, cx(i), y, cw(i, n), hh, 6)
    }
    box(0, 1, yTop, H, ['① 일자'])
    box(1, 1, yTop, H, anyManned ? ['② 착륙', '횟수'] : ['② 비행', '횟수'])
    box(2, 6, yTop, h1, ['③ 초경량비행장치'])
    box(2, 1, yTop + h1, h2, ['종류']); box(3, 1, yTop + h1, h2, ['형식']); box(4, 1, yTop + h1, h2, ['신고번호'])
    box(5, 1, yTop + h1, h2, ['최종인증', '검사일']); box(6, 1, yTop + h1, h2, ['자체중량', '(kg)']); box(7, 1, yTop + h1, h2, ['최대이륙', '중량(kg)'])
    if (anyManned) {
      box(8, 2, yTop, h1, ['④ 비행경로'])
      box(8, 1, yTop + h1, h2, ['FROM']); box(9, 1, yTop + h1, h2, ['TO'])
    } else {
      box(8, 1, yTop, H, ['④ 비행장소'])
    }
    const b = 8 + placeCols
    box(b, 1, yTop, H, ['⑤ 비행', '시간(hrs)'])
    box(b + 1, 4, yTop, h1, ['⑥ 임무별 비행시간'])
    box(b + 1, 1, yTop + h1, h2, ['기장']); box(b + 2, 1, yTop + h1, h2, ['훈련']); box(b + 3, 1, yTop + h1, h2, ['교관']); box(b + 4, 1, yTop + h1, h2, ['소계'])
    box(b + 5, 1, yTop, H, ['⑦ 비행목적', '(훈련내용)'])
    box(b + 6, 3, yTop, h1, ['⑧ 지도조종자'])
    box(b + 6, 1, yTop + h1, h2, ['성명']); box(b + 7, 1, yTop + h1, h2, ['자격번호']); box(b + 8, 1, yTop + h1, h2, ['서명'])
    return H
  }

  const drawTop = () => {
    let y = ctx.margin
    drawDraftBadge(ctx)
    drawText(ctx, '발급번호(No. of Issue) : ____-____-__-___', x0, y, { size: 7.5, color: [0.25, 0.25, 0.25] })
    y += mm(6)
    drawText(ctx, '비 행 경 력 증 명 서', ctx.width / 2, y, { size: 16, align: 'center' })
    y += mm(6)
    drawText(ctx, '(Certificate of Flight Experience)', ctx.width / 2, y, { size: 7, align: 'center', color: [0.35, 0.35, 0.35] })
    y += mm(6)
    const bh = mm(7)
    drawRect(ctx, x0, y, tableW, bh, { stroke: [0.2, 0.2, 0.2] })
    const q = tableW / 4
    cellText(ctx, `1. 성명(Name): ${holder.name ?? ''}`, x0, y, q, bh, { size: 7.5, align: 'left' })
    cellText(ctx, `2. 소속(Company): ${holder.company ?? ''}`, x0 + q, y, q, bh, { size: 7.5, align: 'left' })
    cellText(ctx, `3. 생년월일(D.O.B): ${holder.birthDate ?? ''}`, x0 + q * 2, y, q, bh, { size: 7.5, align: 'left' })
    cellText(ctx, `4. 연락처(Phone): ${holder.phone ?? ''}`, x0 + q * 3, y, q, bh, { size: 7.5, align: 'left' })
    y += bh + mm(2.5)
    y += drawHeader(y)
    return y
  }

  const drawRow = (yTop: number, vals: Array<[string, 'left' | 'center' | 'right']>, bold = false) => {
    if (bold) drawRect(ctx, x0, yTop, tableW, rowH, { fill: [0.973, 0.98, 0.988] })
    vals.forEach(([v, align], i) => {
      drawRect(ctx, cx(i), yTop, cols[i], rowH, { stroke: [0.2, 0.2, 0.2] })
      cellText(ctx, v, cx(i), yTop, cols[i], rowH, { size: 6.5, align })
    })
  }

  let y = drawTop()
  let totalCount = 0, tTime = 0, tPic = 0, tTrain = 0, tInst = 0
  for (const e of included) {
    if (y + rowH > bottomLimit) {
      drawPageNo(ctx); newPage(ctx); y = drawTop()
    }
    const v = e.vehicleId ? vehicleById.get(e.vehicleId) : undefined
    const kindKey = v?.kindKey ?? e.vehicleKind
    const unmanned = isUnmannedKind(kindKey)
    const inspection = v?.inspectionExempt ? '면제' : v?.lastInspectionDate ? dateKr(v.lastInspectionDate) : ''
    const count = unmanned ? (e.flightCount ?? 0) : (e.dayLandings ?? 0)
    totalCount += count
    const pic = e.pilotingTime?.pic, tr = e.pilotingTime?.training, ins = e.pilotingTime?.flightInstructor
    const sub = (pic ?? 0) + (tr ?? 0) + (ins ?? 0)
    tTime += e.blockTime; tPic += pic ?? 0; tTrain += tr ?? 0; tInst += ins ?? 0
    const vals: Array<[string, 'left' | 'center' | 'right']> = [
      [dateKr(e.date), 'center'], [count ? String(count) : '', 'right'],
      [vehicleKindLabel(kindKey) ?? '', 'left'], [v?.model ?? e.aircraftType, 'left'], [v?.registrationNo ?? e.aircraftIdentification ?? '', 'center'],
      [inspection, 'center'], [v?.emptyWeightKg != null ? String(v.emptyWeightKg) : '', 'right'], [v?.mtowKg != null ? String(v.mtowKg) : '', 'right'],
      ...(anyManned ? ([[e.departure, 'left'], [e.arrival, 'left']] as Array<[string, 'left']>) : ([[e.departure, 'left']] as Array<[string, 'left']>)),
      [h(e.blockTime), 'right'], [h(pic), 'right'], [h(tr), 'right'], [h(ins), 'right'], [sub > 0 ? h(sub) : '', 'right'],
      [e.flightPurpose ?? '', 'left'], [e.instructorSignature?.instructorName ?? '', 'left'], [e.instructorLicenceNo ?? '', 'center'],
      [e.instructorSignature ? '전자서명' : '', 'center'],
    ]
    drawRow(y, vals)
    y += rowH
  }
  if (y + rowH + mm(36) > bottomLimit) {
    drawPageNo(ctx); newPage(ctx); y = drawTop()
  }
  const fl = (v: number) => (Math.floor(v * 10) / 10).toFixed(1)
  const blanks = (n: number) => Array.from({ length: n }, () => ['', 'center'] as [string, 'center'])
  drawRow(y, [['계', 'center'], [String(totalCount), 'right'], ...blanks(6 + placeCols), [fl(tTime), 'right'], [fl(tPic), 'right'], [fl(tTrain), 'right'], [fl(tInst), 'right'], [fl(tPic + tTrain + tInst), 'right'], ...blanks(4)], true)
  y += rowH + mm(3)
  if (excludedCount > 0) {
    drawText(ctx, `제외 ${excludedCount}건 — 기체 최종인증검사 유효기간 경과 후 비행(기재요령 주의사항 2). 위 합계에 포함하지 않았습니다.`, x0, y, { size: 7, color: [0.72, 0.11, 0.11] })
    y += mm(5)
  }
  const rule = anyManned ? '초경량비행장치 조종자 증명 운영세칙 제9조' : '무인비행장치 조종자 증명 운영세칙 제9조'
  drawText(ctx, `「${rule}」에 따라 위와 같이 비행경력을 증명합니다.`, x0, y, { size: 8.5 })
  y += mm(4)
  drawText(ctx, 'This is to certify that above person has the flight experience in accordance with article 9 of the Operational Detailed Rules.', x0, y, { size: 6.5, color: [0.35, 0.35, 0.35] })
  y += mm(6)
  const today = new Date()
  const issue = `${today.getFullYear()}.  ${String(today.getMonth() + 1).padStart(2, '0')}.  ${String(today.getDate()).padStart(2, '0')}.`
  const q = tableW / 4
  drawText(ctx, `발급일(Date of Issue): ${issue}`, x0, y, { size: 8 })
  drawText(ctx, '발급기관명/주소: ________________________', x0 + q, y, { size: 8 })
  drawText(ctx, '대표자: ______________ (서명 또는 인)', x0 + q * 2, y, { size: 8 })
  drawText(ctx, '전화번호: ______________', x0 + q * 3, y, { size: 8 })
  y += mm(7)
  drawLine(ctx, x0, y, x0 + tableW, y, 0.3, [0.6, 0.6, 0.6])
  y += mm(2)
  drawText(ctx, '이 문서는 AWOS 디지털 로그북에서 생성한 초안입니다. 응시·등록에 쓰려면 지도조종자 확인과 발급기관 대표의 서명·날인이 필요합니다(운영세칙 제9조). 비행시간은 시간(HOUR) 단위, 소수 둘째자리 버림.', x0, y, { size: 6.5, color: [0.3, 0.3, 0.3], fitWidth: tableW, minSize: 5 })
  drawPageNo(ctx)
  return ctx.doc.save()
}
