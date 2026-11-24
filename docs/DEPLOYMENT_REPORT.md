# Deployment report

- **Hosting:** Firebase Hosting, project `my-faith-story`, site `my-faith-story` → https://my-faith-story.web.app
- **Status: not deployed yet.** This container has no Google/Firebase credentials, so `firebase deploy` was not run and the URL has not been checked.
- **Deploy path prepared:** `.github/workflows/firebase-hosting.yml` deploys the prebuilt `hosting/` folder on every push that changes it (branches `main`, `claude/keen-mccarthy-gvfkvu`) or on manual run. Needs the repository secret `FIREBASE_SERVICE_ACCOUNT_MY_FAITH_STORY` (service-account JSON from Firebase console → Project settings → Service accounts → Generate new private key).
- **Manual alternative (on a computer with Node):** `npm i -g firebase-tools && firebase login && firebase deploy --only hosting`
- **Build:** `npm run build:hosting` → `hosting/` (index.html, assets/characters/*.webp, og/*.jpg 1200×630, share/<id>-e<n>.html ×214). Static files only; no rewrites needed (hash routing in the app). `cleanUrls` serves `/share/<slug>`.
- **Link previews:** each `/share/<slug>` page has Open Graph tags (title = character + event, image = `/og/<characterId>.jpg`) and redirects people to `/#share-<slug>`. KakaoTalk reads these tags without a Kakao developer app. Kakao caches previews; after changing an image, use Kakao's cache-reset tool or wait.
- **Not verified yet:** live HTTP status, OG preview in KakaoTalk/iMessage, mobile devices. Check after the first deploy.
