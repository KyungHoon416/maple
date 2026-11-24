# Implementation status — 2026-11-24

## 완료 (실행·검증됨)
- 데이터 v6.1: 인물 100(구약 50/신약 50), 사건 프로필 268 (보강 내역 CONTENT_ENRICHMENT.md), 특기 34, 복합 규칙 6, 템플릿 — `npm run validate:data` OK
- 엔진/희귀도: 순수 함수, 정적 인덱스(시그니처 키 44개: N 13 · R 7 · SR 12 · SSR 12)
- 테스트: `npm test` 10/10, `npm run test:exhaustive` 실패 0, `npm run test:e2e` 73/73 (Playwright Chromium, headless)
- 빌드: `dist/index.html`(Artifact), `dist/standalone.html`(정적 호스팅) 약 185 KB
- UI 전 화면, PNG/ZIP 저장, 공유 fallback, 세션 복원/초기화, reduced-motion, 키보드/스와이프

## 미완료 / 차단
- 인물 초상 **25/100장 생성·적용** (Figma generate_image, gemini-3.1-flash-lite-image, 928×1152 → 720×900 WebP). 원본 `assets-src/characters/`, 적용본 `public/assets/characters/`. 이후 Figma AI 크레딧 소진(2026-11-25 00:00 UTC 재충전) → 나머지 75명과 사건 장면은 임시 이미지. Canva는 이 환경에서 160×199 미리보기만 받을 수 있어 사용하지 않음
- 문항 선택 시 바로 다음 문항으로 이동 (사용자 요청으로 명세 §3 “선택 후 다음 버튼”을 변경)
- 사건 프로필 268개 (목표 약 300 미달 — 근거 있는 사건만 추가)
- 대표 후보 80명 중 4,096 조합에서 대표로 나오는 인물 67명 (v6.0 38명), 최다 비율 7.3%
- 콘텐츠·신학 검수: 미실시 (모든 항목 draft)
- 공개 배포: 미실시 (호스팅 계정·승인 없음). Artifact 링크는 개인 비공개 미리보기
- 카카오 공유: JS 키·도메인 미설정 → 공유 패널(문구·링크 복사 + 이미지 저장)로 동작. SDK 경로는 코드만 있고 미검증
- 실기기 iOS Safari / Android Chrome: 미검증

## 재현 명령
`npm ci && npm run qa`
