# Implementation status — 2026-11-24

## 완료 (실행·검증됨)
- 데이터: 인물 100(구약 50/신약 50), 사건 프로필 251, 특기 34, 복합 규칙 6, 템플릿 — `npm run validate:data` OK
- 엔진/희귀도: 순수 함수, 정적 인덱스(시그니처 키 44개: N 13 · R 7 · SR 12 · SSR 12)
- 테스트: `npm test` 10/10, `npm run test:exhaustive` 실패 0, `npm run test:e2e` 65/65 (Playwright Chromium, headless)
- 빌드: `dist/index.html`(Artifact), `dist/standalone.html`(정적 호스팅) 약 185 KB
- UI 전 화면, PNG/ZIP 저장, 공유 fallback, 세션 복원/초기화, reduced-motion, 키보드/스와이프

## 미완료 / 차단
- 인물·사건 일러스트 **0장 생성**. 모두 코드로 그린 임시 이미지. 제작 큐 271건(`ASSET_GENERATION_QUEUE.csv`)
- 사건 프로필 251개 (목표 약 300 미달)
- 대표 후보 81명 중 실제 4,096 조합에서 대표로 나오는 인물 38명 (분석은 QA_REPORT.md)
- 콘텐츠·신학 검수: 미실시 (모든 항목 draft)
- 공개 배포: 미실시 (호스팅 계정·승인 없음). Artifact 링크는 개인 비공개 미리보기
- 카카오 공유: JS 키·도메인 미설정 → 소개 문구 복사로 대체
- 실기기 iOS Safari / Android Chrome: 미검증

## 재현 명령
`npm ci && npm run qa`
