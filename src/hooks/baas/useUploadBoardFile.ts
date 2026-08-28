// 게시판 첨부파일 업로드 범용 Hook (presigned URL 업로드 2단계: 업로드 URL 발급 → S3 직접 PUT)
// 참고: baas-integration skill의 references/dynamic-board.md #12. 파일 업로드 API (presigned URL)
//
// `useUploadSignatureImage.ts`(서명 이미지 전용, canvas dataURL만 입력받아 표시용 cdn_url만 반환)를
// 일반화한 버전이다. 임의의 File/Blob을 업로드하고, 게시글 첨부(`file_ids`)에 필요한 숫자 file_id와
// 표시용 cdn_url을 함께 반환한다. 이 엔드포인트는 `{ result: true, ... }` 형태의 envelope을 쓰므로
// (다른 API의 "SUCCESS" 문자열과 다름), 문서에 명시된 대로 HTTP 상태(res.ok)로 성공을 판정한다.

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders, getBaasProjectId } from '../../lib/baas/config'

interface PresignResponseData {
  original: {
    presign_url: string
    cdn_url: string
  }
  file_id: number
}

interface PresignResponse {
  result: boolean
  data?: PresignResponseData
  message?: string
}

export interface UploadBoardFileResult {
  /** 게시글 작성 시 file_ids 배열에 담을 첨부파일 id. */
  fileId: number
  /** 업로드 후 영구 조회용 URL(표시용). */
  cdnUrl: string
}

interface UploadBoardFileOptions {
  filename: string
  contentType: string
}

interface UseUploadBoardFileReturn {
  uploadFile: (file: Blob, options: UploadBoardFileOptions) => Promise<UploadBoardFileResult>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useUploadBoardFile(): UseUploadBoardFileReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(async (file: Blob, options: UploadBoardFileOptions): Promise<UploadBoardFileResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const presignResponse = await fetch(`${BAAS_BASE_URL}/upload/presign?project_id=${getBaasProjectId()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          category: 'board_attachment',
          filename: options.filename,
          content_type: options.contentType,
          size: file.size,
          with_compressed: false,
        }),
      })

      const presignResult: PresignResponse = await presignResponse.json()
      if (!presignResponse.ok || !presignResult.result || !presignResult.data) {
        throw new Error(presignResult.message || '파일 업로드 URL 발급에 실패했습니다.')
      }

      const { presign_url: presignUrl, cdn_url: cdnUrl } = presignResult.data.original
      const fileId = presignResult.data.file_id

      const putResponse = await fetch(presignUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': options.contentType || 'application/octet-stream' },
      })

      if (!putResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다. 다시 시도해주세요.')
      }

      return { fileId, cdnUrl }
    } catch (err) {
      const message = err instanceof Error ? err.message : '파일 업로드에 실패했습니다.'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return { uploadFile, isLoading, error, reset }
}
