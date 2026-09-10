// 증명서/자격증 사진 → AI 읽기 → 폼 제안값. 서버 함수(/api/read-document)를 거친다(키 노출 방지).
// 사진은 브라우저에서 긴 변 1600px·JPEG 로 줄여 보낸다(전송량·비용 절감). PDF 는 그대로(5MB 이하).

import { getAuthedAccessToken } from '../baas/supabaseTransport'

export type ReadDocumentKind = 'flight_experience' | 'licence'

export interface ReadDocumentResult {
  fields: Record<string, unknown>
  notes: string[]
  confidence: 'high' | 'medium' | 'low'
  /** 오늘 사용 횟수/한도. 서버에 한도가 아직 안 걸려 있으면 enforced=false */
  quota?: { used: number | null; limit: number; enforced: boolean }
}

async function fileToBase64(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** 이미지를 긴 변 maxPx 로 줄인 JPEG Blob 으로 (HEIC 등 브라우저가 못 그리는 형식은 원본 반환) */
async function downscaleImage(file: File, maxPx = 1600, quality = 0.85): Promise<{ blob: Blob; mediaType: string }> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('toBlob')
    return { blob, mediaType: 'image/jpeg' }
  } catch {
    return { blob: file, mediaType: file.type || 'image/jpeg' }
  }
}

export async function readDocumentWithAi(kind: ReadDocumentKind, file: File): Promise<ReadDocumentResult> {
  const token = getAuthedAccessToken()
  if (!token) throw new Error('로그인이 필요해요.')
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const { blob, mediaType } = isPdf ? { blob: file as Blob, mediaType: 'application/pdf' } : await downscaleImage(file)
  if (blob.size > 5 * 1024 * 1024) throw new Error('파일이 너무 커요(5MB 이하). 사진을 다시 찍거나 줄여 주세요.')
  const image = await fileToBase64(blob)
  const res = await fetch('/api/read-document', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, image, mediaType }),
    signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(60_000) : undefined,
  })
  const data = (await res.json().catch(() => ({}))) as Partial<ReadDocumentResult> & { error?: string }
  if (!res.ok) throw new Error(data.error || `AI 읽기에 실패했어요(${res.status}).`)
  return { fields: data.fields ?? {}, notes: data.notes ?? [], confidence: data.confidence ?? 'medium', quota: data.quota }
}

/** 폼(uncontrolled)의 input 값을 이름으로 채운다. 값이 null/undefined 면 건드리지 않는다. 채운 이름 목록을 돌려준다. */
export function fillFormFields(form: HTMLFormElement, values: Record<string, string | number | null | undefined>): string[] {
  const filled: string[] = []
  for (const [name, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    if (!el || !('value' in el)) continue
    el.value = String(value)
    // React 가 값 변화를 알도록 input 이벤트를 흘린다
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    filled.push(name)
  }
  return filled
}

