# Deployment report

- **공개 URL: 미발급.** 호스팅 계정·배포 권한·사용자 승인이 없어 공개 배포를 하지 않았다.
- Claude Artifact로 게시함: 소유자에게만 보이는 비공개 페이지(공개 배포 아님). Artifact 안에서는 저장 시 확인창, Web Share·클립보드 일부 제한, 공개 URL을 알 수 없어 공유 링크에 URL을 넣지 않는다.
- 준비물: `dist/standalone.html`(→ `index.html`), `netlify.toml`. 해시 라우팅이라 SPA fallback 불필요.
- OG 메타: 단일 파일 + 해시 라우팅이라 인물별 OG 페이지는 아직 없음. 배포 시 `public/share/<id>-e<n>.html` 정적 페이지 생성 스크립트가 추가로 필요(미구현).
- 카카오: JS 키·도메인 미등록.
- HTTP 상태·이미지·OG 검증: 배포가 없어 미실행.
