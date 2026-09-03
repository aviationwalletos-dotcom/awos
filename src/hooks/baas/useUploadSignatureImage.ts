// 서명 이미지(canvas dataURL) 업로드 Hook
// presigned URL 업로드 2단계(업로드 URL 발급 → S3 직접 PUT)를 감싼다.
// 참고: baas-integration skill의 references/dynamic-board.md #12. 파일 업로드 API (presigned URL)
// 이 엔드포인트는 { result: true, ... } 형태의 envelope을 쓰므로(다른 API의 "SUCCESS" 문자열과 다름),
// 문서에 명시된 대로 HTTP 상태(res.ok)로 성공을 판정한다.

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders, getBaasProjectId } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'

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

interface UseUploadSignatureImageReturn {
  /** canvas dataURL(image/png)을 업로드하고, 영구 조회용 cdn_url을 반환한다. */
  uploadSignatureImage: (dataUrl: string) => Promise<string>
  isLoading: boolean
  error: string | null
  reset: () => void
}

const SIGNATURE_FILE_NAME = 'signature.png'
const SIGNATURE_CONTENT_TYPE = 'image/png'

/**
 * [BUGFIX] 이전에는 fetch(dataUrl)로 Blob을 만들었는데, CSP connect-src에 data: 가 없어
 * 브라우저가 요청 자체를 막았다("Failed to fetch"). 네트워크 없이 base64를 직접 디코드한다.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match) throw new Error('서명 이미지 형식이 올바르지 않습니다.')
  const mime = match[1] || SIGNATURE_CONTENT_TYPE
  const isBase64 = Boolean(match[2])
  const payload = match[3]
  if (!isBase64) return new Blob([decodeURIComponent(payload)], { type: mime })
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function useUploadSignatureImage(): UseUploadSignatureImageReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadSignatureImage = useCallback(async (dataUrl: string): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const blob = await dataUrlToBlob(dataUrl)

      const presignResponse = await baasFetch(`${BAAS_BASE_URL}/upload/presign?project_id=${getBaasProjectId()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          category: 'board_attachment',
          filename: SIGNATURE_FILE_NAME,
          content_type: SIGNATURE_CONTENT_TYPE,
          size: blob.size,
          with_compressed: false,
        }),
      })

      const presignResult: PresignResponse = await presignResponse.json()
      if (!presignResponse.ok || !presignResult.result || !presignResult.data) {
        throw new Error(presignResult.message || '서명 이미지 업로드 URL 발급에 실패했습니다.')
      }

      const { presign_url: presignUrl, cdn_url: cdnUrl } = presignResult.data.original

      const putResponse = await baasFetch(presignUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': SIGNATURE_CONTENT_TYPE },
      })

      if (!putResponse.ok) {
        throw new Error('서명 이미지 업로드에 실패했습니다. 다시 시도해주세요.')
      }

      return cdnUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : '서명 이미지 업로드에 실패했습니다.'
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

  return { uploadSignatureImage, isLoading, error, reset }
}
