// BaaS 동적 게시판(FREE/REVIEW/URL_LINK) API 타입 정의
// 참고: baas-integration skill의 references/dynamic-board.md

export interface BoardSettings {
  allow_comment: boolean
  is_board_enabled: boolean
  require_login: boolean
  allow_attachment: boolean
  categories: Array<{ name: string; values: string[] }> | null
  board_type: string
}

/** 게시글 목록 아이템 — author_id는 포함되지 않는다(작성자는 author_name만 제공). */
export interface BoardPostListItem {
  id: string
  title: string
  content: string | null
  views: number
  author_name: string
  is_hidden: boolean
  created_at: string
  categories: Record<string, string[]> | null
  link_url: string | null
  rating: number | null
}

export interface BoardPostListResponse {
  items: BoardPostListItem[]
  total_count: number
  offset: number
  limit: number
  board_settings: BoardSettings | null
}

export interface BoardAttachment {
  id: number
  file_name: string
  url: string
}

/** 게시글 작성/상세조회 응답 — author_id를 포함한다. */
export interface BoardPostDetail {
  id: string
  board_id: string
  title: string
  content: string
  views: number
  author_id: string
  author_name: string
  created_at: string
  updated_at: string | null
  attachments: BoardAttachment[]
  categories: Record<string, string[]> | null
  link_url: string | null
  rating: number | null
  board_settings?: BoardSettings | null
}

export interface BoardPostCreateRequest {
  title: string
  content: string
  file_ids?: number[]
  is_hidden?: boolean
  categories?: Record<string, string[]>
  rating?: number
}

/** 게시글 수정 요청 — 작성자 본인만 호출 가능(PUT /boards/posts/{post_id}) */
export interface BoardPostUpdateRequest {
  title?: string
  content?: string
  file_ids?: number[]
  rating?: number
}

/** 댓글의 대댓글(1레벨만 지원) */
export interface CommentReply {
  id: string
  post_id: string
  author_id: string
  author_name: string
  parent_id: string
  content: string
  is_hidden: boolean
  created_at: string
  updated_at: string | null
}

/** 게시글 댓글 (대댓글 포함) */
export interface CommentItem {
  id: string
  post_id: string
  author_id: string
  author_name: string
  content: string
  is_hidden: boolean
  created_at: string
  updated_at: string | null
  replies: CommentReply[]
}

export interface CommentListResponse {
  items: CommentItem[]
  total_count: number
}

export interface CommentCreateRequest {
  content: string
  parent_id?: string
}
