#!/usr/bin/env node
/* Builds the Firebase Hosting site into hosting/:
 *  - index.html (standalone app + default link-preview tags)
 *  - assets/characters/*.webp (generated portraits)
 *  - og/<characterId>.jpg, og/default.jpg (1200×630 link-preview images, rendered with the app's own renderer)
 *  - share/<characterId>-e<n>.html (static pages whose Open Graph tags crawlers such as KakaoTalk can read;
 *    people are redirected to the in-app public page #share-<id>-e<n>). No personal data anywhere. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const D = require('../src/data.js');
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist'), out = path.join(root, 'hosting');
const SITE = 'https://my-faith-story.web.app';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TITLE = '나의 믿음은 누구를 닮았을까?';
const DESC = '12개의 질문으로 지금의 나와 닮은 성경 인물 카드를 만나 보세요. 회원가입 없이 누구나 무료.';
const ogTags = ({ title, desc, image, url }) => [
  ['og:type', 'website'], ['og:site_name', 'MY FAITH STORY'], ['og:locale', 'ko_KR'], ['og:title', title], ['og:description', desc],
  ['og:image', image], ['og:image:width', '1200'], ['og:image:height', '630'], ['og:url', url],
].map(([p, c]) => `<meta property="${p}" content="${esc(c)}">`).join('\n') +
  `\n<meta name="twitter:card" content="summary_large_image">\n<meta name="description" content="${esc(desc)}">`;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'share'), { recursive: true }); fs.mkdirSync(path.join(out, 'og'), { recursive: true });
fs.cpSync(path.join(dist, 'assets'), path.join(out, 'assets'), { recursive: true });
let index = fs.readFileSync(path.join(dist, 'standalone.html'), 'utf8');
index = index.replace('<meta name="description" content="12개의 질문으로 지금의 나와 닮은 성경 인물 카드를 만나 보세요. 회원가입 없이 누구나 무료.">',
  ogTags({ title: TITLE, desc: DESC, image: SITE + '/og/default.jpg', url: SITE + '/' }));
fs.writeFileSync(path.join(out, 'index.html'), index);

// share pages: every event that can appear in a result (primary/support)
const shareEvents = D.EVENTS.filter(e => e.eligibility === 'primary' || e.eligibility === 'support');
shareEvents.forEach(ev => {
  const ch = D.CHAR_BY_ID[ev.characterId];
  const slug = ch.id + '-e' + ev.index;
  const name = ch.displayName + (ch.distinguishingLabel ? `(${ch.distinguishingLabel})` : '');
  const title = `${name} — ${ev.title} | ${TITLE}`;
  const desc = `${ev.scriptureRefs} · ${ev.factualSummary} 나도 12문항으로 나의 성경 인물 카드를 만나 보세요.`;
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${ogTags({ title, desc, image: `${SITE}/og/${ch.id}.jpg`, url: `${SITE}/share/${slug}` })}
<link rel="canonical" href="${SITE}/share/${slug}">
<meta http-equiv="refresh" content="0; url=/#share-${slug}">
<script>location.replace('/#share-${slug}');</script>
<style>body{margin:0;background:#141B17;color:#F3EBDD;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}a{color:#DCC48A}</style>
</head><body><p>${esc(name)} · ${esc(ev.title)}<br><a href="/#share-${slug}">인물 소개 보기</a> · <a href="/#test">나도 테스트하기</a></p></body></html>
`;
  fs.writeFileSync(path.join(out, 'share', slug + '.html'), html);
});

// OG images rendered in a real browser with the same canvas renderer as the app
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(dist, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': p.endsWith('.webp') ? 'image/webp' : 'text/html; charset=utf-8' }); s.end(b); }); }).listen(0);
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {});
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${srv.address().port}/standalone.html#about`);
  const fontsOk = await page.evaluate(async () => { await Promise.all(['700 70px "Noto Serif KR"', '500 28px "Noto Serif KR"', '400 22px "Noto Sans KR"', '700 30px "Noto Sans KR"', '600 26px "Cinzel"'].map(f => document.fonts.load(f, '가나 MY'))); return document.fonts.check('700 70px "Noto Serif KR"', '가'); });
  if (!fontsOk) console.warn('WARNING: web fonts not loaded; OG images use fallback fonts');
  const ids = [null].concat(D.CHARACTERS.map(c => c.id));
  for (const id of ids) {
    const ev = id && (D.CHAR_BY_ID[id].eventIds.map(e => D.EVENT_BY_ID[e]).find(e => e.eligibility === 'primary') || D.EVENT_BY_ID[D.CHAR_BY_ID[id].eventIds[0]]);
    const dataUrl = await page.evaluate(async ([cid, eid]) => {
      const fan = ['nt-peter', 'ot-daniel', 'ot-david', 'ot-elijah'];
      await window.MFS_RENDER.preload(cid ? [cid] : fan);
      return window.MFS_RENDER.render((c, w, h) => window.MFS_RENDER.drawOG(c, w, h, cid, eid, { fan }), 1200, 630).toDataURL('image/jpeg', 0.86);
    }, [id, ev ? ev.id : null]);
    fs.writeFileSync(path.join(out, 'og', (id || 'default') + '.jpg'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  await browser.close(); srv.close();
  const size = d => fs.readdirSync(d).reduce((a, f) => a + fs.statSync(path.join(d, f)).size, 0);
  console.log(`hosting/: ${shareEvents.length} share pages, ${ids.length} OG images (${(size(path.join(out, 'og')) / 1048576).toFixed(1)} MB), fonts ${fontsOk ? 'ok' : 'fallback'}`);
})().catch(e => { console.error(e); process.exit(1); });
