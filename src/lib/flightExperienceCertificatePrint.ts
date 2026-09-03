// v1.1 — 초경량비행장치 비행경력증명서(별지 제2호) 출력.
// 무인비행장치 조종자 증명 운영세칙 [별지 제2호서식] <개정 2025. 4. 21.> 및
// 초경량비행장치 조종자 증명 운영세칙 [별지 제2호서식] 의 열 구성을 따른다.
//
// 이 앱이 발급기관은 아니다. 출력물은 "발급기관 대표 서명·날인란이 빈 초안"이며,
// 교육기관이 확인·서명해야 효력이 생긴다. 상단 워터마크로 그 점을 명시한다.
//
// 기재요령 반영:
//   - 비행시간은 시간(HOUR) 단위, 둘째자리 버림(입력 폼에서 이미 처리됨)
//   - 인증검사 면제 기체는 최종인증검사일에 "면제"
//   - 인증 유효기간이 지난 기체로 한 비행은 제외(주의사항 2) → 별도 요약행으로 건수 표기
//   - 무인은 ② 비행횟수, 유인은 ② 착륙횟수 + ④ 비행경로(FROM/TO)

import type { LogbookEntry } from '../types/logbook'
import { isInspectionValidOn } from '../types/vehicle'
import type { Vehicle } from '../types/vehicle'
import { isUnmannedKind, vehicleKindLabel } from './tracks'

function esc(s: string | number | undefined | null): string {
  if (s === undefined || s === null) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function h(v: number | undefined): string {
  return v == null ? '' : v.toFixed(1)
}
function dateKr(iso: string): string {
  // 기재요령 3: 년.월.일 (예 07.01.01)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : iso
}

export interface CertificateHolder {
  name?: string
  birthDate?: string | null
  company?: string
  phone?: string
}

export function printFlightExperienceCertificate(entries: LogbookEntry[], vehicles: Vehicle[], holder: CertificateHolder = {}): void {
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))

  // 무인/유인 혼재 시: 대다수를 따르되, 유인이 하나라도 있으면 경로·착륙 열을 함께 보여준다.
  const anyManned = sorted.some((e) => e.vehicleKind && !isUnmannedKind(e.vehicleKind))
  const included = sorted.filter((e) => !e.vehicleId || isInspectionValidOn(vehicleById.get(e.vehicleId), e.date))
  const excludedCount = sorted.length - included.length

  const rows = included
    .map((e) => {
      const v = e.vehicleId ? vehicleById.get(e.vehicleId) : undefined
      const kind = vehicleKindLabel(v?.kindKey ?? e.vehicleKind) ?? ''
      const unmanned = isUnmannedKind(v?.kindKey ?? e.vehicleKind)
      const inspection = v?.inspectionExempt ? '면제' : v?.lastInspectionDate ? dateKr(v.lastInspectionDate) : ''
      const count = unmanned ? (e.flightCount ?? '') : (e.dayLandings ?? '')
      const place = anyManned
        ? `<td class="l">${esc(e.departure)}</td><td class="l">${esc(e.arrival)}</td>`
        : `<td class="l">${esc(e.departure)}</td>`
      const duty = {
        pic: e.pilotingTime?.pic,
        training: e.pilotingTime?.training,
        instructor: e.pilotingTime?.flightInstructor,
      }
      const dutyTotal = (duty.pic ?? 0) + (duty.training ?? 0) + (duty.instructor ?? 0)
      const signed = e.instructorSignature
      return `<tr>
        <td>${esc(dateKr(e.date))}</td>
        <td class="n">${esc(count)}</td>
        <td class="l">${esc(kind)}</td>
        <td class="l">${esc(v?.model ?? e.aircraftType)}</td>
        <td>${esc(v?.registrationNo ?? e.aircraftIdentification)}</td>
        <td>${esc(inspection)}</td>
        <td class="n">${esc(v?.emptyWeightKg)}</td>
        <td class="n">${esc(v?.mtowKg)}</td>
        ${place}
        <td class="n">${h(e.blockTime)}</td>
        <td class="n">${h(duty.pic)}</td>
        <td class="n">${h(duty.training)}</td>
        <td class="n">${h(duty.instructor)}</td>
        <td class="n">${dutyTotal > 0 ? h(dutyTotal) : ''}</td>
        <td class="l small">${esc(e.flightPurpose)}</td>
        <td class="l small">${esc(signed?.instructorName)}</td>
        <td class="small">${esc(e.instructorLicenceNo)}</td>
        <td class="sig">${signed ? (signed.signatureDataUrl ? `<img src="${signed.signatureDataUrl}" alt="서명" />` : '전자서명') : ''}</td>
      </tr>`
    })
    .join('\n')

  const sum = (f: (e: LogbookEntry) => number | undefined) => Math.floor(included.reduce((s, e) => s + (f(e) ?? 0), 0) * 10) / 10
  const totalCount = included.reduce((s, e) => s + (anyManned ? (e.dayLandings ?? 0) : (e.flightCount ?? 0)), 0)
  const placeCols = anyManned ? 2 : 1
  const totals = `<tr class="total">
    <td>계</td>
    <td class="n">${totalCount}</td>
    <td colspan="${6 + placeCols}"></td>
    <td class="n">${sum((e) => e.blockTime).toFixed(1)}</td>
    <td class="n">${sum((e) => e.pilotingTime?.pic).toFixed(1)}</td>
    <td class="n">${sum((e) => e.pilotingTime?.training).toFixed(1)}</td>
    <td class="n">${sum((e) => e.pilotingTime?.flightInstructor).toFixed(1)}</td>
    <td class="n">${sum((e) => (e.pilotingTime?.pic ?? 0) + (e.pilotingTime?.training ?? 0) + (e.pilotingTime?.flightInstructor ?? 0)).toFixed(1)}</td>
    <td colspan="4"></td>
  </tr>`

  const today = new Date()
  const issue = `${today.getFullYear()}.  ${String(today.getMonth() + 1).padStart(2, '0')}.  ${String(today.getDate()).padStart(2, '0')}.`
  const rule = anyManned ? '초경량비행장치 조종자 증명 운영세칙 제9조' : '무인비행장치 조종자 증명 운영세칙 제9조'

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>비행경력증명서 (초안) — ${esc(holder.name ?? '')}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #111; margin: 0; font-size: 9.5px; }
  .draft { position: fixed; top: 6mm; right: 10mm; border: 1.5px solid #b91c1c; color: #b91c1c; padding: 2px 6px; font-weight: 700; font-size: 10px; letter-spacing: .08em; }
  h1 { text-align: center; font-size: 17px; margin: 4mm 0 1mm; letter-spacing: .3em; }
  h1 small { display: block; font-size: 9px; letter-spacing: 0; font-weight: 400; color: #444; }
  .issueno { font-size: 9px; }
  .holder { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 12px; border: 1px solid #333; padding: 4px 6px; margin: 2mm 0; font-size: 9.5px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #333; padding: 2px 3px; text-align: center; vertical-align: middle; overflow: hidden; }
  th { background: #f1f5f9; font-weight: 700; line-height: 1.15; }
  th small { display: block; font-weight: 400; color: #555; font-size: 7.5px; }
  td.l { text-align: left; } td.n { text-align: right; font-variant-numeric: tabular-nums; }
  td.small { font-size: 8px; }
  td.sig img { max-height: 16px; max-width: 100%; }
  tr.total td { font-weight: 700; background: #f8fafc; }
  .foot { margin-top: 3mm; font-size: 9.5px; line-height: 1.6; }
  .foot .en { color: #555; font-size: 8px; }
  .signs { display: flex; justify-content: space-between; gap: 12mm; margin-top: 2mm; }
  .note { margin-top: 2mm; font-size: 8px; color: #444; }
  .note b { color: #b91c1c; }
  @media print { .draft { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="draft">초 안 · 발급기관 확인 전</div>
  <div class="issueno">발급번호(No. of Issue) : ____-____-__-___</div>
  <h1>비 행 경 력 증 명 서<small>(Certificate of Flight Experience)</small></h1>
  <div class="holder">
    <div>1. 성명(Name): <b>${esc(holder.name ?? '')}</b></div>
    <div>2. 소속(Company): ${esc(holder.company ?? '')}</div>
    <div>3. 생년월일(D.O.B): ${esc(holder.birthDate ?? '')}</div>
    <div>4. 연락처(Phone No.): ${esc(holder.phone ?? '')}</div>
  </div>
  <table>
    <colgroup>
      <col style="width:5.5%"><col style="width:3.8%"><col style="width:7%"><col style="width:9%"><col style="width:7%"><col style="width:5.5%"><col style="width:4.2%"><col style="width:4.2%">
      ${anyManned ? '<col style="width:6%"><col style="width:6%">' : '<col style="width:8%">'}
      <col style="width:4.5%"><col style="width:4.2%"><col style="width:4.2%"><col style="width:4.2%"><col style="width:4.2%">
      <col><col style="width:6%"><col style="width:6%"><col style="width:6%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">① 일자<small>Date</small></th>
        <th rowspan="2">② ${anyManned ? '착륙<br/>횟수' : '비행<br/>횟수'}<small>${anyManned ? 'Landings' : 'No. of Flight'}</small></th>
        <th colspan="6">③ 초경량비행장치<small>Ultra-light Vehicle</small></th>
        <th colspan="${placeCols}" rowspan="${anyManned ? 1 : 2}">④ ${anyManned ? '비행경로' : '비행장소'}<small>${anyManned ? 'Leg' : 'An Airfield'}</small></th>
        <th rowspan="2">⑤ 비행<br/>시간<small>hrs</small></th>
        <th colspan="4">⑥ 임무별 비행시간<small>Flight Time of Duty</small></th>
        <th rowspan="2">⑦ 비행목적<br/>(훈련내용)<small>Purpose</small></th>
        <th colspan="3">⑧ 지도조종자<small>Instructor</small></th>
      </tr>
      <tr>
        <th>종류<small>Category</small></th><th>형식<small>Type</small></th><th>신고번호<small>Report No.</small></th>
        <th>최종인증<br/>검사일</th><th>자체<br/>중량<small>kg</small></th><th>최대이륙<br/>중량<small>kg</small></th>
        ${anyManned ? '<th>FROM</th><th>TO</th>' : ''}
        <th>기장<small>Solo</small></th><th>훈련<small>Training</small></th><th>교관<small>Trainer</small></th><th>소계<small>Total</small></th>
        <th>성명</th><th>자격번호</th><th>서명</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${totals}
    </tbody>
  </table>
  ${excludedCount > 0 ? `<p class="note"><b>제외 ${excludedCount}건</b> — 기체 최종인증검사 유효기간 경과 후 비행(기재요령 주의사항 2). 위 합계에 포함하지 않았습니다.</p>` : ''}
  <div class="foot">
    「${rule}」에 따라 위와 같이 비행경력을 증명합니다.<br/>
    <span class="en">This is to certify that above person has the flight experience in accordance with article 9 of the Operational Detailed Rules.</span>
    <div class="signs">
      <div>발급일(Date of Issue): ${issue}</div>
      <div>발급기관명(Issuing Organization)/주소: ____________________________</div>
      <div>대표자: ______________ (서명 또는 인)</div>
      <div>전화번호: ______________</div>
    </div>
  </div>
  <p class="note">
    이 문서는 AWOS 디지털 로그북에서 생성한 <b>초안</b>입니다. 응시·등록에 쓰려면 지도조종자 확인과 발급기관 대표의 서명·날인이 필요합니다(운영세칙 제9조).
    비행시간은 시간(HOUR) 단위, 소수 둘째자리 버림. 자체중량·최대이륙중량은 신고 당시 중량.
  </p>
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
