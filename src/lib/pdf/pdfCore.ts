// PDF 직접 생성 엔진. 브라우저 인쇄 대화상자에 기대지 않으므로 iOS Safari·홈 화면 앱·네이티브 앱에서 동일하게 동작한다.
//
// 용량 전략:
//   - pdf-lib·fontkit 은 이 모듈을 dynamic import 하는 곳에서만 로드된다(초기 번들 0).
//   - 한글 폰트는 KS X 1001 완성형 2,350자 + 라틴·기호로 서브셋한 /fonts/awos-kr.ttf (TTF).
//     최초 1회만 내려받고 메모리·서비스워커에 캐시된다. pdf-lib 가 다시 문서에 쓰인 글자만 서브셋해 넣으므로
//     결과 PDF 는 수십 KB 수준이다.
//   - 완성형 밖의 희귀 한글(예: 이름의 '뷁')은 폰트에 없으면 '□' 로 대체된다.

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'

const PT = 72 / 25.4 // mm → pt
export const A4_LANDSCAPE: [number, number] = [297 * PT, 210 * PT]

let fontBytesCache: Promise<ArrayBuffer> | null = null
async function loadKoreanFont(): Promise<ArrayBuffer> {
  if (!fontBytesCache) {
    fontBytesCache = fetch('/fonts/awos-kr.ttf').then((r) => {
      if (!r.ok) throw new Error('한글 폰트를 불러오지 못했습니다.')
      return r.arrayBuffer()
    })
    fontBytesCache.catch(() => {
      fontBytesCache = null
    })
  }
  return fontBytesCache
}

export interface PdfCtx {
  doc: PDFDocument
  font: PDFFont
  page: PDFPage
  pageNo: number
  width: number
  height: number
  margin: number
}

export async function createPdf(title: string): Promise<PdfCtx> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(await loadKoreanFont(), { subset: true })
  doc.setTitle(title)
  doc.setProducer('AWOS')
  doc.setCreator('AWOS Aviation Wallet OS')
  const page = doc.addPage(A4_LANDSCAPE)
  return { doc, font, page, pageNo: 1, width: A4_LANDSCAPE[0], height: A4_LANDSCAPE[1], margin: 9 * PT }
}

export function newPage(ctx: PdfCtx): void {
  ctx.page = ctx.doc.addPage(A4_LANDSCAPE)
  ctx.pageNo += 1
}

/** 폰트에 없는 글자를 □ 로 치환(없으면 pdf-lib 가 throw) */
export function safeText(ctx: PdfCtx, text: string): string {
  let out = ''
  for (const ch of text) {
    try {
      ctx.font.encodeText(ch)
      out += ch
    } catch {
      out += '□'
    }
  }
  return out
}

export function textWidth(ctx: PdfCtx, text: string, size: number): number {
  return ctx.font.widthOfTextAtSize(safeText(ctx, text), size)
}

export interface TextOpts {
  size?: number
  color?: [number, number, number]
  align?: 'left' | 'center' | 'right'
  /** 이 폭을 넘으면 글자 크기를 줄여 맞춘다 */
  fitWidth?: number
  minSize?: number
}

/** y 는 위에서부터(mm 단위가 아니라 pt) — 상단 원점으로 다루기 위해 변환 */
export function drawText(ctx: PdfCtx, text: string, x: number, yTop: number, opts: TextOpts = {}): number {
  const t = safeText(ctx, text)
  let size = opts.size ?? 8
  if (opts.fitWidth) {
    const min = opts.minSize ?? 5
    while (size > min && ctx.font.widthOfTextAtSize(t, size) > opts.fitWidth) size -= 0.25
  }
  const w = ctx.font.widthOfTextAtSize(t, size)
  let x0 = x
  if (opts.align === 'center') x0 = x - w / 2
  else if (opts.align === 'right') x0 = x - w
  const [r, g, b] = opts.color ?? [0.07, 0.07, 0.07]
  ctx.page.drawText(t, { x: x0, y: ctx.height - yTop - size * 0.78, size, font: ctx.font, color: rgb(r, g, b) })
  return size
}

export function drawRect(ctx: PdfCtx, x: number, yTop: number, w: number, h: number, opts: { fill?: [number, number, number]; stroke?: [number, number, number]; lineWidth?: number } = {}): void {
  ctx.page.drawRectangle({
    x,
    y: ctx.height - yTop - h,
    width: w,
    height: h,
    color: opts.fill ? rgb(...opts.fill) : undefined,
    borderColor: opts.stroke ? rgb(...opts.stroke) : undefined,
    borderWidth: opts.stroke ? (opts.lineWidth ?? 0.4) : 0,
  })
}

export function drawLine(ctx: PdfCtx, x1: number, y1Top: number, x2: number, y2Top: number, width = 0.4, color: [number, number, number] = [0.2, 0.2, 0.2]): void {
  ctx.page.drawLine({ start: { x: x1, y: ctx.height - y1Top }, end: { x: x2, y: ctx.height - y2Top }, thickness: width, color: rgb(...color) })
}

/** 셀 안 텍스트 — 세로 중앙, 가로 정렬, 폭 맞춤 */
export function cellText(ctx: PdfCtx, text: string, x: number, yTop: number, w: number, h: number, opts: TextOpts = {}): void {
  const size = opts.size ?? 7
  const pad = 2
  const fitSize = (() => {
    let s = size
    const t = safeText(ctx, text)
    while (s > (opts.minSize ?? 4.5) && ctx.font.widthOfTextAtSize(t, s) > w - pad * 2) s -= 0.25
    return s
  })()
  const align = opts.align ?? 'center'
  const ax = align === 'left' ? x + pad : align === 'right' ? x + w - pad : x + w / 2
  drawText(ctx, text, ax, yTop + (h - fitSize) / 2, { ...opts, size: fitSize, align })
}

/** 여러 줄 헤더 셀(줄바꿈 '\n' 지원) */
export function cellLines(ctx: PdfCtx, lines: string[], x: number, yTop: number, w: number, h: number, size = 6.5): void {
  const lh = size * 1.25
  const total = lines.length * lh
  let y = yTop + (h - total) / 2
  for (const line of lines) {
    cellText(ctx, line, x, y, w, lh, { size })
    y += lh
  }
}

export function mm(v: number): number {
  return v * PT
}

/** 공용: 초안 워터마크 + 페이지 번호 */
export function drawDraftBadge(ctx: PdfCtx): void {
  const label = '초 안 · 발급기관 확인 전'
  const size = 8
  const w = textWidth(ctx, label, size) + 10
  const x = ctx.width - ctx.margin - w
  const y = ctx.margin - 2
  drawRect(ctx, x, y, w, 13, { stroke: [0.72, 0.11, 0.11], lineWidth: 0.8 })
  drawText(ctx, label, x + w / 2, y + 2.5, { size, color: [0.72, 0.11, 0.11], align: 'center' })
}

export function drawPageNo(ctx: PdfCtx): void {
  drawText(ctx, `${ctx.pageNo}`, ctx.width / 2, ctx.height - ctx.margin + 1, { size: 7, color: [0.4, 0.4, 0.4], align: 'center' })
}
