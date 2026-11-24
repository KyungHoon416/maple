# Deployment report

- **Hosting:** Firebase Hosting, project `my-faith-story`, site `my-faith-story` → https://my-faith-story.web.app
- **Status: deployed 2026-11-24** via GitHub Actions run 45431443904 (workflow_dispatch, branch claude/keen-mccarthy-gvfkvu) → success.
- **Deploy path prepared:** `.github/workflows/firebase-hosting.yml` deploys the prebuilt `hosting/` folder on every push that changes it (branches `main`, `claude/keen-mccarthy-gvfkvu`) or on manual run. Needs the repository secret `FIREBASE_SERVICE_ACCOUNT_MY_FAITH_STORY` (service-account JSON from Firebase console → Project settings → Service accounts → Generate new private key).
- **Manual alternative (on a computer with Node):** `npm i -g firebase-tools && firebase login && firebase deploy --only hosting`
- **Build:** `npm run build:hosting` → `hosting/` (index.html, assets/characters/*.webp, og/*.jpg 1200×630, share/<id>-e<n>.html ×214). Static files only; no rewrites needed (hash routing in the app). `cleanUrls` serves `/share/<slug>`.
- **Link previews:** each `/share/<slug>` page has Open Graph tags (title = character + event, image = `/og/<characterId>.jpg`) and redirects people to `/#share-<slug>`. KakaoTalk reads these tags without a Kakao developer app. Kakao caches previews; after changing an image, use Kakao's cache-reset tool or wait.
- **Verified from this container (2026-11-24):** `/` 200 (211 KB), `/share/nt-peter-e2` 200 with og:title/og:image/og:url, `/og/nt-peter.jpg` 200 image/jpeg, `/og/default.jpg` 200, `/assets/characters/nt-peter.webp` 200 image/webp, unknown `/share/...` 404. Headless Chromium (iPhone 13 emulation) on the live site: share link redirects to the in-app character page; 12 questions with auto-advance → card reveal → result card rendered; 0 page errors. Screenshot: `docs/screenshots/live-m390-result.png`.
- **Not verified:** the actual preview card inside KakaoTalk/iMessage, real iOS/Android devices.
