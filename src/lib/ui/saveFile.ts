// 파일 저장 공통 경로. iOS Safari·홈 화면 앱(PWA)에서는 <a download> 가 불안정하므로
// 파일 공유(Web Share API)가 가능하면 공유 시트를 띄운다("파일에 저장"·에어드랍·메일 등).
// 그 외(데스크톱·안드로이드)는 일반 다운로드.
export async function saveBlob(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean }
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  if ((isApple || standalone) && nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      // 사용자가 취소한 경우는 그대로 종료, 그 외엔 다운로드로 폴백
      if ((err as { name?: string })?.name === 'AbortError') return 'shared'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
