// 초기 서버 동기화 시 게시글마다 개별 상세조회(fetchDetail) API를 호출해야 하는 훅들
// (useLogbookEntries/useCertificates/useWorkLogEntries)이 공용으로 사용하는 배치 분할 유틸리티(BUG-022).
//
// 기록 건수가 수백 건이면 한 번에 수백 개의 HTTP 요청을 동시에 쏘게 되어, 브라우저의
// 오리진당 동시 연결 수 제한(보통 6개 안팍) 때문에 나머지 요청이 줄줄이 대기하며 전체
// 동기화가 매우 오래 걸린다. 이를 완화하기 위해 적당한 크기의 배치로 나눠 순차적으로
// 처리한다(배치 사이 인위적인 지연은 없음).

/** 상세조회 등 개별 API 호출을 몇 건씩 묶어서 처리할지 결정하는 배치 크기. */
export const DETAIL_FETCH_BATCH_SIZE = 20

/**
 * 미동기화 기록(게시글 생성) 재시도(retryPendingSync)에서 몇 건씩 동시에 요청을 보낼지 결정하는
 * 배치 크기(BUG-020 후속 2). 한 건씩 순차 처리하면 건수가 많을 때 너무 느려서, 작은 동시 배치로
 * 나눠 배치 내부는 동시에 보내고 배치 사이에만 짧은 지연(RETRY_CREATE_BATCH_DELAY_MS)을 둔다.
 * 문서화되지 않은 서버 요청 빈도 제한에 걸려 실패율이 오르지 않도록 보수적으로 작게 유지한다.
 */
export const RETRY_CREATE_BATCH_SIZE = 5

/** 배치 사이에 두는 지연(ms). 배치 내부의 개별 요청 사이에는 지연을 두지 않는다. */
export const RETRY_CREATE_BATCH_DELAY_MS = 300

/** 배열을 batchSize 크기의 청크(하위 배열)로 나눕니다. */
export function chunkArray<T>(items: T[], batchSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize))
  }
  return chunks
}
