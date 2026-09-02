// 문의 게시글 제목 규약과 파서.
export const INQUIRY_TITLE_PREFIX = '[문의]'

export function buildInquiryTitle(subject: string, userName: string, userId: string): string {
  return `${INQUIRY_TITLE_PREFIX} ${subject} | ${userName} (${userId})`
}

export interface ParsedInquiryTitle {
  subject: string
  userName: string
  userId: string
}

export function parseInquiryTitle(title: string): ParsedInquiryTitle | null {
  if (!title.startsWith(INQUIRY_TITLE_PREFIX)) return null
  const rest = title.slice(INQUIRY_TITLE_PREFIX.length).trim()
  const sep = rest.lastIndexOf('|')
  if (sep === -1) return null
  const subject = rest.slice(0, sep).trim()
  const who = rest.slice(sep + 1).trim()
  const match = /^(.*)\(([^()]+)\)\s*$/.exec(who)
  return { subject, userName: (match?.[1] ?? who).trim(), userId: (match?.[2] ?? '').trim() }
}
