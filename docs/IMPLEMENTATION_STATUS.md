# Implementation status — 2026-11-24

## 완료 (실행·검증됨)
- 데이터 v6.1: 인물 100(구약 50/신약 50), 사건 프로필 268 (보강 내역 CONTENT_ENRICHMENT.md), 특기 34, 복합 규칙 6, 템플릿 — `npm run validate:data` OK
- 엔진/희귀도: 순수 함수, 정적 인덱스(시그니처 키 73개: C 4 · U 13 · R 15 · RR 11 · SR 10 · UR 20)
- 테스트: `npm test` 17/17, `npm run test:exhaustive` 실패 0, `npm run test:e2e` 73/73 (Playwright Chromium, headless)
- 빌드: `dist/index.html`(Artifact), `dist/standalone.html`(정적 호스팅) 약 185 KB
- UI 전 화면, PNG/ZIP 저장, 공유 fallback, 세션 복원/초기화, reduced-motion, 키보드/스와이프

- 7일 묵상 플랜 (`src/plan.js`): 단위 테스트 4개, E2E 7개 추가. 상황 유형별 보조 장절 33개는 검수 전

- 소그룹 나눔 가이드 (`src/group.js`, `#group`): 단위 테스트 3개, E2E 3개. 질문 문구는 검수 전
- 카드 공개 흔들림 연출 (reduced-motion 시 꺼짐)

- 카드 등급 6단계(C·U·R·RR·SR·UR) + 특별판(SA·P) + 카드 능력치(6개 영역 성향) — `docs/CARD_RARITY_SPEC.md`

## 미완료 / 차단
- 인물 초상 **51/100장 생성·적용** (Figma generate_image, gemini-3.1-flash-lite-image, 928×1152 → 720×900 WebP). 11/24 25장, 11/25 25장, 11/26 1장. 11/26에 Figma AI 크레딧이 월 한도에 걸려 12/1 09:00(KST) 초기화 후 이어서 생성 예정
- 선택지 전용 일러스트 24/24장 적용 (Canva generate-image → 단일 이미지 디자인 → JPG 내보내기 → `assets-src/options/`, 560×420 WebP). 이름 없는 평범한 사람으로 그려 결과를 암시하지 않음. 여러 장을 한 디자인에 넣으면 Canva가 장식·문구를 추가해서, 한 장씩 처리하고 모든 이미지를 눈으로 확인함 (Q07-B는 문구가 붙어 다시 생성)
- 사건 장면 일러스트 **30장 적용 완료** (Canva generate-image → 16:9 디자인 → JPG 1536×864 → 960×640 WebP, `public/assets/events/`). 4,096 조합 중 대표 결과로 많이 나오는 상위 30개 사건(84.5% 범위) 우선. 결과 화면 '오늘의 말씀', 인물 상세, 카드뉴스 4번 장에 표시되고 SA 특별판이 됨. 예수님·하나님은 인물로 그리지 않음 — 수로보니게 여인 초안(예수님이 그려짐)·사마리아 여인 초안(얼굴이 비어 있음)은 버리고 다시 생성. 안나·시므온 장면에는 강보에 싸인 아기가 보임(사용자 확인 대기). 야고보·느헤미야·요시야 장면의 두루마리/편지에는 읽을 수 없는 필기 무늬가 있음. 나머지 사건(약 140개 대표 사건)은 임시 일러스트
- 문항 선택 시 바로 다음 문항으로 이동 (사용자 요청으로 명세 §3 “선택 후 다음 버튼”을 변경)
- 사건 프로필 268개 (목표 약 300 미달 — 근거 있는 사건만 추가)
- 대표 후보 80명 중 4,096 조합에서 대표로 나오는 인물 67명 (v6.0 38명), 최다 비율 7.3%
- 콘텐츠·신학 검수: 미실시 (모든 항목 draft)
- 공개 배포: Firebase Hosting https://my-faith-story.web.app (2026-11-24, GitHub Actions). HTTP·OG 태그·라이브 브라우저 흐름 확인. 카카오톡 실제 미리보기는 미확인
- 카카오 공유: JS 키·도메인 미설정 → 공유 패널(문구·링크 복사 + 이미지 저장)로 동작. SDK 경로는 코드만 있고 미검증
- 실기기 iOS Safari / Android Chrome: 미검증

## 재현 명령
`npm ci && npm run qa`
