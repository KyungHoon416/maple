/* MY FAITH STORY — application shell (hash router, quiz, reveal, result, card news, dictionary).
 * Privacy: answers live only in memory + sessionStorage. No network calls carry answers or results. */
(function () {
  'use strict';
  const D = window.MFS_DATA, RENDER = window.MFS_RENDER;
  const ENG = window.MFS_ENGINE.create(D, window.MFS_RARITY);
  const $app = document.getElementById('app');
  const SKEY = 'mfs-session-v6';
  // Public base URL for share links. Leave empty until a real public deployment exists.
  const PUBLIC_BASE_URL = '';
  const KAKAO_JS_KEY = ''; // VITE_KAKAO_JS_KEY equivalent; not configured in this build.
  const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── utils
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const josa = (word, a, b) => { const c = word.charCodeAt(word.length - 1); if (c < 0xAC00 || c > 0xD7A3) return word + b; return word + ((c - 0xAC00) % 28 ? a : b); };
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }
  function confirmDialog(message, okLabel) {
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'dialog'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = `<div class="panel"><p style="margin-top:0">${esc(message)}</p><div class="row"><button class="btn gold sm" data-ok>${esc(okLabel)}</button><button class="btn sm" data-no>취소</button></div></div>`;
      document.body.appendChild(d); d.querySelector('[data-ok]').focus();
      const done = v => { d.remove(); res(v); };
      d.querySelector('[data-ok]').onclick = () => done(true); d.querySelector('[data-no]').onclick = () => done(false);
      d.addEventListener('keydown', e => { if (e.key === 'Escape') done(false); });
    });
  }
  const charName = ch => ch.displayName + (ch.distinguishingLabel ? `(${ch.distinguishingLabel})` : '');

  // ── session (sessionStorage only; cleared on restart)
  const blank = () => ({ v: D.DATA_VERSION, n: 12, answers: Array(12).fill(null), idx: 0, revealed: false });
  let S = blank(), sessionNotice = '';
  try {
    const raw = sessionStorage.getItem(SKEY) || sessionStorage.getItem('mfs-session');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.v === D.DATA_VERSION && p.n === 12 && Array.isArray(p.answers) && p.answers.length === 12) S = p;
      else { sessionNotice = '검사 문항이 바뀌어 이전 응답을 초기화했어요. 새 12문항으로 다시 시작해 주세요.'; sessionStorage.removeItem('mfs-session'); sessionStorage.removeItem(SKEY); }
    }
  } catch (e) { /* storage unavailable: memory only */ }
  function save() { try { sessionStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* memory only */ } }
  function clearSession() { S = blank(); try { sessionStorage.removeItem(SKEY); } catch (e) { } RESULT = null; }
  const complete = () => S.answers.every(a => a === 'A' || a === 'B');
  let RESULT = null;
  function result() { if (!complete()) return null; if (!RESULT || RESULT.answers !== S.answers.join('')) RESULT = ENG.match(S.answers.join('')); return RESULT; }

  // ── fonts must be ready before canvas text
  let fontsReady = null;
  function ensureFonts() {
    if (fontsReady) return fontsReady;
    const loads = ['700 40px "Noto Serif KR"', '500 40px "Noto Serif KR"', '400 30px "Noto Sans KR"', '500 30px "Noto Sans KR"', '700 30px "Noto Sans KR"', '600 30px "Cinzel"']
      .map(f => (document.fonts && document.fonts.load ? document.fonts.load(f, '가나다 MY FAITH') : Promise.resolve()).catch(() => { }));
    fontsReady = Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 3500))]);
    return fontsReady;
  }

  // ── view model for result + card news
  function cardOf(r) {
    const p = r.primary; if (!p) return null;
    return { characterId: p.characterId, eventId: p.eventId, skillId: p.skillId, secondaryTraits: p.secondaryTraits, rarity: p.rarity, cardNumber: p.cardNumber };
  }
  function view(r) {
    const p = r.primary;
    const ev = p && D.EVENT_BY_ID[p.eventId], ch = p && D.CHAR_BY_ID[p.characterId], sk = p && D.SKILL_BY_ID[p.skillId];
    const ctx = ev ? ev.context : (r.top[0] ? D.EVENT_BY_ID[r.top[0].eventId].context : 'meditate');
    const tpl = D.CONTEXT_TEMPLATES[ctx];
    const evidence = p ? p.matched.map(s => {
      const o = D.OPT[s];
      return `Q${String(o.q).padStart(2, '0')}에서 “${o.text}”를 골랐어요. ${ev.scriptureRefs}에도 ${D.SIGNAL_TEXT[s]} 모습이 기록되어 있어요.`;
    }) : [];
    const order = (p ? p.matched : []).concat(r.signals);
    const actions = [...new Set(order)].slice(0, 3).map(s => D.ACTION_TEXT[s]);
    const top = r.top.map(t => {
      const e = D.EVENT_BY_ID[t.eventId], c = D.CHAR_BY_ID[t.characterId];
      return { characterId: c.id, name: charName(c), eventTitle: e.title, refs: e.scriptureRefs, score: t.score, matched: t.matched,
        why: t.matched.map(s => D.SIGNAL_TEXT[s]).join(', ') + ' 모습이 닮았어요.' };
    });
    return {
      hasCard: !!p, card: cardOf(r), chart: r.chartData, top, evidence, actions,
      name: ch ? charName(ch) : '', skillLabel: sk ? sk.label : '마음을 돌아보는 시간', strength: sk ? sk.description + '이 응답과 본문에서 함께 보여요.' : '이번 응답에서는 근거가 충분한 대표 인물을 정하지 않았어요.',
      headline: ch ? `${josa(ch.displayName, '은', '는')} ‘${ev.title}’ 장면에서 ${sk.description}을 보여 줍니다.` : '',
      event: ev ? { id: ev.id, title: ev.title, refs: ev.scriptureRefs, summary: ev.factualSummary } : null,
      commentary: ev ? `${ev.scriptureRefs} — ${ev.factualSummary} 이 장면은 ${p.matched.map(s => D.SIGNAL_TEXT[s]).join(', ')} 모습으로 오늘의 나를 비추어 볼 수 있게 해요. (서비스 해설)` : '',
      reflection: tpl.q, prayer: tpl.prayer,
    };
  }

  // ── images: cache rendered data URLs
  const imgCache = new Map();
  async function cardURL(card, format) {
    const key = JSON.stringify(card) + format;
    if (imgCache.has(key)) return imgCache.get(key);
    await ensureFonts();
    const [W, H] = format === 'story' ? [1080, 1920] : format === 'thumb' ? [432, 540] : [1080, 1350];
    const url = RENDER.render((c, w, h) => RENDER.drawCard(c, w, h, card), W, H).toDataURL(format === 'thumb' ? 'image/jpeg' : 'image/png', 0.9);
    imgCache.set(key, url); return url;
  }

  // ── downloads: artifact `downloads` capability when available, else <a download> (normal browsers)
  let dlCap = null;
  if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(x => { dlCap = x; }).catch(() => { });
  async function saveBlob(blob, filename) {
    if (dlCap) {
      try { await dlCap.save({ filename, data: blob }); toast('저장했어요: ' + filename); return true; }
      catch (e) { if (e && e.code === 'declined') { toast('저장을 취소했어요.'); return false; } if (e && e.code === 'rate_limited') { toast('잠시 후 다시 시도해 주세요.'); return false; } toast('이 화면에서는 저장할 수 없어요. 브라우저에서 열어 주세요.'); return false; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('저장을 시작했어요: ' + filename);
    return true;
  }
  const slug = r => (r.primary ? r.primary.characterId.replace(/^(ot|nt)-/, '') : 'reflection');

  async function saveCard(format) {
    const r = result(); if (!r || !r.primary) return;
    try {
      await ensureFonts();
      const [W, H] = format === 'story' ? [1080, 1920] : [1080, 1350];
      const blob = await RENDER.toBlob(RENDER.render((c, w, h) => RENDER.drawCard(c, w, h, cardOf(r)), W, H));
      await saveBlob(blob, `my-faith-story-${slug(r)}-card-${format}.png`);
    } catch (e) { toast('이미지를 만들지 못했어요. 다시 시도해 주세요.'); }
  }
  async function slideBlob(r, i, format) {
    await ensureFonts();
    const [W, H] = format === 'story' ? [1080, 1920] : [1080, 1350];
    return RENDER.toBlob(RENDER.render((c, w, h) => RENDER.drawSlide(c, w, h, i, view(r)), W, H));
  }
  let jszipPromise = null;
  function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!jszipPromise) jszipPromise = new Promise((res, rej) => { const s = document.createElement('script'); s.src = JSZIP_URL; s.onload = () => (window.JSZip ? res(window.JSZip) : rej(new Error('jszip'))); s.onerror = () => { jszipPromise = null; rej(new Error('jszip')); }; document.head.appendChild(s); });
    return jszipPromise;
  }

  // ── share (public, non-personal only)
  function publicURL(hash) {
    const base = PUBLIC_BASE_URL || (/^https?:$/.test(location.protocol) && window.top === window ? location.origin + location.pathname : '');
    return base ? base + hash : '';
  }
  function shareText(r) {
    if (!r.primary) return '나의 믿음은 누구를 닮았을까? 12개의 질문으로 지금의 나를 돌아보세요.';
    const ch = D.CHAR_BY_ID[r.primary.characterId], ev = D.EVENT_BY_ID[r.primary.eventId];
    return `[나의 믿음은 누구를 닮았을까?] ${charName(ch)} — ${ev.title} (${ev.scriptureRefs}) · 나도 테스트하기`;
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('복사했어요.'); return true; }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { } ta.remove(); toast(ok ? '복사했어요.' : '복사가 막혀 있어요. 텍스트를 직접 선택해 주세요.'); return ok; }
  }
  async function shareLink(r) {
    const hash = r.primary ? ENG.sharePath(r.primary.characterId, r.primary.eventId) : '#';
    const url = publicURL(hash);
    await copy(url ? shareText(r) + '\n' + url : shareText(r));
    if (!url) toast('공개 URL이 아직 없어 소개 문구만 복사했어요.');
  }
  async function shareNative(r) {
    try {
      const blob = await slideBlob(r, 1, 'feed');
      const file = new File([blob], `my-faith-story-${slug(r)}-01-feed.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: shareText(r) }); return; }
      if (navigator.share) { const url = publicURL(r.primary ? ENG.sharePath(r.primary.characterId, r.primary.eventId) : '#'); await navigator.share({ text: shareText(r), url: url || undefined }); return; }
      toast('이 환경에서는 기기 공유를 지원하지 않아요. 이미지를 저장하거나 링크를 복사해 주세요.');
    } catch (e) { if (e && e.name === 'AbortError') return; toast('공유가 열리지 않았어요. 이미지 저장 또는 링크 복사를 이용해 주세요.'); }
  }
  function shareKakao(r) {
    if (!KAKAO_JS_KEY) { toast('카카오톡 공유는 아직 설정 전이에요. 대신 소개 문구를 복사했어요.'); shareLink(r); return; }
  }

  // ── routing
  const routes = { '': intro, test: quiz, reveal, result: resultPage, cards: cardNews, characters: dictionary, about };
  let current = '';
  function go(h) { if (location.hash === '#' + h) render(); else location.hash = h; }
  function render() {
    const h = location.hash.replace(/^#/, '');
    let fn = routes[h];
    let arg = null;
    if (!fn && h.startsWith('character-')) { fn = characterPage; arg = h.slice(10); }
    if (!fn && h.startsWith('share-')) { fn = sharePage; arg = ENG.parseSharePath(h); }
    if (!fn) fn = intro;
    current = h;
    document.querySelectorAll('.nav a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + (h.startsWith('character-') ? 'characters' : h) ? 'page' : 'false'));
    $app.innerHTML = ''; window.scrollTo(0, 0);
    fn(arg);
    const h1 = $app.querySelector('h1, h2'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', render);

  function needResult(where) {
    $app.innerHTML = `<section class="wrap prose"><p class="eyebrow">${esc(where)}</p><h1>아직 완료된 검사가 없어요</h1>
      <p>12개의 질문에 모두 답하면 나의 성경 인물 카드와 결과를 볼 수 있어요. ${S.answers.some(Boolean) ? '진행 중인 검사를 이어서 할 수 있어요.' : ''}</p>
      <div class="row"><a class="btn gold" href="#test">${S.answers.some(Boolean) ? '이어서 검사하기' : '12문항 테스트 시작하기'}</a><a class="btn ghost" href="#">처음으로</a></div></section>`;
  }

  // ── pages
  function intro() {
    const examples = [['nt-martha', 'nt-martha-1', 'sk-11B', 'N'], ['ot-daniel', 'ot-daniel-2', 'sk-steady-knees', 'R'], ['ot-david', 'ot-david-3', 'sk-living-praise', 'SR'], ['nt-peter', 'nt-peter-2', 'sk-mended', 'SSR']];
    $app.innerHTML = `
      <section class="wrap">
        ${sessionNotice ? `<p class="notice" role="status">${esc(sessionNotice)}</p>` : ''}
        <div class="hero">
          <div>
            <p class="eyebrow">My Faith Story</p>
            <h1>나의 믿음은<br>누구를 닮았을까?</h1>
            <div class="rule" aria-hidden="true"></div>
            <p class="lead">12개의 질문으로 지금의 나를 돌아보고, 성경 속 인물의 한 장면과 비교해 보세요.</p>
            <div class="pills">
              <div class="pill">${icon('cards')}<div><b>성경 인물 카드</b><span>100명의 인물 사전과 근거 있는 사건 비교</span></div></div>
              <div class="pill">${icon('swap')}<div><b>간단한 테스트</b><span>12문항, 둘 중 하나 선택. 정답은 없어요</span></div></div>
              <div class="pill">${icon('star')}<div><b>카드 에디션</b><span>N · R · SR · SSR은 특기 조합의 희귀도예요</span></div></div>
            </div>
            <div class="row"><a class="btn gold" href="#test" id="start">${S.answers.some(Boolean) && !complete() ? '이어서 검사하기' : '12문항 테스트 시작하기'} ›</a>${complete() ? '<a class="btn" href="#result">내 결과 다시 보기</a>' : ''}</div>
            <div class="policy"><ul>
              <li>회원가입 없이 누구나 무료로 이용할 수 있어요.</li>
              <li>나의 신앙 응답은 서비스 서버에 저장되지 않아요.</li>
              <li>12개의 질문으로 지금 나의 믿음을 돌아보세요. (예상 2~3분, 기획값)</li>
            </ul></div>
          </div>
          <figure class="fan" aria-label="카드 등급 예시: N, R, SR, SSR 프레임">
            ${examples.map(e => `<img class="tc-mini" data-ex="${e.join('|')}" alt="${esc(D.CHAR_BY_ID[e[0]].displayName)} 예시 카드, ${e[3]} 프레임" width="432" height="540">`).join('')}
            <figcaption>예시 카드 · 실제 결과는 응답과 본문 근거로 정해져요</figcaption>
          </figure>
        </div>
        <div class="steps panel" style="padding:18px">
          <div><h2 style="font-size:22px">어떻게 진행되나요?</h2><p class="muted small" style="margin:6px 0 0">간단한 4단계로 나의 성경 인물 카드를 만나 보세요.</p></div>
          <div class="step"><b><span class="n">1</span>12문항 선택</b><p>둘 중 지금의 나와 더 가까운 쪽을 골라요.</p></div>
          <div class="step"><b><span class="n">2</span>사건 비교</b><p>약 250개 사건 프로필과 응답을 비교해요.</p></div>
          <div class="step"><b><span class="n">3</span>카드 공개</b><p>카드를 뒤집어 인물·특기·에디션을 확인해요.</p></div>
          <div class="step"><b><span class="n">4</span>결과 · 저장</b><p>차트, TOP3, 카드뉴스 7장을 저장하고 나눠요.</p></div>
        </div>
        <div class="panel row" style="justify-content:space-between;margin-bottom:24px">
          <div><h2 style="font-size:22px">총 100명의 성경 인물</h2><p class="muted" style="margin:4px 0 0">구약 50명 + 신약 50명. 대표 결과로 나올 수 있는 인물은 근거가 충분한 ${D.CHARACTERS.filter(c => c.eligibleForPrimary).length}명이에요.</p></div>
          <a class="btn" href="#characters">성경 인물 사전 둘러보기 ›</a>
        </div>
      </section>`;
    ensureFonts().then(() => {
      $app.querySelectorAll('img[data-ex]').forEach(async img => {
        const [c, e, s, rar] = img.dataset.ex.split('|');
        img.src = await cardURL({ characterId: c, eventId: e, skillId: s, secondaryTraits: [], rarity: rar, cardNumber: D.CHAR_BY_ID[c].cardCode + '-' + e.split('-').pop().padStart(2, '0'), example: true }, 'thumb');
      });
    });
  }
  function icon(kind) {
    const p = { cards: '<rect x="4" y="6" width="14" height="20" rx="3"/><path d="M10 4h12a3 3 0 0 1 3 3v17"/>', swap: '<circle cx="16" cy="16" r="12"/><path d="M10 13h12l-3-3M22 19H10l3 3"/>', star: '<path d="M16 3l3 10 10 3-10 3-3 10-3-10-10-3 10-3z"/>' }[kind];
    return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#DCC48A" stroke-width="1.6" aria-hidden="true">${p}</svg>`;
  }

  const optArt = new Map();
  function quiz() {
    if (complete() && S.idx >= 12) S.idx = 11;
    const i = Math.max(0, Math.min(11, S.idx || 0)); const q = D.QUESTIONS[i];
    const answered = S.answers.filter(Boolean).length;
    $app.innerHTML = `
      <section class="wrap"><div class="quiz">
        <p class="eyebrow" style="text-align:center">둘 중 하나 고르기 · 12문항</p>
        <div class="progress"><span>성경 인물 카드 테스트</span><span aria-hidden="true">${i + 1} / 12</span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="12" aria-valuenow="${answered}" aria-label="응답한 문항 ${answered}개 / 12개"><i style="width:${Math.max(4, (answered / 12) * 100)}%"></i></div>
        <div class="qtag"><span>Q${i + 1}</span></div>
        <h2 id="qtitle">${esc(q.prompt)}</h2>
        <p class="sub">정답은 없어요. 최근 4주 동안의 나와 더 가까운 모습을 골라 주세요.</p>
        <fieldset class="opts" aria-labelledby="qtitle">
          <legend class="sr-only">${i + 1}번 문항 선택지</legend>
          ${q.options.map(o => `
            <label class="opt" for="opt-${o.id}">
              <input type="radio" name="q" id="opt-${o.id}" value="${o.key}" ${S.answers[i] === o.key ? 'checked' : ''}>
              <span class="art" aria-hidden="true"><img alt="" data-art="${q.id}-${o.key}"></span>
              <span><span class="k">${o.key}</span><br><span class="t">${esc(o.text)}</span></span>
              <span class="dot" aria-hidden="true"></span>
            </label>`).join('')}
        </fieldset>
        <div class="hint"><span aria-hidden="true">${icon('star')}</span><span><b>정답은 없어요!</b> 실제 경험이 없다면 평소의 반응과 더 가까운 쪽을 골라 주세요.</span></div>
        <p class="sr-only" id="needmsg" aria-live="polite"></p>
        <div class="qnav">
          <button class="btn" id="prev" ${i === 0 ? 'disabled' : ''}>‹ 이전</button>
          <button class="btn gold" id="next" ${S.answers[i] ? '' : 'disabled'} aria-describedby="needmsg">${i === 11 ? '결과 카드 만들기' : '다음 질문'} ›</button>
        </div>
        <p class="small muted" style="text-align:center;margin-top:18px">검사를 중간에 나가도 이 브라우저 탭에서는 이어서 할 수 있어요. 탭을 닫으면 응답이 지워져요.</p>
      </div></section>`;
    $app.querySelectorAll('img[data-art]').forEach(img => {
      const k = img.dataset.art; if (!optArt.has(k)) optArt.set(k, RENDER.sceneURL('opt-' + k, 224, 192)); img.src = optArt.get(k);
    });
    $app.querySelectorAll('input[name=q]').forEach(inp => inp.addEventListener('change', () => {
      S.answers[i] = inp.value; RESULT = null; S.revealed = false; save();
      const nx = document.getElementById('next'); nx.disabled = false;
      const bar = $app.querySelector('.bar'); const n = S.answers.filter(Boolean).length;
      bar.setAttribute('aria-valuenow', n); bar.setAttribute('aria-label', `응답한 문항 ${n}개 / 12개`); bar.querySelector('i').style.width = Math.max(4, n / 12 * 100) + '%';
    }));
    document.getElementById('prev').onclick = () => { S.idx = i - 1; save(); render(); };
    let submitting = false;
    document.getElementById('next').onclick = (e) => {
      if (!S.answers[i]) { document.getElementById('needmsg').textContent = '선택지를 하나 골라 주세요.'; return; }
      if (i < 11) { S.idx = i + 1; save(); render(); return; }
      if (submitting) return; submitting = true; e.currentTarget.disabled = true;
      const missing = S.answers.findIndex(a => !a);
      if (missing >= 0) { S.idx = missing; save(); toast(`${missing + 1}번 문항에 아직 답하지 않았어요.`); render(); return; }
      S.revealed = false; save(); go('reveal');
    };
  }

  function reveal() {
    const r = result(); if (!r) return needResult('카드 공개');
    const p = r.primary;
    if (!p) { S.revealed = true; save(); go('result'); return; }
    const ch = D.CHAR_BY_ID[p.characterId], sk = D.SKILL_BY_ID[p.skillId];
    const open = S.revealed || reduceMotion;
    $app.innerHTML = `<section class="wrap reveal"><div>
      <p class="eyebrow">Card Reveal</p>
      <h1 style="font-size:clamp(24px,4vw,34px);margin-top:8px">나의 성경 인물 카드가 준비되었어요</h1>
      <button class="flip ${open ? 'open' : ''}" id="flip" aria-label="${open ? '공개된 카드' : '카드 뒤집기'}">
        <span class="inner"><span class="face back"><img id="back" alt="카드 뒷면"></span><span class="face front"><img id="front" alt=""></span></span>
      </button>
      <p id="revealmsg" aria-live="polite" class="muted">${open ? '' : '카드를 탭하거나 Enter 키를 눌러 뒤집어 보세요.'}</p>
      <div class="row" style="justify-content:center">
        <button class="btn gold" id="flipbtn" ${open ? 'hidden' : ''}>카드 뒤집기</button>
        <a class="btn ${open ? 'gold' : 'ghost'}" href="#result" id="toresult">${open ? '결과 자세히 보기 ›' : '건너뛰기'}</a>
        <button class="btn" id="savecard" ${open ? '' : 'hidden'}>이미지 저장</button>
      </div></div></section>`;
    const back = document.getElementById('back'), front = document.getElementById('front');
    ensureFonts().then(async () => {
      back.src = RENDER.render((c, w, h) => RENDER.drawCardBack(c, w, h), 540, 675).toDataURL('image/jpeg', 0.9);
      front.src = await cardURL(cardOf(r), 'feed');
      front.alt = `${charName(ch)} 카드, ${p.rarity} 에디션, 대표 특기 ${sk.label}, 카드 번호 ${p.cardNumber}`;
      if (open) document.getElementById('revealmsg').textContent = `${p.rarity} · ${charName(ch)} · ${sk.label}`;
    });
    const doFlip = () => {
      if (S.revealed) return; S.revealed = true; save();
      document.getElementById('flip').classList.add('open'); document.getElementById('flip').setAttribute('aria-label', '공개된 카드');
      document.getElementById('revealmsg').textContent = `${p.rarity} · ${charName(ch)} · ${sk.label}`;
      document.getElementById('flipbtn').hidden = true; document.getElementById('savecard').hidden = false;
      const t = document.getElementById('toresult'); t.textContent = '결과 자세히 보기 ›'; t.className = 'btn gold';
    };
    document.getElementById('flip').onclick = doFlip; document.getElementById('flipbtn').onclick = doFlip;
    document.getElementById('toresult').onclick = () => { S.revealed = true; save(); };
    document.getElementById('savecard').onclick = () => saveCard('feed');
  }

  function radarSVG(chart) {
    const cx = 210, cy = 200, R = 140, n = chart.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, k) => [cx + Math.cos(ang(i)) * R * k, cy + Math.sin(ang(i)) * R * k].map(v => v.toFixed(1)).join(',');
    const ring = k => chart.map((_, i) => pt(i, k)).join(' ');
    const poly = chart.map((c, i) => pt(i, 0.12 + 0.88 * c.aShare)).join(' ');
    return `<svg viewBox="0 0 420 410" role="img" aria-labelledby="rt rd"><title id="rt">6개 영역 응답 방향 차트</title>
      <desc id="rd">${esc(chart.map(c => `${c.label}: ${c.aShare === 1 ? 'A 방향 2개' : c.aShare === 0 ? 'B 방향 2개' : 'A와 B 하나씩'}`).join(', '))}</desc>
      <polygon points="${ring(1)}" fill="none" stroke="rgba(243,235,221,.35)" stroke-width="1.5"/>
      <polygon points="${ring(0.5)}" fill="none" stroke="rgba(243,235,221,.18)" stroke-width="1.5"/>
      ${chart.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1).split(',')[0]}" y2="${pt(i, 1).split(',')[1]}" stroke="rgba(243,235,221,.18)"/>`).join('')}
      <polygon points="${poly}" fill="rgba(145,179,154,.42)" stroke="#91B39A" stroke-width="2.5"/>
      ${chart.map((c, i) => { const [x, y] = pt(i, 0.12 + 0.88 * c.aShare).split(','); return `<circle cx="${x}" cy="${y}" r="4.5" fill="#F3EBDD"/>`; }).join('')}
      ${chart.map((c, i) => { const [x, y] = pt(i, 1.2).split(','); return `<text x="${x}" y="${+y + 6}" text-anchor="middle" fill="#F3EBDD" font-family="Noto Serif KR, serif" font-weight="700" font-size="17">${esc(c.label)}</text>`; }).join('')}
      <text x="${cx + 6}" y="${cy - R * 0.5 + 14}" fill="#9FA79C" font-size="11">A·B 반반</text>
    </svg>`;
  }

  function resultPage() {
    const r = result(); if (!r) return needResult('분석 결과');
    S.revealed = true; save();
    const V = view(r), p = r.primary;
    const ch = p && D.CHAR_BY_ID[p.characterId], ev = p && D.EVENT_BY_ID[p.eventId], sk = p && D.SKILL_BY_ID[p.skillId];
    const co = r.coCandidateId ? D.CHAR_BY_ID[r.coCandidateId] : null;
    $app.innerHTML = `
      <section class="wrap result">
        <div class="cardcol">
          ${p ? `<img class="tc" id="tc" alt="${esc(`${charName(ch)} 카드, ${p.rarity} 에디션, 대표 특기 ${sk.label}, 카드 번호 ${p.cardNumber}`)}" width="1080" height="1350">
          <p class="notice small" style="margin:0">카드 등급은 특기 조합의 설계상 희귀도이며, 신앙의 높고 낮음을 뜻하지 않아요. 같은 응답은 언제나 같은 카드가 나와요.</p>
          <div class="row"><button class="btn gold sm" id="sv-feed">카드 저장 (피드 1080×1350)</button><button class="btn sm" id="sv-story">스토리 1080×1920</button></div>`
          : `<div class="panel"><h2>묵상 카드</h2><p class="muted">이번 응답에서는 근거가 충분한 대표 인물을 정하지 않았어요. 아래 묵상 주제로 돌아보세요.</p></div>`}
          <div class="row"><a class="btn sm" href="#cards">카드뉴스 7장 보기 ›</a><button class="btn ghost sm" id="restart">다시 검사하기</button></div>
        </div>
        <div style="display:grid;gap:18px">
          <div class="panel">
            <p class="eyebrow">My Faith Story · 결과</p>
            ${p ? `<h1 style="font-size:clamp(26px,3.6vw,38px);margin:8px 0">지금의 나는 <span style="color:var(--gold)">${esc(charName(ch))}</span>의<br>‘${esc(ev.title)}’ 모습과 닮았어요</h1>
              <div class="row" style="margin-bottom:8px"><span class="chip gold">${esc(p.rarity)} · ${esc(D.FAMILIES[sk.family])}</span><span class="chip">대표 특기 · ${esc(sk.label)}</span><span class="chip">${esc(ev.scriptureRefs)}</span><span class="chip">${esc(p.cardNumber)}</span></div>
              <p style="margin:0">${esc(V.headline)}</p>
              ${co ? `<p class="small muted">${esc(josa(charName(co), '과', '와'))}의 모습과도 거의 같은 정도로 가까워요. 한 사람의 모습으로만 단정하지 않아도 좋아요.</p>` : ''}`
            : `<h1 style="font-size:32px">여러 모습이 함께 보여요</h1>`}
          </div>
          ${p ? `<div class="panel"><div class="sectitle"><h2>왜 이 카드인가요?</h2><span class="small muted">내가 고른 답 × 본문 기록</span></div><ul class="evid">${V.evidence.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
            ${(p.secondaryTraits || []).length ? `<p class="small" style="margin:14px 0 0">보조 특성 · ${p.secondaryTraits.map(id => `<span class="chip">${esc(D.SKILL_BY_ID[id].label)}</span>`).join(' ')}</p>` : ''}</div>` : ''}
          <div class="grid2">
            <div class="panel radar"><div class="sectitle"><h2>나의 신앙 프로필</h2></div>${radarSVG(r.chartData)}
              <p class="small muted">각 영역에서 A 방향(바깥)과 B 방향(안쪽) 중 어느 쪽을 골랐는지 보여 줘요. 높고 낮음의 평가가 아니에요.</p>
              <div class="legend">${r.chartData.map(c => `<div><b>${esc(c.label)}</b><span class="small">${c.picks.map(pk => `${pk.questionId.replace('Q0', 'Q')}-${pk.key}: ${esc(pk.text)}`).join('<br>')}</span></div>`).join('')}</div>
            </div>
            <div class="panel"><div class="sectitle"><h2>나와 닮은 인물 TOP 3</h2></div>
              <ol class="top3" style="padding:0;margin:0">${V.top.map((t, i) => `<li><img alt="" data-portrait="${t.characterId}"><div><b style="font-family:var(--serif)">${i + 1}. <a href="#character-${t.characterId}">${esc(t.name)}</a></b><div class="small muted">${esc(t.eventTitle)} · ${esc(t.refs)}</div><div class="small">${esc(t.why)}</div></div><div class="sc" title="내부 텍스트·행동 유사도 지표">${t.score.toFixed(1)}</div></li>`).join('')}</ol>
              <p class="small muted" style="margin-bottom:0">숫자는 응답과 사건 기록 사이의 내부 유사도 지표(0~100)예요. 확률이나 신앙 점수가 아니에요.</p>
            </div>
          </div>
          <div class="grid2">
            <div class="panel"><div class="sectitle"><h2>강점과 돌아볼 점</h2></div><p><b>${esc(V.skillLabel)}</b> — ${esc(V.strength)}</p><p class="muted" style="margin-bottom:0"><b style="color:var(--sage)">돌아볼 질문</b><br>${esc(V.reflection)}</p></div>
            <div class="panel"><div class="sectitle"><h2>오늘의 말씀</h2>${ev ? `<span class="chip gold">${esc(ev.scriptureRefs)}</span>` : ''}</div>${ev ? `<p><b class="small" style="color:var(--sage)">본문 요약(자체 요약)</b><br>${esc(ev.factualSummary)}</p><p class="small muted" style="margin-bottom:0">서비스 해설 · 이 장면은 ${esc(p.matched.map(s => D.SIGNAL_TEXT[s]).join(', '))} 모습으로 오늘의 나를 비추어 보게 해요. 성경 본문을 직접 찾아 읽어 보세요.</p>` : ''}</div>
          </div>
          <div class="grid2">
            <div class="panel"><div class="sectitle"><h2>오늘의 실천 3가지</h2></div><ol class="acts">${V.actions.map(a => `<li><span>${esc(a)}</span></li>`).join('')}</ol></div>
            <div class="panel"><div class="sectitle"><h2>오늘의 기도</h2></div><p class="prayer" style="margin:0">${esc(V.prayer)}</p></div>
          </div>
          <div class="panel"><div class="sectitle"><h2>저장하고 나누기</h2></div>
            <div class="row"><button class="btn sm" id="sh-native">기기 기본 공유</button><button class="btn sm" id="sh-kakao">카카오톡 공유</button><button class="btn sm" id="sh-copy">소개 링크 복사</button><a class="btn sm" href="#cards">카드뉴스 저장 ›</a></div>
            <p class="small muted" style="margin-bottom:0">공유 링크에는 인물·사건 소개만 담기고, 나의 응답·차트·점수는 담기지 않아요. 개인 카드 이미지는 기기에 저장한 뒤 직접 올려 주세요.</p>
          </div>
        </div>
      </section>`;
    if (p) {
      cardURL(cardOf(r), 'feed').then(u => { const el = document.getElementById('tc'); if (el) el.src = u; });
      document.getElementById('sv-feed').onclick = () => saveCard('feed');
      document.getElementById('sv-story').onclick = () => saveCard('story');
    }
    $app.querySelectorAll('img[data-portrait]').forEach(img => { img.src = RENDER.portraitURL(img.dataset.portrait); });
    document.getElementById('restart').onclick = restart;
    document.getElementById('sh-native').onclick = () => shareNative(r);
    document.getElementById('sh-kakao').onclick = () => shareKakao(r);
    document.getElementById('sh-copy').onclick = () => shareLink(r);
  }
  async function restart() {
    if (await confirmDialog('다시 검사하면 지금의 응답과 결과가 지워져요. 다시 시작할까요?', '응답 지우고 다시 시작')) { clearSession(); toast('응답을 지웠어요.'); go('test'); }
  }

  const SLIDE_TITLES = ['대표 인물 카드', '나의 신앙 프로필', '닮은 인물 TOP 3', '성경 속 사건', '강점과 돌아볼 점', '오늘의 말씀과 실천', '오늘의 기도'];
  let cnIndex = 1, cnFormat = 'feed';
  function cardNews() {
    const r = result(); if (!r) return needResult('카드뉴스');
    const V = view(r);
    $app.innerHTML = `
      <section class="wrap cn">
        <div>
          <div class="sectitle"><h1 style="font-size:28px">나의 카드뉴스 7장</h1>
            <div class="seg" role="group" aria-label="저장 규격"><button data-fmt="feed" aria-pressed="${cnFormat === 'feed'}">피드 4:5</button><button data-fmt="story" aria-pressed="${cnFormat === 'story'}">스토리 9:16</button></div></div>
          <div class="viewer ${cnFormat === 'story' ? 'story' : ''}" id="viewer" tabindex="0" aria-roledescription="carousel" aria-label="카드뉴스. 왼쪽/오른쪽 방향키로 넘겨요">
            <div class="slide" id="slide" aria-live="polite"><div class="loading">카드를 그리는 중…</div></div>
          </div>
          <div class="row" style="justify-content:center;margin-top:12px"><button class="btn sm" id="cn-prev">‹ 이전</button><button class="btn sm" id="cn-next">다음 ›</button></div>
          <div class="dots" role="tablist" aria-label="카드 선택">${SLIDE_TITLES.map((t, i) => `<button role="tab" data-i="${i + 1}" aria-label="${i + 1}번 ${t}" aria-current="${cnIndex === i + 1}"><i></i></button>`).join('')}</div>
          <div class="cn-text panel"><details><summary>이 카드의 텍스트 보기</summary><div id="cntext"></div></details></div>
        </div>
        <aside class="side">
          <div class="panel"><h2 style="font-size:18px;margin-bottom:10px">저장하기</h2>
            <div class="thumbs">${SLIDE_TITLES.map((t, i) => `<label><input type="checkbox" data-pick="${i + 1}" checked aria-label="${i + 1}번 ${t} 선택">${i + 1}</label>`).join('')}</div>
            <div style="display:grid;gap:10px;margin-top:14px">
              <button class="btn gold" id="cn-save1">현재 카드 저장 (PNG)</button>
              <button class="btn" id="cn-savesel">선택한 카드 저장</button>
              <button class="btn" id="cn-zip">전체 7장 ZIP</button>
            </div>
            <p class="small muted" id="cn-status" aria-live="polite" style="margin-bottom:0">${cnFormat === 'story' ? '1080×1920' : '1080×1350'} PNG로 저장돼요. iOS에서는 브라우저 다운로드/파일 앱에 저장될 수 있어요.</p>
          </div>
          <div class="panel"><h2 style="font-size:18px;margin-bottom:10px">공유하기</h2>
            <div style="display:grid;gap:10px"><button class="btn sm" id="cn-native">기기 기본 공유</button><button class="btn sm" id="cn-kakao">카카오톡 공유</button><button class="btn sm" id="cn-copy">소개 링크 복사</button></div>
            <p class="small muted" style="margin-bottom:0">인스타그램은 PNG 저장 후 직접 올려 주세요.</p></div>
          <a class="btn ghost" href="#result">‹ 결과로 돌아가기</a>
        </aside>
      </section>`;
    const slideCache = new Map();
    const draw = (i) => {
      const k = i + cnFormat; if (slideCache.has(k)) return slideCache.get(k);
      const [W, H] = cnFormat === 'story' ? [540, 960] : [540, 675];
      const u = RENDER.render((c, w, h) => RENDER.drawSlide(c, w, h, i, V), W, H).toDataURL('image/jpeg', 0.9);
      slideCache.set(k, u); return u;
    };
    const textFor = i => [
      [V.headline, ...(V.card ? [`등급 ${V.card.rarity} · 카드 번호 ${V.card.cardNumber}`] : [])],
      V.chart.map(c => `${c.label}: ${c.picks.map(p => p.questionId + '-' + p.key + ' ' + p.text).join(' / ')}`),
      V.top.map((t, n) => `${n + 1}. ${t.name} — ${t.eventTitle} (${t.refs}) ${t.why}`),
      V.event ? [V.event.refs, V.event.title, V.event.summary] : [],
      [V.skillLabel, V.strength, ...V.evidence, '돌아볼 질문: ' + V.reflection],
      [V.commentary, ...V.actions.map((a, n) => `${n + 1}. ${a}`)],
      [V.prayer],
    ][i - 1];
    const show = async () => {
      await ensureFonts();
      const sl = document.getElementById('slide'); if (!sl) return;
      sl.innerHTML = `<img draggable="false" alt="${cnIndex}번 카드: ${SLIDE_TITLES[cnIndex - 1]}" src="${draw(cnIndex)}">`;
      document.getElementById('cntext').innerHTML = '<p>' + textFor(cnIndex).map(esc).join('</p><p>') + '</p>';
      $app.querySelectorAll('.dots button').forEach(b => b.setAttribute('aria-current', String(+b.dataset.i === cnIndex)));
      // pre-render neighbours lazily
      setTimeout(() => { [cnIndex - 1, cnIndex + 1].filter(n => n >= 1 && n <= 7).forEach(draw); }, 50);
    };
    const step = d => { cnIndex = Math.min(7, Math.max(1, cnIndex + d)); show(); };
    document.getElementById('cn-prev').onclick = () => step(-1);
    document.getElementById('cn-next').onclick = () => step(1);
    $app.querySelectorAll('.dots button').forEach(b => { b.onclick = () => { cnIndex = +b.dataset.i; show(); }; });
    $app.querySelectorAll('[data-fmt]').forEach(b => { b.onclick = () => { cnFormat = b.dataset.fmt; cardNews(); }; });
    const viewer = document.getElementById('viewer');
    viewer.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { step(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); } });
    let sx = null; viewer.addEventListener('dragstart', e => e.preventDefault()); viewer.addEventListener('pointercancel', () => { sx = null; }); viewer.addEventListener('pointerdown', e => { sx = e.clientX; }); viewer.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); sx = null; });
    const status = m => { const s = document.getElementById('cn-status'); if (s) s.textContent = m; };
    const name = i => `my-faith-story-${slug(r)}-${String(i).padStart(2, '0')}-${cnFormat}.png`;
    let busy = false;
    const guard = fn => async () => { if (busy) return; busy = true; try { await fn(); } catch (e) { status('저장에 실패했어요. 다시 시도해 주세요.'); toast('저장에 실패했어요. 다시 시도해 주세요.'); } finally { busy = false; } };
    document.getElementById('cn-save1').onclick = guard(async () => { status('이미지를 만드는 중…'); await saveBlob(await slideBlob(r, cnIndex, cnFormat), name(cnIndex)); status('저장 요청을 보냈어요.'); });
    document.getElementById('cn-savesel').onclick = guard(async () => {
      const picks = [...$app.querySelectorAll('[data-pick]:checked')].map(x => +x.dataset.pick);
      if (!picks.length) { status('저장할 카드를 하나 이상 골라 주세요.'); return; }
      if (picks.length === 1) { await saveBlob(await slideBlob(r, picks[0], cnFormat), name(picks[0])); return; }
      await zip(picks);
    });
    document.getElementById('cn-zip').onclick = guard(() => zip([1, 2, 3, 4, 5, 6, 7]));
    async function zip(list) {
      status('ZIP 도구를 불러오는 중…');
      let JSZip; try { JSZip = await loadJSZip(); } catch (e) { status('ZIP 도구를 불러오지 못했어요. 카드를 한 장씩 저장해 주세요.'); toast('ZIP 도구를 불러오지 못했어요.'); return; }
      const z = new JSZip();
      for (const i of list) { status(`${i}번 카드를 만드는 중… (${list.indexOf(i) + 1}/${list.length})`); z.file(name(i), await slideBlob(r, i, cnFormat)); } // sequential: memory-friendly on mobile Safari
      status('ZIP 파일을 묶는 중…');
      const blob = await z.generateAsync({ type: 'blob' });
      await saveBlob(blob, `my-faith-story-${slug(r)}-cardnews-${cnFormat}.zip`);
      status(`${list.length}장을 ZIP으로 저장 요청했어요.`);
    }
    document.getElementById('cn-native').onclick = () => shareNative(r);
    document.getElementById('cn-kakao').onclick = () => shareKakao(r);
    document.getElementById('cn-copy').onclick = () => shareLink(r);
    show();
  }

  let dictState = { t: 'all', q: '', page: 1 };
  function dictionary() {
    const per = 24;
    const list = D.CHARACTERS.filter(c => (dictState.t === 'all' || c.testament === dictState.t) && (!dictState.q || (c.displayName + c.distinguishingLabel).includes(dictState.q.trim())));
    const pages = Math.max(1, Math.ceil(list.length / per)); dictState.page = Math.min(dictState.page, pages);
    const slice = list.slice((dictState.page - 1) * per, dictState.page * per);
    $app.innerHTML = `<section class="wrap" style="padding-block:28px">
      <p class="eyebrow">Bible Characters</p><h1 style="font-size:clamp(26px,4vw,36px);margin-top:6px">성경 인물 사전</h1>
      <p class="muted">구약 50명 · 신약 50명. 사전 등록과 대표 결과 가능 여부는 달라요. 일러스트는 모두 <b>임시 이미지</b>예요.</p>
      <div class="dict-tools">
        <div class="seg" role="group" aria-label="구약/신약 필터">${[['all', '전체'], ['OT', '구약'], ['NT', '신약']].map(([v, l]) => `<button data-t="${v}" aria-pressed="${dictState.t === v}">${l}</button>`).join('')}</div>
        <label class="sr-only" for="dq">이름 검색</label><input id="dq" type="search" placeholder="이름으로 검색 (예: 다윗)" value="${esc(dictState.q)}">
        <span class="small muted" aria-live="polite">${list.length}명</span>
      </div>
      <ul class="dict">${slice.map(c => `<li><a href="#character-${c.id}"><img alt="" loading="lazy" data-portrait="${c.id}" width="288" height="360"><b>${esc(c.displayName)}</b><span>${c.cardCode}${c.distinguishingLabel ? ' · ' + esc(c.distinguishingLabel) : ''}${c.eligibleForPrimary ? '' : ' · 사전 소개용'}</span></a></li>`).join('') || '<li class="muted">검색 결과가 없어요.</li>'}</ul>
      <nav class="pager" aria-label="페이지">${Array.from({ length: pages }, (_, i) => `<button class="btn sm ${dictState.page === i + 1 ? 'gold' : ''}" data-p="${i + 1}" aria-current="${dictState.page === i + 1 ? 'page' : 'false'}">${i + 1}</button>`).join('')}</nav>
    </section>`;
    let k = 0; const imgs = [...$app.querySelectorAll('img[data-portrait]')];
    const paint = () => { const end = Math.min(imgs.length, k + 6); for (; k < end; k++) imgs[k].src = RENDER.portraitURL(imgs[k].dataset.portrait); if (k < imgs.length) requestAnimationFrame(paint); };
    paint();
    $app.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { dictState.t = b.dataset.t; dictState.page = 1; dictionary(); }; });
    $app.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { dictState.page = +b.dataset.p; dictionary(); window.scrollTo(0, 0); }; });
    const dq = document.getElementById('dq'); let t;
    dq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { dictState.q = dq.value; dictState.page = 1; dictionary(); const n = document.getElementById('dq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
  }

  const ELIG = { primary: '대표 매칭 가능', support: 'TOP3 보조 후보', reflection: '묵상용 (매칭 제외)', library: '사전 소개용 (근거 부족)' };
  function characterPage(id) {
    const c = D.CHAR_BY_ID[id];
    if (!c) { $app.innerHTML = `<section class="wrap prose"><h1>인물을 찾을 수 없어요</h1><a class="btn" href="#characters">성경 인물 사전</a></section>`; return; }
    $app.innerHTML = `<section class="wrap detail">
      <div><img class="portrait" alt="${esc(c.displayName)} 임시 일러스트" data-portrait="${c.id}"><p class="small muted">임시 일러스트 · 실제 일러스트 교체 예정</p></div>
      <div>
        <p class="eyebrow">${c.cardCode} · ${c.testament === 'OT' ? '구약' : '신약'}</p>
        <h1 style="font-size:clamp(28px,4vw,40px);margin:6px 0">${esc(c.displayName)}${c.distinguishingLabel ? ` <span class="muted" style="font-size:.55em">${esc(c.distinguishingLabel)}</span>` : ''}</h1>
        <p>${esc(c.bioSummary)}</p>
        <div class="row" style="margin-bottom:14px"><span class="chip">${esc(c.references)}</span><span class="chip ${c.eligibleForPrimary ? 'gold' : ''}">${c.eligibleForPrimary ? '대표 결과 가능' : '대표 결과 제외 · 사전 소개'}</span><span class="chip">콘텐츠 검수 전(초안)</span></div>
        ${c.notes ? `<p class="notice">${esc(c.notes)}</p>` : ''}
        <h2 style="font-size:20px;margin:18px 0 10px">기록된 사건</h2>
        <ul class="evlist">${c.eventIds.map(eid => { const e = D.EVENT_BY_ID[eid]; return `<li class="panel"><div class="sectitle"><h3 style="font-size:18px">${esc(e.title)}</h3><span class="chip gold">${esc(e.scriptureRefs)}</span></div><p style="margin:0 0 8px">${esc(e.factualSummary)}</p><p class="small muted" style="margin:0">${ELIG[e.eligibility]} · ${esc(D.CONTEXTS[e.context])}${e.signals.length ? ' · 비교 신호: ' + e.signals.map(s => esc(D.SIGNAL_TEXT[s])).join(', ') : ''}</p></li>`; }).join('')}</ul>
        <p class="small muted">장절과 요약은 서비스의 자체 요약이며 성경 번역 본문을 옮기지 않았어요. 성경을 직접 펼쳐 읽어 보세요.</p>
        <div class="row"><a class="btn gold" href="#test">나도 테스트하기 ›</a><a class="btn" href="#characters">‹ 사전으로</a></div>
      </div></section>`;
    $app.querySelector('img[data-portrait]').src = RENDER.portraitCanvas(c.id, 640, 800).toDataURL('image/jpeg', 0.88);
  }

  function sharePage(arg) {
    if (!arg) { $app.innerHTML = `<section class="wrap prose"><h1>공유된 카드를 찾을 수 없어요</h1><a class="btn gold" href="#test">나도 테스트하기</a></section>`; return; }
    const c = D.CHAR_BY_ID[arg.characterId], e = D.EVENT_BY_ID[arg.eventId];
    $app.innerHTML = `<section class="wrap detail">
      <div><img class="portrait" alt="${esc(c.displayName)} 임시 일러스트" data-portrait="${c.id}"></div>
      <div><p class="eyebrow">공유된 성경 인물 소개</p>
        <h1 style="font-size:clamp(28px,4vw,40px);margin:6px 0">${esc(charName(c))} · ${esc(e.title)}</h1>
        <p class="chip gold">${esc(e.scriptureRefs)}</p><p>${esc(e.factualSummary)}</p>
        <p class="small muted">이 페이지는 공개 인물·사건 소개예요. 공유한 사람의 응답이나 결과는 담겨 있지 않아요.</p>
        <div class="row"><a class="btn gold" href="#test">나도 테스트하기 ›</a><a class="btn" href="#character-${c.id}">인물 더 보기</a></div></div></section>`;
    $app.querySelector('img[data-portrait]').src = RENDER.portraitCanvas(c.id, 640, 800).toDataURL('image/jpeg', 0.88);
  }

  function about() {
    const R = window.MFS_RARITY; const T = D.CONFIG.rarityThresholds;
    const kc = Object.values(R.keys).reduce((a, v) => (a[v.rarity] = (a[v.rarity] || 0) + 1, a), {});
    $app.innerHTML = `<section class="wrap prose">
      <p class="eyebrow">About</p><h1 style="font-size:34px;margin-top:6px">서비스 소개 · FAQ</h1>
      <h2>무엇을 하나요?</h2><p>최근 4주 동안의 신앙·말씀·기도·예배·성찰·공동체 행동에 관한 12개의 A/B 질문에 답하면, 등록된 성경 사건 프로필 ${D.EVENTS.length}개(대표·보조 비교 대상 ${D.EVENTS.filter(e => e.eligibility === 'primary' || e.eligibility === 'support').length}개)와 비교해 닮은 장면을 보여 줘요. 신앙 수준, 구원, 영성, 인격, 하나님의 평가, 심리 상태를 판정하지 않아요.</p>
      <h2>어떻게 비교하나요?</h2><p>선택지마다 행동 신호와 내용 가중치가 있고, 각 사건에는 본문에 기록된 행동 신호가 있어요. 응답과 사건 사이의 특성 유사도, 행동 일치도, 서로 다른 문항 근거 수, 행동의 고유성을 합쳐 내부 지표(0~100)를 만들고, 서로 다른 문항에서 2개 이상 근거가 있는 사건만 후보가 돼요. 실시간 AI를 쓰지 않으며 같은 응답은 항상 같은 결과가 나와요.</p>
      <h2>카드 등급(N·R·SR·SSR)은?</h2><p>대표 특기 + 보조 특성 계열 + 사건 상황 유형 조합이 4,096가지 응답 조합 가운데 몇 번 나오는지로 정한 <b>설계상 희귀도</b>예요. 실제 이용자 비율이나 뽑기 확률이 아니고, 좋은 답에 높은 등급을 주지 않아요.</p>
      <div class="tablewrap"><table><tr><th>등급</th><th>조합 등장 건수(4,096 기준)</th><th>현재 조합 수</th></tr>
        <tr><td>N</td><td>${T.N} 이상</td><td>${kc.N || 0}</td></tr><tr><td>R</td><td>${T.R}~${T.N - 1}</td><td>${kc.R || 0}</td></tr><tr><td>SR</td><td>${T.SR}~${T.R - 1}</td><td>${kc.SR || 0}</td></tr><tr><td>SSR</td><td>${T.SSR}~${T.SR - 1}</td><td>${kc.SSR || 0}</td></tr></table></div>
      <h2>개인정보</h2><p>로그인·회원가입이 없고 이름, 이메일, 전화번호, 교회명을 묻지 않아요. 응답은 이 브라우저 탭의 메모리와 sessionStorage에만 있고, 서버·외부 AI·분석 도구로 보내지 않아요. ‘다시 검사하기’를 누르거나 탭을 닫으면 지워져요. 공유 링크에는 인물·사건 소개만 담겨요.</p>
      <h2>성경 인용과 저작권</h2><p>성경 번역 본문을 옮기지 않고, 장절 표기와 서비스의 자체 요약만 사용해요. 모든 인물·사건 데이터는 <b>콘텐츠 검수 전 초안</b>이며 전문가 검수가 필요해요.</p>
      <h2>일러스트</h2><p>현재 인물·사건 그림은 모두 코드로 그린 <b>임시 이미지</b>예요. 인물별 수채화 일러스트는 제작 큐에 등록되어 있고 아직 생성되지 않았어요.</p>
      <h2>한계</h2><ul><li>12개 문항으로 볼 수 있는 행동은 일부예요. 결과는 성경 속 사건의 한 장면과 비교한 묵상 자료일 뿐이에요.</li><li>100명이 사전에 등록되어 있지만 대표 결과로 나올 수 있는 인물은 근거가 충분한 ${D.CHARACTERS.filter(c => c.eligibleForPrimary).length}명이고, 실제로 4,096 조합에서 대표로 나오는 인물은 그보다 적어요.</li><li>유사도 임계값과 가중치는 경험적 설정이며 검증된 심리 척도가 아니에요.</li></ul>
      <p class="small muted">데이터 버전 ${esc(D.DATA_VERSION)} · 희귀도 규칙 ${esc(D.CONFIG.rarityRuleVersion)}</p>
    </section>`;
  }

  // header links
  render();
})();
