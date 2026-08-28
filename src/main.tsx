import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'

import './tailwind.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA: 프로덕션 빌드에서만 서비스 워커를 등록한다(개발 중에는 캐시가 리로드를 방해하므로 제외).
// 등록 실패는 조용히 무시 — 앱 핵심 동작(기록/동기화)과 완전히 무관한 부가 기능이다.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
