// 한국교통안전공단(TS) 자격 정보 연동 계층
//
// 목적: 조종사가 보유 자격과 유효기간을 직접 입력하지 않고 공단 자격 정보를 불러오게 하는 것.
//
// 현재 상태: 공단 자격 정보 조회 API의 대외 제공 여부·인증 방식이 확정되지 않아 `unavailable`이다.
// 다만 화면과 데이터 변환 계층을 지금 확정해 두면, 연동이 열렸을 때 이 파일의
// getTsIntegrationStatus / fetchTsCredentials 두 함수만 실제 구현으로 교체하면 되고
// 자격증 탭 UI는 수정할 필요가 없다.
//
// 연동이 열리면 구현해야 할 것:
//  1) 사용자 인증(공동인증서/간편인증 등 공단이 요구하는 방식)
//  2) 자격 목록 조회 → mapTsCredentialToCertificateInput 으로 변환
//  3) 중복 판정(이미 수기로 등록한 동일 자격을 덮어쓰지 않고 병합)

import type { CertificateCategory, CertificateInput } from '../types/certificate'

/** 연동 가능 상태.
 *  - unavailable: 아직 연동 미개통 (현재)
 *  - available:   연동 가능하나 사용자가 아직 연결하지 않음
 *  - linked:      사용자 계정에 연결 완료
 */
export type TsIntegrationStatus = 'unavailable' | 'available' | 'linked'

/** 공단에서 내려받는 자격 1건의 정규화된 형태(실제 응답 스키마 확정 시 이 타입을 맞춰 조정). */
export interface TsCredential {
  /** 공단 측 자격 식별자 — 중복 등록 방지 키로 사용한다. */
  externalId: string
  /** 자격명 예: 사업용조종사, 항공신체검사증명 1종 */
  name: string
  issuer: string
  issuedDate: string // YYYY-MM-DD
  expiryDate?: string // YYYY-MM-DD (만료 개념이 있는 자격만)
  /** 공단 분류 코드/명 — 우리 카테고리로 매핑하는 근거 */
  sourceCategory?: string
}

const NOTIFY_STORAGE_KEY = 'awos_ts_integration_notify'

/** 현재 연동 상태를 반환한다. 연동 개통 시 이 함수가 실제 상태를 판정하도록 교체한다. */
export function getTsIntegrationStatus(): TsIntegrationStatus {
  return 'unavailable'
}

/** 공단 자격 목록을 가져온다. 개통 전에는 호출되지 않는다. */
export async function fetchTsCredentials(): Promise<TsCredential[]> {
  throw new Error('TS 자격 연동이 아직 제공되지 않습니다.')
}

/** 공단 분류를 앱의 자격 카테고리로 매핑한다.
 *  분류명이 확정되지 않았으므로 자격명 키워드 기반으로 우선 판정하고, 미상은 '기타 자격'으로 둔다. */
export function mapTsCategory(name: string, sourceCategory?: string): CertificateCategory {
  const text = `${sourceCategory ?? ''} ${name}`
  if (text.includes('신체검사')) return '항공신체검사'
  if (text.includes('교육증명') || text.includes('교관')) return '조종교육증명'
  if (text.includes('한정')) return '한정'
  if (text.includes('조종사') || text.includes('운송용') || text.includes('사업용') || text.includes('자가용')) {
    return '조종사 자격증명'
  }
  if (text.includes('교육') || text.includes('이수')) return '법정교육'
  return '기타 자격'
}

/** 공단 자격 1건을 앱의 자격 입력 형태로 변환한다. */
export function mapTsCredentialToCertificateInput(credential: TsCredential): CertificateInput {
  return {
    name: credential.name,
    category: mapTsCategory(credential.name, credential.sourceCategory),
    issuer: credential.issuer,
    issuedDate: credential.issuedDate,
    expiryDate: credential.expiryDate,
    notes: `TS 자격정보 연동으로 등록 (원본 ID: ${credential.externalId})`,
  }
}

/** 연동 개통 알림 신청 여부를 로컬에 기록한다.
 *  신청자 수는 공단에 연동을 요청할 때 수요 근거로 활용할 수 있다. */
export function hasRequestedTsNotify(): boolean {
  try {
    return window.localStorage.getItem(NOTIFY_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function requestTsNotify(): void {
  try {
    window.localStorage.setItem(NOTIFY_STORAGE_KEY, '1')
  } catch {
    // 저장 실패는 무시한다(사파리 프라이빗 모드 등). 기능 자체에 영향이 없다.
  }
}
