// 비행시간 합산 공용 유틸리티
//
// 로그북에서 시간은 0.1시간 단위 소수로 다뤄진다. 자바스크립트 부동소수점은
// 0.1 + 0.2 !== 0.3 같은 오차를 내므로(0.30000000000000004), 시간을 그대로 더하면
// 수백 건 누적 시 총계가 어긋날 수 있다 — 로그북에서 총계가 틀리는 것은 신뢰의 붕괴다.
//
// 원칙: 모든 합산은 "0.1시간 = 1틱" 정수로 변환해 더한 뒤 마지막에 한 번만 나눈다.
// 앱의 모든 시간 합산은 이 파일의 함수만 사용한다(자체 reduce 금지).

/** 값 하나를 0.1시간 단위로 반올림한다. 입력 폼 저장 시 사용. */
export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

/** 시간 배열을 0.1시간 단위 오차 없이 합산한다. undefined/null/NaN은 0으로 취급. */
export function sumHours(values: Array<number | null | undefined>): number {
  const tenths = values.reduce<number>((acc, v) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return acc
    return acc + Math.round(v * 10)
  }, 0)
  return tenths / 10
}

/** 합산 결과를 "1091.8" 형태 문자열로. 표시 전용. */
export function formatHours(value: number): string {
  return value.toFixed(1)
}
