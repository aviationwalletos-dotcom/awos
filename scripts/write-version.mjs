// 빌드 결과에 배포 식별 파일(dist/version.json)을 남긴다.
// Netlify 는 빌드 시 COMMIT_REF 환경변수로 커밋 SHA 를 준다. E2E 워크플로는 이 파일을 폴링해
// "지금 사이트에 올라간 커밋 = 테스트할 커밋"이 된 뒤에만 테스트를 시작한다(배포 전 실행 방지).
import { mkdirSync, writeFileSync } from 'node:fs'

const commit = process.env.COMMIT_REF || process.env.GITHUB_SHA || 'dev'
mkdirSync('dist', { recursive: true })
writeFileSync('dist/version.json', JSON.stringify({ commit, builtAt: new Date().toISOString() }, null, 2))
console.log(`[version] dist/version.json → ${commit}`)
