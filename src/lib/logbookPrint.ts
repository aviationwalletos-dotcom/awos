// 비행기록 인쇄/PDF 출력 유틸리티
//
// 별도 PDF 라이브러리 없이 브라우저 인쇄 엔진을 쓴다: 새 창에 인쇄 전용 문서를 그리고
// print()를 호출하면, 사용자는 인쇄 대화상자에서 "PDF로 저장"을 선택해 파일로 만들 수 있다.
// 취업 지원·자격 신청 시 첨부용 정리본이 목적이며, 공식 비행경력증명서 제출본은
// 소속 기관의 확인·서명 절차를 거쳐야 함을 문서 하단에 명시한다.

import type { LogbookEntry } from '../types/logbook'

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 0.1시간 단위 합산(부동소수점 누적 오차 방지) */
function sumTenths(values: Array<number | undefined>): number {
  const t = values.reduce<number>((acc, v) => acc + (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) : 0), 0)
  return t / 10
}

function fmt(v: number | undefined): string {
  return typeof v === 'number' && Number.isFinite(v) && v !== 0 ? v.toFixed(1) : ''
}

function fmtInt(v: number | undefined): string {
  return typeof v === 'number' && Number.isFinite(v) && v !== 0 ? String(v) : ''
}

export function printLogbook(entries: LogbookEntry[]): void {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))

  const rows = sorted
    .map((e) => {
      const route = `${e.departure} → ${e.arrival}${e.viaAirports ? ` (경유 ${e.viaAirports})` : ''}`
      const aircraft = `${e.aircraftType}${e.aircraftIdentification ? ` · ${e.aircraftIdentification}` : ''}`
      const signed = e.instructorSignature ? '✓' : ''
      return `<tr>
        <td>${esc(e.date)}</td>
        <td class="l">${esc(route)}</td>
        <td class="l">${esc(aircraft)}</td>
        <td>${esc(e.flightCategory)}</td>
        <td class="n">${e.blockTime.toFixed(1)}</td>
        <td class="n">${fmt(e.pilotingTime?.pic)}</td>
        <td class="n">${fmt(e.pilotingTime?.dualReceived)}</td>
        <td class="n">${fmt(e.conditions?.night)}</td>
        <td class="n">${fmt(e.conditions?.crossCountry)}</td>
        <td class="n">${fmt(e.conditions?.actualInstrument)}</td>
        <td class="n">${fmtInt(e.dayLandings)}</td>
        <td class="n">${fmtInt(e.nightLandings)}</td>
        <td>${signed}</td>
      </tr>`
    })
    .join('\n')

  const totalBlock = sumTenths(sorted.map((e) => e.blockTime))
  const totals = `<tr class="total">
    <td colspan="4">합계 · ${sorted.length}건</td>
    <td class="n">${totalBlock.toFixed(1)}</td>
    <td class="n">${sumTenths(sorted.map((e) => e.pilotingTime?.pic)).toFixed(1)}</td>
    <td class="n">${sumTenths(sorted.map((e) => e.pilotingTime?.dualReceived)).toFixed(1)}</td>
    <td class="n">${sumTenths(sorted.map((e) => e.conditions?.night)).toFixed(1)}</td>
    <td class="n">${sumTenths(sorted.map((e) => e.conditions?.crossCountry)).toFixed(1)}</td>
    <td class="n">${sumTenths(sorted.map((e) => e.conditions?.actualInstrument)).toFixed(1)}</td>
    <td class="n">${sorted.reduce((a, e) => a + (e.dayLandings ?? 0), 0)}</td>
    <td class="n">${sorted.reduce((a, e) => a + (e.nightLandings ?? 0), 0)}</td>
    <td></td>
  </tr>`

  const issuedAt = new Date().toISOString().slice(0, 10)
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>AWOS 비행기록부 (${issuedAt})</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif; color: #111827; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111827; padding-bottom: 8px; }
  h1 { font-size: 18px; margin: 0; letter-spacing: -0.01em; }
  .meta { font-size: 11px; color: #4b5563; }
  .summary { margin: 10px 0 12px; font-size: 12px; }
  .summary b { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #d1d5db; padding: 4px 5px; text-align: center; }
  th { background: #f3f4f6; font-weight: 700; }
  td.l { text-align: left; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: 700; background: #f9fafb; }
  .foot { margin-top: 10px; font-size: 9.5px; color: #6b7280; }
</style>
</head>
<body>
  <div class="head">
    <h1>비행기록부 — Aviation Wallet OS</h1>
    <div class="meta">출력일 ${issuedAt}</div>
  </div>
  <p class="summary">총 비행기록 <b>${sorted.length}</b>건 · 누적 블록타임 <b>${totalBlock.toFixed(1)}</b>시간</p>
  <table>
    <thead>
      <tr>
        <th>날짜</th><th>구간</th><th>항공기</th><th>종류</th><th>블록</th>
        <th>PIC</th><th>DUAL</th><th>야간</th><th>X-C</th><th>실계기</th>
        <th>주간착륙</th><th>야간착륙</th><th>교관서명</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${totals}
    </tbody>
  </table>
  <p class="foot">본 문서는 AWOS 앱에 기록된 비행 데이터를 정리한 출력물입니다. 공식 비행경력증명 용도로는 소속 기관(교육원)의 확인·서명 절차를 거친 증명서를 사용하세요. · 시간 단위: 시간(0.1h) · ✓ = 교관 전자서명 완료 기록</p>
  <script>window.addEventListener('load', function () { window.print(); });</script>
</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    window.alert('팝업이 차단되어 인쇄 창을 열 수 없습니다. 브라우저 주소창의 팝업 허용을 눌러 주세요.')
    return
  }
  win.document.write(html)
  win.document.close()
}
