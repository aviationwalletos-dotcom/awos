// v1.1 — 항공기·경량항공기 조종사 비행경력증명서 출력.
// 항공안전법 시행규칙 [별지 제36호서식] 의 열 구성을 따른다(규칙 제77조제2항).
//
// 열: 일자 | 항공기 형식 | 착륙횟수 |
//     비행임무별 비행시간: 기장 / 부기장(기장 감독하의 조종행위 · 기장 외의 조종사) / 교관조종사 / 학생조종사 / 항공기관사 / 소계 |
//     비행종류별 비행시간: 주간비행(시계비행 기장·기장외 / 야외비행 기장·기장외) · 야간비행(시계 기장·기장외 / 야외 기장·기장외) |
//     계기비행: 실제비행 / 모의비행 | 기타 | 계
//
// 로그북 필드 → 서식 열 매핑(근사치는 하단 주에 명시):
//   기장 = pilotingTime.pic · 감독하 = picSupervised · 기장외 = sic · 교관 = flightInstructor · 학생 = dualReceived
//   주/야간 × 시계/야외: conditions.day/night 와 crossCountry 로 분해. 야외는 주간부터 배정하고 남는 만큼 야간으로 본다.
//   "기장" 열과 "기장 외" 열은 그 비행의 PIC 시간 유무로 가른다.
//   계기 실제 = actualInstrument · 모의 = simulatedInstrument + groundTrainerTime
//
// 원 서식은 A4 세로(210×297)이나 열이 23개라 가로로 출력한다. 앱은 발급기관이 아니므로 "초안" 표시.

import type { LogbookEntry } from '../types/logbook'
import { printHtmlDocument } from './ui/printHtml'

function esc(s: string | number | undefined | null): string {
  if (s === undefined || s === null) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function h(v: number | undefined): string {
  return v && v > 0 ? v.toFixed(1) : ''
}
function dateKr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : iso
}

export interface PilotCertificateHolder {
  name?: string
  company?: string
  /** 주민등록번호 또는 여권번호 — 앱은 저장하지 않으므로 빈칸 */
  idNumber?: string
}

interface Row {
  date: string
  type: string
  landings: number
  pic: number
  picSupervised: number
  sic: number
  instructor: number
  student: number
  engineer: number
  dutyTotal: number
  dayVfrPic: number
  dayVfrOther: number
  dayXcPic: number
  dayXcOther: number
  nightVfrPic: number
  nightVfrOther: number
  nightXcPic: number
  nightXcOther: number
  instActual: number
  instSim: number
  other: number
  total: number
}

function toRow(e: LogbookEntry): Row {
  const pic = e.pilotingTime?.pic ?? 0
  const picSupervised = e.pilotingTime?.picSupervised ?? 0
  const sic = e.pilotingTime?.sic ?? 0
  const instructor = e.pilotingTime?.flightInstructor ?? 0
  const student = e.pilotingTime?.dualReceived ?? 0
  const dutyTotal = pic + picSupervised + sic + instructor + student

  const day = e.conditions?.day ?? 0
  const night = e.conditions?.night ?? 0
  const xc = e.conditions?.crossCountry ?? 0
  const dayXc = Math.min(xc, day)
  const nightXc = Math.max(0, Math.min(xc - dayXc, night))
  const dayVfr = Math.max(0, day - dayXc)
  const nightVfr = Math.max(0, night - nightXc)
  const asPic = pic > 0

  return {
    date: e.date,
    type: e.aircraftType,
    landings: (e.dayLandings ?? 0) + (e.nightLandings ?? 0),
    pic,
    picSupervised,
    sic,
    instructor,
    student,
    engineer: 0,
    dutyTotal,
    dayVfrPic: asPic ? dayVfr : 0,
    dayVfrOther: asPic ? 0 : dayVfr,
    dayXcPic: asPic ? dayXc : 0,
    dayXcOther: asPic ? 0 : dayXc,
    nightVfrPic: asPic ? nightVfr : 0,
    nightVfrOther: asPic ? 0 : nightVfr,
    nightXcPic: asPic ? nightXc : 0,
    nightXcOther: asPic ? 0 : nightXc,
    instActual: e.conditions?.actualInstrument ?? 0,
    instSim: (e.conditions?.simulatedInstrument ?? 0) + (e.groundTrainerTime ?? 0),
    other: e.categoryHours?.otherHours ?? 0,
    total: e.blockTime,
  }
}

const NUM_KEYS: (keyof Row)[] = [
  'landings', 'pic', 'picSupervised', 'sic', 'instructor', 'student', 'engineer', 'dutyTotal',
  'dayVfrPic', 'dayVfrOther', 'dayXcPic', 'dayXcOther', 'nightVfrPic', 'nightVfrOther', 'nightXcPic', 'nightXcOther',
  'instActual', 'instSim', 'other', 'total',
]

export function printPilotFlightExperienceCertificate(entries: LogbookEntry[], holder: PilotCertificateHolder = {}): void {
  const rows = [...entries]
    .filter((e) => !(e.origin === 'flight_experience_certificate' && e.certificateApprovalStatus !== 'confirmed'))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map(toRow)

  const sum = (k: keyof Row) => Math.round(rows.reduce((s, r) => s + (r[k] as number), 0) * 10) / 10
  const totals = Object.fromEntries(NUM_KEYS.map((k) => [k, sum(k)])) as Record<(typeof NUM_KEYS)[number], number>

  const cell = (v: number) => `<td class="n">${h(v)}</td>`
  const body = rows
    .map(
      (r) => `<tr>
      <td>${esc(dateKr(r.date))}</td><td class="l">${esc(r.type)}</td><td class="n">${r.landings || ''}</td>
      ${cell(r.pic)}${cell(r.picSupervised)}${cell(r.sic)}${cell(r.instructor)}${cell(r.student)}${cell(r.engineer)}${cell(r.dutyTotal)}
      ${cell(r.dayVfrPic)}${cell(r.dayVfrOther)}${cell(r.dayXcPic)}${cell(r.dayXcOther)}
      ${cell(r.nightVfrPic)}${cell(r.nightVfrOther)}${cell(r.nightXcPic)}${cell(r.nightXcOther)}
      ${cell(r.instActual)}${cell(r.instSim)}${cell(r.other)}<td class="n">${r.total.toFixed(1)}</td>
    </tr>`,
    )
    .join('\n')

  const totalRow = `<tr class="total">
    <td colspan="2">계</td><td class="n">${totals.landings || ''}</td>
    ${cell(totals.pic)}${cell(totals.picSupervised)}${cell(totals.sic)}${cell(totals.instructor)}${cell(totals.student)}${cell(totals.engineer)}${cell(totals.dutyTotal)}
    ${cell(totals.dayVfrPic)}${cell(totals.dayVfrOther)}${cell(totals.dayXcPic)}${cell(totals.dayXcOther)}
    ${cell(totals.nightVfrPic)}${cell(totals.nightVfrOther)}${cell(totals.nightXcPic)}${cell(totals.nightXcOther)}
    ${cell(totals.instActual)}${cell(totals.instSim)}${cell(totals.other)}<td class="n">${totals.total.toFixed(1)}</td>
  </tr>`

  const today = new Date()
  const issue = `${today.getFullYear()}.  ${String(today.getMonth() + 1).padStart(2, '0')}.  ${String(today.getDate()).padStart(2, '0')}.`

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>비행경력증명서 (초안) — ${esc(holder.name ?? '')}</title>
<style>
  @page { size: A4 landscape; margin: 9mm; }
  * { box-sizing: border-box; }
  body { font-family: "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #111; margin: 0; font-size: 8.5px; }
  .draft { position: fixed; top: 5mm; right: 9mm; border: 1.5px solid #b91c1c; color: #b91c1c; padding: 2px 6px; font-weight: 700; font-size: 10px; letter-spacing: .08em; }
  .formno { font-size: 8px; color: #333; }
  h1 { text-align: center; font-size: 17px; margin: 3mm 0 2mm; letter-spacing: .35em; }
  .holder { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 4px 12px; border: 1px solid #333; padding: 4px 6px; margin-bottom: 2mm; font-size: 9.5px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #333; padding: 1.5px 2px; text-align: center; vertical-align: middle; overflow: hidden; white-space: nowrap; }
  th { background: #f1f5f9; font-weight: 700; line-height: 1.1; font-size: 7.5px; }
  td.l { text-align: left; } td.n { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: 700; background: #f8fafc; }
  .foot { margin-top: 3mm; font-size: 9.5px; line-height: 1.6; }
  .signs { display: flex; justify-content: space-between; gap: 10mm; margin-top: 1.5mm; }
  .note { margin-top: 2mm; font-size: 7.5px; color: #444; line-height: 1.5; }
  .note b { color: #b91c1c; }
  @media print { .draft { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="draft">초 안 · 발급기관 확인 전</div>
  <div class="formno">■ 항공안전법 시행규칙 [별지 제36호서식]</div>
  <h1>비행경력증명서</h1>
  <div class="holder">
    <div>1. 성명: <b>${esc(holder.name ?? '')}</b></div>
    <div>2. 소속: ${esc(holder.company ?? '')}</div>
    <div>3. 주민등록번호 또는 여권번호: ${esc(holder.idNumber ?? '')} (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div>
  </div>
  <table>
    <colgroup>
      <col style="width:5.2%"><col style="width:7%"><col style="width:3.4%">
      <col style="width:3.9%"><col style="width:4.1%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%">
      <col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%"><col style="width:3.9%">
      <col style="width:3.9%"><col style="width:3.9%"><col style="width:3.6%"><col style="width:4.4%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="4">일자</th><th rowspan="4">항공기<br/>형식</th><th rowspan="4">착륙<br/>횟수</th>
        <th colspan="7">비행임무별 비행시간</th>
        <th colspan="8">비행종류별 비행시간</th>
        <th colspan="2" rowspan="2">계기비행</th>
        <th rowspan="4">기타</th><th rowspan="4">계</th>
      </tr>
      <tr>
        <th rowspan="3">기장</th><th colspan="2">부기장</th><th rowspan="3">교관<br/>조종사</th><th rowspan="3">학생<br/>조종사</th><th rowspan="3">항공<br/>기관사</th><th rowspan="3">소계</th>
        <th colspan="4">주간비행</th><th colspan="4">야간비행</th>
      </tr>
      <tr>
        <th rowspan="2">기장<br/>감독하의<br/>조종행위</th><th rowspan="2">기장<br/>외의<br/>조종사</th>
        <th colspan="2">시계비행</th><th colspan="2">야외비행</th><th colspan="2">시계비행</th><th colspan="2">야외비행</th>
        <th rowspan="2">실제<br/>비행</th><th rowspan="2">모의<br/>비행</th>
      </tr>
      <tr>
        <th>기장</th><th>기장<br/>외의<br/>조종사</th><th>기장</th><th>기장<br/>외의<br/>조종사</th><th>기장</th><th>기장<br/>외의<br/>조종사</th><th>기장</th><th>기장<br/>외의<br/>조종사</th>
      </tr>
    </thead>
    <tbody>
      ${body}
      ${totalRow}
    </tbody>
  </table>
  <div class="foot">
    「항공안전법 시행규칙」 제77조제2항에 따라 위 사람의 비행경력을 위와 같이 증명합니다.
    <div class="signs">
      <div>발급일: ${issue}</div>
      <div>발급기관명/주소: ____________________________</div>
      <div>발급자: ______________ (서명 또는 인)</div>
      <div>전화번호: ______________</div>
    </div>
  </div>
  <p class="note">
    이 문서는 AWOS 디지털 로그북에서 생성한 <b>초안</b>입니다. 발급기관(교육기관·운항사)의 확인과 서명·날인 전에는 효력이 없습니다.
    주민등록번호는 앱이 저장하지 않으므로 발급 시 직접 기재합니다. 주간·야간 × 시계·야외 구분은 로그북의 주간/야간 시간과 야외비행 시간을 바탕으로 배정한 값이며(야외는 주간부터 배정),
    "기장/기장 외" 열은 해당 비행의 PIC 시간 유무로 나눴습니다. 모의비행 열은 모의계기 + 모의비행훈련장치 시간입니다. 미인증 비행경력증명서 이월 기록은 제외했습니다.
  </p>
</body>
</html>`

  printHtmlDocument(html)
}
