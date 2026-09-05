// 아주 오래된 브라우저(ES 모듈 미지원: iOS 10 이하, 구형 안드로이드 WebView 등)에서만 실행된다(nomodule).
// 이런 환경에선 앱 번들이 문법 오류로 아예 안 뜨므로, 빈 화면 대신 안내를 보여준다.
(function () {
  var root = document.getElementById('root') || document.body
  root.innerHTML =
    '<div style="font-family:system-ui,sans-serif;background:#05070d;color:#f2f5fa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">' +
    '<div style="max-width:420px"><h1 style="font-size:20px;margin:0 0 12px">브라우저 업데이트가 필요해요</h1>' +
    '<p style="font-size:14px;line-height:1.6;color:#98a2b6;margin:0">AWOS는 최신 브라우저에서 동작해요. 기기의 소프트웨어를 업데이트하거나, 크롬·사파리 최신 버전으로 열어 주세요.</p>' +
    '<p style="font-size:12px;color:#98a2b6;margin:16px 0 0">문의: awos.help@gmail.com</p></div></div>'
})()
