// 인쇄용 HTML 문서를 여는 공용 함수.
//
// [BUGFIX] 이전에는 window.open(url, '_blank', 'noopener,noreferrer') 를 썼는데,
// 'noopener' 를 지정하면 브라우저 사양상 window.open 이 **null 을 반환**한다.
// 그래서 탭은 열리는데(about:blank) 문서를 쓰지 못했고, 코드는 "팝업 차단"으로 오해해 알림을 띄웠다.
// 새 창 대신 숨은 iframe 에 문서를 쓰고 그 iframe 을 인쇄한다 — 팝업 차단과 무관하고 탭도 늘지 않는다.
function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function printHtmlDocument(html: string): void {
  // iOS Safari는 숨은 iframe의 print()를 무시하거나 빈 페이지를 내는 경우가 있다.
  // 사용자 클릭 직후이므로 팝업 허용 범위 안이고, noopener 없이 열면 window 참조가 돌아온다.
  // iOS는 인쇄 대신 "공유 → PDF 저장"을 쓰는 게 일반적이라 자동 print() 도 호출하지 않는다.
  if (isIOS()) {
    const win = window.open('', '_blank')
    if (win) {
      win.document.open()
      win.document.write(html.replace(/<script>[\s\S]*?window\.print\(\)[\s\S]*?<\/script>/g, ''))
      win.document.close()
      return
    }
    // 팝업이 막혔으면 아래 iframe 경로로 계속 진행
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe)
    window.alert('PDF 문서를 만들 수 없습니다. 브라우저를 최신으로 업데이트한 뒤 다시 시도해 주세요.')
    return
  }

  // 문서 안의 자동 print() 스크립트는 제거하고 여기서 직접 호출한다(중복 대화상자 방지)
  const stripped = html.replace(/<script>[\s\S]*?window\.print\(\)[\s\S]*?<\/script>/g, '')
  doc.open()
  doc.write(stripped)
  doc.close()

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }, 1000)
  }
  const win = iframe.contentWindow
  win.addEventListener('afterprint', cleanup, { once: true })
  // 폰트·이미지 로드 후 인쇄
  const start = () => {
    try {
      win.focus()
      win.print()
    } catch {
      cleanup()
    }
  }
  if (doc.readyState === 'complete') window.setTimeout(start, 150)
  else win.addEventListener('load', () => window.setTimeout(start, 150), { once: true })
}
