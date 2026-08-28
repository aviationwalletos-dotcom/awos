// 소속 기관 고정 선택 목록.
// 회원가입/계정정보 화면에서 자유 텍스트 대신 이 목록에서 선택하도록 하여
// 교관 승인 관리 패널의 소속 기관 필터링이 정확히 동작하도록 한다.
// '기타'를 선택하면 별도 텍스트 입력으로 목록에 없는 기관명도 등록할 수 있다.
export const INSTITUTION_OPTIONS = [
  '한국항공대학교 울진비행교육원',
  '한서대학교 태안비행교육원',
  '극동대학교 반석비행교육원',
  '초당대학교 비행교육원',
  '한국항공전문학교',
  '아시아나항공 항공교육원',
  '대한항공 종합훈련원',
  '기타',
] as const

export type InstitutionOption = (typeof INSTITUTION_OPTIONS)[number]

/** '기타' 선택 시 보조 텍스트 입력을 노출하기 위한 값. */
export const INSTITUTION_OTHER_VALUE: InstitutionOption = '기타'
