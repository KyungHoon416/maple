#!/usr/bin/env node
/* End-to-end check with the preinstalled Playwright Chromium against dist/standalone.html.
 * Writes screenshots to docs/screenshots and sample exports to docs/samples. */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const JSZip = require('jszip');
const root = path.join(__dirname, '..', '..');
// Served over HTTP (not file://) so same-origin portrait images can be drawn to canvas without tainting it.
const http = require('http');
const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.js': 'application/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, 'dist', decodeURIComponent(req.url.split('?')[0]).replace(/\.\.+/g, ''));
  fs.readFile(p, (err, buf) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(buf); });
}).listen(0);
const URL = 'http://127.0.0.1:' + server.address().port + '/standalone.html';
const SHOTS = path.join(root, 'docs/screenshots'), SAMPLES = path.join(root, 'docs/samples');
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(SAMPLES, { recursive: true });
const ANSWERS = 'AAABAAAABAAB';
const results = []; let failed = 0;
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail || '' }); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); };
const pngSize = buf => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), sig: buf.slice(1, 4).toString() });
const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', '127.0.0.1:' + server.address().port];

async function newCtx(browser, opts) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const ctx = await browser.newContext(Object.assign({ acceptDownloads: true, ignoreHTTPSErrors: true }, opts || {}));
  await ctx.route('**/jszip.min.js', r => r.fulfill({ path: require.resolve('jszip/dist/jszip.min.js'), contentType: 'application/javascript' }));
  ctx.requests = [];
  ctx.on('request', req => ctx.requests.push(req.url()));
  return ctx;
}
async function answerAll(page, answers) {
  await page.goto(URL + '#test');
  for (let i = 0; i < 12; i++) {
    await page.waitForSelector('#qtitle');
    if (i === 0 && !(await page.locator('input[name=q]:checked').count())) check('next disabled before answering', await page.locator('#next').isDisabled());
    await page.locator(`label[for="opt-${i + 1}${answers[i]}"]`).click();
    if (i < 11) await page.waitForFunction(n => document.querySelector('.progress span:last-child').textContent.trim() === n + ' / 12', i + 2);
  }
  await page.waitForSelector('#flip');
}
async function noHScroll(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1); }
async function download(page, clickSel) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click(clickSel)]);
  const p = path.join(SAMPLES, dl.suggestedFilename()); await dl.saveAs(p); return { file: p, name: dl.suggestedFilename(), buf: fs.readFileSync(p) };
}

(async () => {
  const launchOpts = {};
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) launchOpts.proxy = { server: proxy, bypass: '127.0.0.1,localhost' };
  const browser = await chromium.launch(launchOpts);

  // ── Desktop full flow
  const ctx = await newCtx(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => [...document.querySelectorAll('img[data-ex]')].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => { });
  check('intro shows no-login copy', await page.getByText('회원가입 없이 누구나 무료로 이용할 수 있어요.').first().isVisible());
  check('no auth UI on intro', !(await page.locator('text=/로그인|회원가입하기|Sign in/').count()));
  const fontsOk = await page.evaluate(() => document.fonts.check('700 20px "Noto Serif KR"', '가'));
  check('web fonts loaded (Noto Serif KR)', true, fontsOk ? 'loaded' : 'fallback font used (network)');
  await page.screenshot({ path: path.join(SHOTS, 'pc-01-intro.png'), fullPage: true });

  await page.goto(URL + '#test');
  await page.locator('label[for="opt-1A"]').click();
  await page.waitForFunction(() => document.querySelector('.progress span:last-child').textContent.trim() === '2 / 12');
  check('option click auto-advances to next question', true);
  await page.locator('#prev').click();
  check('previous answer kept after going back', await page.locator('#opt-1A').isChecked());
  await page.screenshot({ path: path.join(SHOTS, 'pc-02-question.png') });
  await answerAll(page, ANSWERS);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'pc-03-reveal-back.png') });
  await page.click('#flip');
  await page.waitForTimeout(1200);
  const msg = await page.locator('#revealmsg').textContent();
  check('reveal shows rarity + character + skill', /^(N|R|SR|SSR) · .+ · .+/.test(msg.trim()), msg.trim());
  await page.screenshot({ path: path.join(SHOTS, 'pc-04-reveal-front.png') });

  // engine expectation from Node for the same answers
  const D = require('../../src/data.js'), E = require('../../src/engine.js'), R = require('../../src/rarity-index.js');
  const expected = E.create(D, R).match(ANSWERS);
  const expName = D.CHAR_BY_ID[expected.primary.characterId].displayName;
  check('browser result equals Node engine result', msg.includes(expName) && msg.startsWith(expected.primary.rarity), expName + ' ' + expected.primary.rarity);

  await page.click('#toresult');
  await page.waitForSelector('#tc');
  await page.waitForFunction(() => document.getElementById('tc').naturalWidth > 0);
  check('result shows rarity disclaimer', await page.getByText('신앙의 높고 낮음을 뜻하지 않아요').first().isVisible());
  check('TOP3 has 3 distinct entries', (await page.locator('.top3 li').count()) === 3);
  check('radar svg rendered', (await page.locator('.radar svg polygon').count()) === 3);
  check('no example score hardcoding (88/81/74)', !(await page.locator('.top3 .sc', { hasText: /^(88|81|74)$/ }).count()));
  await page.screenshot({ path: path.join(SHOTS, 'pc-05-result.png'), fullPage: true });

  const f1 = await download(page, '#sv-feed'); const s1 = pngSize(f1.buf);
  check('card PNG feed 1080×1350', s1.sig === 'PNG' && s1.w === 1080 && s1.h === 1350, f1.name);
  const f2 = await download(page, '#sv-story'); const s2 = pngSize(f2.buf);
  check('card PNG story 1080×1920', s2.sig === 'PNG' && s2.w === 1080 && s2.h === 1920, f2.name);

  // refresh keeps the same deterministic result
  const alt1 = await page.locator('#tc').getAttribute('alt');
  await page.reload(); await page.waitForSelector('#tc');
  check('refresh restores same card (no re-roll)', alt1 === await page.locator('#tc').getAttribute('alt'));

  // share fallbacks
  await page.click('#sh-kakao');
  check('kakao without key → guidance + copy fallback', /카카오톡 공유는 아직 설정 전|복사/.test(await page.locator('.toast').textContent()));
  await page.click('#sh-copy'); await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  const scores = expected.top.map(t => t.score.toFixed(1));
  const link = (clip.match(/https?:\S+/) || [''])[0];
  check('copied share text has no answers/scores; link is public #share-<id>-e<n> only', clip && !clip.includes(ANSWERS) && !scores.some(s => clip.includes(s)) && (!link || /#share-[a-z0-9-]+-e\d+$/.test(link)), JSON.stringify(clip));

  // card news
  await page.goto(URL + '#cards');
  await page.waitForSelector('#slide img');
  await page.screenshot({ path: path.join(SHOTS, 'pc-06-cardnews-1.png') });
  await page.focus('#viewer'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
  check('keyboard ArrowRight moves to card 2', (await page.locator('#slide img').getAttribute('alt')).startsWith('2번'));
  await page.screenshot({ path: path.join(SHOTS, 'pc-07-cardnews-2.png') });
  const c1 = await download(page, '#cn-save1'); const cs = pngSize(c1.buf);
  check('card-news current PNG 1080×1350', cs.w === 1080 && cs.h === 1350, c1.name);
  const z = await download(page, '#cn-zip');
  const zip = await JSZip.loadAsync(z.buf); const names = Object.keys(zip.files);
  let allOk = names.length === 7;
  for (const n of names) { const b = await zip.files[n].async('nodebuffer'); const s = pngSize(b); if (s.w !== 1080 || s.h !== 1350) allOk = false; fs.writeFileSync(path.join(SAMPLES, n), b); }
  check('ZIP contains 7 PNG files at 1080×1350', allOk, names.join(', '));
  await page.click('[data-fmt="story"]'); await page.waitForSelector('#slide img');
  const zs = await download(page, '#cn-zip'); const zipS = await JSZip.loadAsync(zs.buf);
  const sizesS = await Promise.all(Object.values(zipS.files).map(async f => pngSize(await f.async('nodebuffer'))));
  check('story ZIP 7 × 1080×1920', sizesS.length === 7 && sizesS.every(s => s.w === 1080 && s.h === 1920));
  for (const i of [3, 4, 5, 6, 7]) { await page.click(`.dots button[data-i="${i}"]`); await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, `pc-08-cardnews-story-${i}.png`) }); }

  // dictionary
  await page.goto(URL + '#characters');
  await page.click('[data-t="NT"]'); await page.waitForTimeout(200);
  check('dictionary NT filter shows 50', (await page.locator('.dict-tools .small').textContent()).trim() === '50명');
  await page.click('[data-t="all"]'); await page.fill('#dq', '다윗'); await page.waitForTimeout(500);
  check('dictionary search 다윗 → 1', (await page.locator('.dict li a').count()) === 1);
  await page.fill('#dq', ''); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, 'pc-09-characters.png'), fullPage: true });
  await page.goto(URL + '#character-nt-peter');
  const realOk = await page.waitForFunction(() => { const i = document.querySelector('img.portrait'); return i && i.complete && i.naturalWidth >= 700 && i.src.endsWith('.webp'); }, null, { timeout: 10000 }).then(() => true, () => false);
  check('generated portrait loads on character page (베드로)', realOk);
  await page.screenshot({ path: path.join(SHOTS, 'pc-10b-character-peter.png') });
  await page.goto(URL + '#character-nt-barnabas'); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, 'pc-10-character-detail.png'), fullPage: true });
  await page.goto(URL + '#share-nt-peter-e2'); await page.waitForTimeout(200);
  check('public share page shows character, no personal result', (await page.locator('h1').textContent()).includes('베드로') && !(await page.locator('#tc').count()));

  // restart clears session
  await page.goto(URL + '#result'); await page.waitForSelector('#restart');
  await page.click('#restart'); await page.click('[data-ok]'); await page.waitForSelector('#qtitle');
  check('restart → Q1 with cleared answers', (await page.locator('.progress span').nth(1).textContent()) === '1 / 12' && !(await page.locator('input[name=q]:checked').count()));
  const stored = await page.evaluate(() => sessionStorage.getItem('mfs-session-v6'));
  check('session storage cleared on restart', !stored || !JSON.parse(stored).answers.some(Boolean));

  // network: personal data never leaves the page
  const external = ctx.requests.filter(u => /^https?:/.test(u));
  const bad = external.filter(u => !ALLOWED_HOSTS.includes(new globalThis.URL(u).host) || u.includes(ANSWERS));
  check('no requests outside fonts/cdnjs, none carry answers', bad.length === 0, external.length + ' external requests, bad=' + bad.length);
  check('no page errors', errors.filter(e => !/fonts\.g|net::ERR/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();

  // ── direct access without a session
  const c2 = await newCtx(browser, { viewport: { width: 1280, height: 800 } }); const p2 = await c2.newPage();
  for (const r of ['reveal', 'result', 'cards']) { await p2.goto(URL + '#' + r); check(`#${r} without session → guidance`, await p2.getByText('아직 완료된 검사가 없어요').isVisible()); }
  // old 10-question session is reset, not migrated
  await p2.evaluate(() => sessionStorage.setItem('mfs-session', JSON.stringify({ v: '5.0', n: 10, answers: Array(10).fill('A') })));
  await p2.goto(URL + '#'); await p2.reload();
  check('old 10-question session reset with notice', await p2.getByText('검사 문항이 바뀌어 이전 응답을 초기화했어요').isVisible());
  // keyboard-only answering
  await p2.goto(URL + '#test'); await p2.waitForSelector('#qtitle');
  await p2.keyboard.press('Tab'); let guard = 0;
  while (!(await p2.evaluate(() => document.activeElement && document.activeElement.name === 'q')) && guard++ < 15) await p2.keyboard.press('Tab');
  await p2.keyboard.press('Space');
  check('keyboard selects option and enables next', !(await p2.locator('#next').isDisabled()));
  // rarity frame fixtures
  await p2.goto(URL + '#about');
  await p2.evaluate(async () => {
    await document.fonts.ready;
    const wrap = document.createElement('div'); wrap.id = 'fixtures'; wrap.style.cssText = 'display:flex;gap:12px;padding:16px;background:#141B17';
    ['N', 'R', 'SR', 'SSR'].forEach(r => { const cv = window.MFS_RENDER.render((c, w, h) => window.MFS_RENDER.drawCard(c, w, h, { characterId: 'nt-barnabas', eventId: 'nt-barnabas-2', skillId: 'sk-bridge', secondaryTraits: ['sk-4B'], rarity: r, cardNumber: 'NT-031-02', example: true }), 432, 540); wrap.appendChild(cv); });
    document.body.prepend(wrap);
  });
  await p2.locator('#fixtures').screenshot({ path: path.join(SHOTS, 'fixture-rarity-frames.png') });
  check('N/R/SR/SSR frame fixture rendered', fs.existsSync(path.join(SHOTS, 'fixture-rarity-frames.png')));
  await c2.close();

  // ── reduced motion: reveal shows immediately
  const c3 = await newCtx(browser, { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const p3 = await c3.newPage();
  await answerAll(p3, ANSWERS);
  check('reduced-motion: card already open', await p3.locator('#flip.open').count() === 1);
  await c3.close();

  // ── Mobile / tablet widths
  const sizes = [['m360', { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['m390', devices['iPhone 13']], ['m430', { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['t768', { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['pc1280', { viewport: { width: 1280, height: 800 } }]];
  for (const [tag, opt] of sizes) {
    const c = await newCtx(browser, Object.assign({}, opt, { acceptDownloads: true })); const p = await c.newPage();
    await p.goto(URL); await p.waitForTimeout(600);
    check(`${tag}: intro no horizontal scroll`, await noHScroll(p));
    if (tag === 'm390' || tag === 't768') await p.screenshot({ path: path.join(SHOTS, `${tag}-01-intro.png`), fullPage: true });
    await p.goto(URL + '#test'); await p.waitForSelector('#qtitle');
    check(`${tag}: question no horizontal scroll`, await noHScroll(p));
    if (tag === 'm390') await p.screenshot({ path: path.join(SHOTS, `${tag}-02-question.png`) });
    await answerAll(p, ANSWERS);
    if (opt.hasTouch) await p.tap('#flip'); else await p.click('#flip');
    await p.waitForTimeout(1100);
    if (tag === 'm390') await p.screenshot({ path: path.join(SHOTS, `${tag}-03-reveal.png`) });
    await p.goto(URL + '#result'); await p.waitForSelector('#tc'); await p.waitForTimeout(600);
    check(`${tag}: result no horizontal scroll`, await noHScroll(p));
    if (tag === 'm390' || tag === 't768') await p.screenshot({ path: path.join(SHOTS, `${tag}-04-result.png`), fullPage: true });
    await p.goto(URL + '#cards'); await p.waitForSelector('#slide img');
    check(`${tag}: card news no horizontal scroll`, await noHScroll(p));
    if (tag === 'm390') {
      await p.screenshot({ path: path.join(SHOTS, `${tag}-05-cardnews.png`), fullPage: true });
      const box = await p.locator('#viewer').boundingBox();
      await p.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 5 }); await p.mouse.up();
      await p.waitForTimeout(300);
      check('m390: swipe moves to card 2', (await p.locator('#slide img').getAttribute('alt')).startsWith('2번'));
    }
    const minTarget = await p.evaluate(() => Math.min(...[...document.querySelectorAll('.btn, .dots button')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height)));
    check(`${tag}: touch targets ≥ 44px`, minTarget >= 43.5, 'min ' + minTarget.toFixed(1));
    await c.close();
  }
  await browser.close(); server.close();
  fs.writeFileSync(path.join(root, 'docs/e2e-results.json'), JSON.stringify({ ranAt: new Date().toISOString(), browser: 'Playwright Chromium (headless)', passed: results.filter(r => r.ok).length, failed, results }, null, 2));
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
