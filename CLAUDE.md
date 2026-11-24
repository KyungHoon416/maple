# MY FAITH STORY — project rules (v6.0 spec summary)

- Korean self-reflection web app 「나의 믿음은 누구를 닮았을까?」. Static, no backend.
- **Never** add login/sign-up/social login/Firebase Auth/member DB/my page, or ask for name/email/phone/church.
- Answers stay in memory + sessionStorage only. No server, analytics, external AI, logs or URLs carry answers, charts or scores. Share links = public character/event pages only.
- 12 questions, exactly A/B, no right answer. 6 areas × 2 questions, 24 trait tags (6 unmeasured → excluded, not zero).
- 100 characters (OT 50 / NT 50). Jesus/God are never candidates. Negative-event characters (Cain, Judas, Saul, Ananias & Sapphira) are reflection/library only.
- Matching engine is a pure, deterministic function (src/engine.js). No per-option character mapping, no randomness, no LLM.
- Rarity N/R/SR/SSR = design rarity of signatureKey (skill | secondary family | event context) over the 4,096 equal-weight combos. Not faith level, not probability. Never hand out rarity by "good" answers. Regenerate with `npm run generate:rarity` after any data change.
- Never hardcode mock scores (베드로 88 / 다윗 81 / 모세 74).
- Do not claim generated illustrations, human content review, deployment or tests that did not happen. Portraits: 25 generated (public/assets/characters/*.webp, list baked by build), the rest show a placeholder (watercolor landscape + name medallion, labelled 일러스트 준비 중). Add new portraits via scripts/fetch-portraits.sh + WebP conversion, then `npm run build`.
- Quiz option art: 24 dedicated Canva-generated illustrations (anonymous people; public/assets/options/Qnn-X.webp, list baked by build). Canva exports can come back with added text — check every export by eye before use.
- Quiz: tapping an option auto-advances (user request, overrides spec §3).
- Hosting: Firebase project my-faith-story → https://my-faith-story.web.app. `npm run build:hosting` writes hosting/ (committed; CI deploys it). Share links = /share/<id>-e<n> static pages with OG tags. Rebuild hosting/ after any data or portrait change.
- Workflow: `npm run generate:rarity && npm run validate:data && npm test && npm run test:exhaustive && npm run build && npm run test:e2e` (= `npm run qa`).
