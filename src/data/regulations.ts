// AWOS 가 계산·표시에 쓰는 법령·기준의 목록.
//
// 목적: 법령이 바뀌면 어디를 고쳐야 하는지 한눈에 보이게 하고, 관리자 화면에서 "지금 적용된 버전"과 "최신 여부"를 대조한다.
// 규칙:
//  - appliedVersion 은 코드가 실제로 따르는 개정 기준(공포/시행일 또는 고시 번호). 코드를 고칠 때 같이 갱신한다.
//  - usedIn 은 그 조문을 읽는 코드 위치. 개정 시 여기부터 본다.
//  - lawGoKrQuery 는 국가법령정보센터 검색어(자동 확인 함수가 쓴다). 고시·세칙은 API 로 못 찾을 수 있어 manualUrl 을 둔다.

export interface RegulationRef {
  id: string
  /** 법령명 */
  name: string
  /** 쓰는 조문·별표·별지 */
  articles: string
  /** 코드가 따르는 기준 버전(시행일 또는 고시 번호) */
  appliedVersion: string
  /** 그 버전의 시행일 (YYYY-MM-DD, 알면) */
  appliedEffectiveDate?: string
  /** 앱에서 어디에 쓰이나(사용자에게 보이는 기능 이름) */
  features: string[]
  /** 코드 위치(개정 시 수정할 곳) */
  usedIn: string[]
  /** 국가법령정보센터 검색어(자동 확인용). 없으면 수동 확인만 */
  lawGoKrQuery?: string
  /** 직접 열어 볼 링크 */
  manualUrl?: string
  /** 조문 값이 코드에 하드코딩된 요약(대조용) */
  valuesSummary: string
}

export const REGULATIONS: RegulationRef[] = [
  {
    id: 'aviation-safety-act',
    name: '항공안전법',
    articles: '제34조·제35조·제37조·제44조(자격증명·한정·계기비행증명·조종교육증명)',
    appliedVersion: '2026년 시행 기준',
    features: ['자격증 카드 [REF] 표기', '자격증 구분'],
    usedIn: ['src/components/logbook/MyCertificateStatusCard.tsx', 'src/types/certificate.ts'],
    lawGoKrQuery: '항공안전법',
    manualUrl: 'https://www.law.go.kr/법령/항공안전법',
    valuesSummary: '조문 번호 표기만. 수치 계산 없음.',
  },
  {
    id: 'aviation-safety-rules',
    name: '항공안전법 시행규칙',
    articles: '제77조(비행경력 증명자)·제78조(SIC 1/2)·제99조③(항공영어 등급 유효기간)·제121조(최근 비행경험)·제125조(교관)·별표 4(응시경력·시뮬레이터 인정 상한)·별표 8(신체검사 유효기간)·별표 18(승무시간 한도)·별지 제36호(비행경력증명서)',
    appliedVersion: '2026년 시행 기준',
    features: ['교관 전자서명', '응시경력 진척도', '항공신체검사 만료 계산', '승무시간 한도', '비행경력증명서 PDF', '커런시(교관)'],
    usedIn: [
      'src/lib/flightReadiness.ts',
      'src/lib/eligibility/',
      'src/lib/dutyTimeLimits.ts',
      'src/data/certificateOptions.ts',
      'src/components/certificates/CertificateForm.tsx',
      'src/lib/pdf/pilotCertificatePdf.ts',
    ],
    lawGoKrQuery: '항공안전법 시행규칙',
    manualUrl: 'https://www.law.go.kr/법령/항공안전법시행규칙',
    valuesSummary:
      '신체검사(별표 8): 2종 40세 미만 60개월·40대 24개월·50세 이상 12개월, 1종 12개월(상업 40세 이상 6개월). 승무시간(별표 18): 8h/35h/100h/1,000h. SIC 1/2(제78조). 항공영어 4등급 3년·5등급 6년·6등급 영구(제99조③).',
  },
  {
    id: 'flight-ops-standards',
    name: '운항기술기준 (국토교통부 고시)',
    articles: '8.1.7.6(비행기록부 소지)·8.2.2(최근 비행경험 180일/90일+야간, 동일 등급)·8.2.3(계기비행 경험 6개월·접근 6회)·정의 43(크로스컨트리)',
    appliedVersion: '고시 제2026-154호',
    features: ['커런시 현황', '실시간 비행 적합성', '크로스컨트리 정의'],
    usedIn: ['src/lib/flightReadiness.ts', 'src/components/currency/CurrencyDashboard.tsx', 'src/components/logbook/EntryForm.tsx'],
    manualUrl: 'https://www.law.go.kr/행정규칙/운항기술기준',
    valuesSummary: '일반 180일 이착륙 3회 / 여객·2인조종·운송사업 90일 + 야간 1회 / 계기 6개월 접근 6회 / 동일 등급 판정.',
  },
  {
    id: 'ultralight-rules',
    name: '초경량비행장치·무인비행장치 조종자 증명 운영세칙 (한국교통안전공단)',
    articles: '제9조·제10조·제13조·별표 1·2·3·별지 제2호(로그기록지)',
    appliedVersion: '2026년 시행 기준',
    features: ['초경량 응시경력 진척도', '초경량 기록 폼', '초경량 증명서 PDF'],
    usedIn: ['src/lib/eligibility/', 'src/components/logbook/UltralightEntryForm.tsx', 'src/lib/pdf/ultralightCertificatePdf.ts'],
    manualUrl: 'https://www.kotsa.or.kr',
    valuesSummary: '조종자증명 → 지도조종자 → 실기평가조종자 시간 요건, 무인은 지도조종자 확인·교육기관 증명만 인정.',
  },
  {
    id: 'lsa-rules',
    name: '경량항공기 조종사 응시경력 (시행규칙 별표 4 제2호)',
    articles: '별표 4 제2호',
    appliedVersion: '2026년 시행 기준',
    features: ['경량항공기 응시경력 진척도'],
    usedIn: ['src/lib/eligibility/'],
    lawGoKrQuery: '항공안전법 시행규칙',
    valuesSummary: '경량항공기는 법정 커런시 없음. 응시경력 시간 요건만.',
  },
]
