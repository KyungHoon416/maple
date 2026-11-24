# MY FAITH STORY — 나의 믿음은 누구를 닮았을까?

12개의 A/B 질문으로 지금의 나와 닮은 성경 속 장면을 찾아 주는 **로그인 없는 정적 웹앱**입니다. 성경 인물 트레이딩 카드(N/R/SR/SSR), 6축 레이더, TOP3, 카드뉴스 7장(PNG/ZIP)을 제공합니다.

## 실행
```bash
npm ci
npm run qa          # rarity 생성 → 데이터 검증 → 단위 → 4,096 전수 → 빌드 → E2E
```
빌드 산출물:
- `dist/index.html` — Claude Artifact용 단일 파일 (문서 래퍼 없음)
- `dist/standalone.html` — 일반 정적 호스팅용 단일 HTML (`index.html`로 이름을 바꿔 업로드) + `dist/assets/characters/*.webp` 초상 25장 (같이 업로드)

로컬 확인: `npx serve dist` 후 `/standalone.html` 열기 (또는 파일을 브라우저로 직접 열기).

## 배포 — Firebase Hosting (my-faith-story)
`npm run build:hosting`으로 `hosting/`을 만들고, GitHub Actions(`.github/workflows/firebase-hosting.yml`)가 배포해요. 저장소 시크릿 `FIREBASE_SERVICE_ACCOUNT_MY_FAITH_STORY`가 필요해요. 자세한 내용은 `docs/DEPLOYMENT_REPORT.md`.

### 기타 호스팅 (참고)
정적 파일 하나라 어느 호스팅이든 가능합니다. 해시 라우팅(`#result`)이라 SPA fallback 설정이 필요 없습니다.
- Cloudflare Pages: 빌드 명령 `npm run build`, 출력 디렉터리 `dist` (standalone.html → index.html로 복사하는 단계 추가)
- Netlify: `netlify.toml` 포함
공개 URL을 얻으면 `src/app.js`의 `PUBLIC_BASE_URL`을 채워야 소개 링크 복사에 URL이 붙습니다.

## 구조
- `src/data.js` 문항·가중치·인물 100명·사건 251개·특기·규칙·템플릿
- `src/engine.js` 매칭/특기/등급 순수 함수, `src/rarity-index.js` 생성물
- `src/render.js` 카드·카드뉴스·임시 일러스트 캔버스 렌더러 (미리보기와 저장 이미지 동일)
- `src/app.js` 해시 라우터와 화면, `src/style.css`
- `scripts/` 검증·전수 테스트·희귀도·빌드·문서 생성, `tests/` 단위·E2E
- `docs/` 명세·QA·배포 보고서, 스크린샷, 샘플 PNG/ZIP

원래 명세는 React+Vite를 권장하지만, 이번 산출물은 Claude Artifact 한 파일로 동작해야 해서 의존성 없는 바닐라 JS로 구현했습니다(빌드 스크립트가 하나로 묶음).
