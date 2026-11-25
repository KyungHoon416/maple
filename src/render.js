/* MY FAITH STORY — Canvas renderers (trading card, card back, card news, portraits, scenes).
 * The same renderer produces both the on-screen preview and the saved PNG, so they always match.
 * Portraits/scenes here are PROCEDURAL PLACEHOLDERS (marked 임시), not generated illustrations. */
(function (root) {
  'use strict';
  const D = root.MFS_DATA;
  const FONT = { serif: '"Noto Serif KR", serif', sans: '"Noto Sans KR", sans-serif', display: '"Cinzel", "Noto Serif KR", serif' };
  const C = { bg: '#141B17', card: '#25332C', sage: '#91B39A', gold: '#DCC48A', ivory: '#F3EBDD', muted: '#C4BBA9', line: '#3B4D43' };

  // deterministic PRNG for decorative art only (never used for results)
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = hash(seed); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function wrap(ctx, text, maxW) {
    const lines = []; let line = '';
    const tokens = String(text).split(/(\s+)/);
    tokens.forEach(tok => {
      if (/^\s+$/.test(tok)) { if (line) line += ' '; return; }
      const test = line + tok;
      if (ctx.measureText(test).width <= maxW) { line = test; return; }
      if (line.trim()) { lines.push(line.trim()); line = ''; }
      // break long token by characters
      let chunk = '';
      for (const ch of tok) { if (ctx.measureText(chunk + ch).width > maxW) { lines.push(chunk); chunk = ch; } else chunk += ch; }
      line = chunk;
    });
    if (line.trim()) lines.push(line.trim());
    return lines;
  }
  function text(ctx, str, x, y, maxW, lh, maxLines, align) {
    let lines = wrap(ctx, str, maxW);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last.length && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    ctx.textAlign = align || 'left';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return y + lines.length * lh;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ── Procedural watercolor scene + figure (placeholder art)
  function wash(ctx, r, x, y, rad, color, alpha) {
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = alpha * (0.5 + r() * 0.5);
      ctx.fillStyle = color; ctx.beginPath();
      const rx = rad * (0.7 + r() * 0.6), ry = rad * (0.5 + r() * 0.5);
      ctx.ellipse(x + (r() - 0.5) * rad * 0.6, y + (r() - 0.5) * rad * 0.4, rx, ry, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function paper(ctx, w, h, r) {
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 900; i++) { ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'; ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    ctx.globalAlpha = 1;
  }
  const PALETTES = [
    ['#E9C98F', '#B98A5A', '#5E7A63'], ['#F0D7A8', '#C9926A', '#4E6B5A'], ['#E4D3B1', '#9DB3A0', '#3F5A4B'],
    ['#F2C994', '#D08C63', '#56705E'], ['#DCC9A4', '#8FA89A', '#455E52'], ['#EBCF9D', '#A9886A', '#5A7262'],
  ];
  function scene(ctx, w, h, seed, opts) {
    opts = opts || {};
    const r = rng(seed);
    const pal = PALETTES[hash(seed) % PALETTES.length];
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2B3A31'); sky.addColorStop(0.45, pal[0]); sky.addColorStop(1, '#3A4B40');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // sun glow
    const sx = w * (0.55 + r() * 0.35), sy = h * (0.25 + r() * 0.15);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.6);
    g.addColorStop(0, 'rgba(255,240,205,.95)'); g.addColorStop(0.25, 'rgba(250,220,160,.45)'); g.addColorStop(1, 'rgba(250,220,160,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    wash(ctx, r, w * 0.3, h * 0.2, w * 0.35, '#FFF4DC', 0.12);
    // hills
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#7E9483', '#5B7363', '#3B4F43'][layer];
      ctx.globalAlpha = 0.75 + layer * 0.1;
      ctx.beginPath(); const base = h * (0.55 + layer * 0.12); ctx.moveTo(0, base);
      for (let x = 0; x <= w; x += w / 8) ctx.lineTo(x, base - r() * h * 0.08 - (layer === 0 ? h * 0.05 : 0));
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (opts.tree !== false) { // olive tree
      const tx = r() > 0.5 ? w * 0.12 : w * 0.86, ty = h * 0.72;
      ctx.strokeStyle = '#3A2F25'; ctx.lineWidth = w * 0.012; ctx.beginPath(); ctx.moveTo(tx, ty + h * 0.12); ctx.quadraticCurveTo(tx + w * 0.02, ty, tx - w * 0.01, ty - h * 0.08); ctx.stroke();
      wash(ctx, r, tx, ty - h * 0.1, w * 0.09, '#5E7A57', 0.35);
    }
    paper(ctx, w, h, r);
  }
  function figure(ctx, w, h, seed) {
    const r = rng(seed + 'fig');
    const pal = PALETTES[hash(seed) % PALETTES.length];
    const cx = w * 0.5, top = h * 0.2;
    const robe = pal[1], mantle = r() > 0.5 ? '#E8DCC4' : '#B8A27E', skin = ['#C99A74', '#B88763', '#A9785A', '#D3A882'][hash(seed) % 4];
    // halo light behind figure (light, not a religious halo)
    const g = ctx.createRadialGradient(cx, top + h * 0.12, 0, cx, top + h * 0.12, w * 0.5);
    g.addColorStop(0, 'rgba(255,236,190,.55)'); g.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // body / robe
    ctx.fillStyle = robe; ctx.beginPath();
    ctx.moveTo(cx - w * 0.36, h); ctx.quadraticCurveTo(cx - w * 0.33, top + h * 0.33, cx - w * 0.12, top + h * 0.27);
    ctx.lineTo(cx + w * 0.12, top + h * 0.27); ctx.quadraticCurveTo(cx + w * 0.33, top + h * 0.33, cx + w * 0.36, h); ctx.closePath(); ctx.fill();
    // mantle drape
    ctx.fillStyle = mantle; ctx.globalAlpha = 0.85; ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, h); ctx.quadraticCurveTo(cx - w * 0.18, top + h * 0.4, cx + w * 0.1, top + h * 0.28);
    ctx.quadraticCurveTo(cx + w * 0.02, top + h * 0.55, cx + w * 0.08, h); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // folds
    ctx.strokeStyle = 'rgba(40,30,20,.25)'; ctx.lineWidth = w * 0.006;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); const fx = cx - w * 0.2 + i * w * 0.1; ctx.moveTo(fx, top + h * 0.45 + r() * h * 0.05); ctx.quadraticCurveTo(fx + (r() - 0.5) * w * 0.06, top + h * 0.6, fx + (r() - 0.5) * w * 0.05, h); ctx.stroke(); }
    // neck + head
    ctx.fillStyle = skin; ctx.fillRect(cx - w * 0.04, top + h * 0.2, w * 0.08, h * 0.08);
    ctx.beginPath(); ctx.ellipse(cx, top + h * 0.13, w * 0.1, h * 0.095, 0, 0, Math.PI * 2); ctx.fill();
    const covered = r() > 0.45;
    if (covered) { // head covering
      ctx.fillStyle = mantle; ctx.beginPath();
      ctx.moveTo(cx - w * 0.15, top + h * 0.3); ctx.quadraticCurveTo(cx - w * 0.16, top + h * 0.0, cx, top + h * 0.015);
      ctx.quadraticCurveTo(cx + w * 0.16, top + h * 0.0, cx + w * 0.15, top + h * 0.3);
      ctx.quadraticCurveTo(cx + w * 0.1, top + h * 0.12, cx, top + h * 0.06); ctx.quadraticCurveTo(cx - w * 0.1, top + h * 0.12, cx - w * 0.15, top + h * 0.3); ctx.fill();
    } else { // hair
      ctx.fillStyle = ['#3B2A1E', '#4A3423', '#5A4430', '#8C8478'][hash(seed + 'h') % 4]; ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.085, w * 0.11, h * 0.07, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    // soft shading on face (no facial features: avoids fixing historical appearance)
    ctx.fillStyle = 'rgba(60,35,20,.18)'; ctx.beginPath(); ctx.ellipse(cx + w * 0.04, top + h * 0.14, w * 0.05, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    paper(ctx, w, h, r);
  }
  // Placeholder art until a generated portrait exists: watercolor landscape + name medallion
  // (no faceless figure — it read as unfinished).
  function emblem(ctx, w, h, charId) {
    const ch = D.CHAR_BY_ID[charId]; if (!ch) return;
    const cx = w / 2, cy = h * 0.42, R = Math.min(w, h) * 0.27;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.2);
    g.addColorStop(0, 'rgba(255,240,205,.55)'); g.addColorStop(1, 'rgba(255,240,205,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,32,26,.78)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,196,138,.95)'; ctx.lineWidth = Math.max(2, w * 0.006); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,196,138,.45)'; ctx.lineWidth = Math.max(1, w * 0.003); ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2); ctx.stroke();
    // laurel ticks around the ring
    ctx.fillStyle = 'rgba(220,196,138,.8)';
    for (let i = 0; i < 18; i++) { const a = Math.PI * 0.62 + i * (Math.PI * 1.76 / 17); const x = cx + Math.cos(a) * R * 1.1, y = cy + Math.sin(a) * R * 1.1; ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.beginPath(); ctx.ellipse(0, 0, R * 0.035, R * 0.09, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#F3EBDD'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const name = ch.displayName.replace(/\s+/g, '');
    if (name.length <= 4) {
      const size = R * [0, 0.95, 0.62, 0.46, 0.36][name.length];
      ctx.font = `700 ${Math.round(size)}px ${FONT.serif}`; ctx.fillText(name, cx, cy - R * 0.06);
    } else { // long names: open-book mark instead of a truncated name
      const bw = R * 0.5, by = cy - R * 0.08;
      ctx.strokeStyle = '#F3EBDD'; ctx.lineWidth = Math.max(2, R * 0.035); ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(cx - bw, by - bw * 0.25); ctx.quadraticCurveTo(cx - bw * 0.5, by - bw * 0.5, cx, by - bw * 0.15); ctx.quadraticCurveTo(cx + bw * 0.5, by - bw * 0.5, cx + bw, by - bw * 0.25);
      ctx.lineTo(cx + bw, by + bw * 0.5); ctx.quadraticCurveTo(cx + bw * 0.5, by + bw * 0.25, cx, by + bw * 0.6); ctx.quadraticCurveTo(cx - bw * 0.5, by + bw * 0.25, cx - bw, by + bw * 0.5); ctx.closePath();
      ctx.moveTo(cx, by - bw * 0.15); ctx.lineTo(cx, by + bw * 0.6); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(220,196,138,.95)'; ctx.font = `600 ${Math.round(R * 0.13)}px ${FONT.display}`;
    ctx.fillText(ch.cardCode, cx, cy + R * 0.48);
    ctx.textBaseline = 'alphabetic';
  }

  // Real generated portraits (served as files next to the page); others fall back to the procedural placeholder.
  const REAL = new Set(root.MFS_PORTRAITS || []);
  const PORTRAIT_BASE = 'assets/characters/';
  const imgs = new Map();
  function hasPortrait(id) { return REAL.has(id); }
  function portraitSrc(id) { return PORTRAIT_BASE + id + '.webp'; }
  function loadPortrait(id) {
    if (!REAL.has(id)) return Promise.resolve(null);
    if (imgs.has(id)) return imgs.get(id).p;
    const im = new Image(); const rec = { im, ok: false };
    rec.p = new Promise(res => { im.onload = () => { rec.ok = true; res(im); }; im.onerror = () => res(null); });
    im.src = portraitSrc(id); imgs.set(id, rec); return rec.p;
  }
  function preload(ids) { return Promise.all([...new Set(ids)].map(loadPortrait)); }
  const portraitCache = new Map();
  function portraitCanvas(charId, w, h) {
    const rec = imgs.get(charId); const real = rec && rec.ok;
    const key = charId + w + 'x' + h + (real ? 'r' : 'p');
    if (portraitCache.has(key)) return portraitCache.get(key);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    if (real) { // cover-fit, focal point slightly above centre
      const im = rec.im, sc = Math.max(w / im.naturalWidth, h / im.naturalHeight);
      const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      ctx.drawImage(im, (w - dw) / 2, (h - dh) * 0.4, dw, dh);
    } else { scene(ctx, w, h, charId); emblem(ctx, w, h, charId); }
    const v = ctx.createLinearGradient(0, h * 0.6, 0, h); v.addColorStop(0, 'rgba(20,27,23,0)'); v.addColorStop(1, 'rgba(20,27,23,.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    portraitCache.set(key, cv);
    return cv;
  }
  function portraitURL(charId) { return REAL.has(charId) ? portraitSrc(charId) : portraitCanvas(charId, 288, 360).toDataURL('image/jpeg', 0.85); }
  function sceneURL(seed, w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; scene(cv.getContext('2d'), w, h, seed); return cv.toDataURL('image/jpeg', 0.82); }

  // ── Trading card
  const FRAMES = {
    N: { name: 'Normal', a: '#E8DCC2', b: '#A8865A', text: '#2A231A', plate: '#EFE5D0', glow: null },
    R: { name: 'Rare', a: '#DCE6DE', b: '#7E9B87', text: '#1E2A23', plate: '#E4ECE5', glow: 'rgba(200,225,210,.35)' },
    SR: { name: 'Super Rare', a: '#F6E3A8', b: '#B8913F', text: '#2A2010', plate: '#F4E6BF', glow: 'rgba(255,225,150,.45)' },
    SSR: { name: 'Signature Super Rare', a: '#FFF0BF', b: '#C9A24C', text: '#2A2010', plate: '#FFF3D2', glow: 'rgba(255,230,170,.6)' },
  };
  function frameGrad(ctx, x, y, w, h, rarity) {
    const f = FRAMES[rarity] || FRAMES.N;
    if (rarity === 'SSR') {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      ['#F7E3A3', '#E9B7C8', '#B9D7F0', '#C8EBC9', '#F7E3A3', '#E0B860'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
      return g;
    }
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, f.a); g.addColorStop(0.5, f.b); g.addColorStop(1, f.a);
    return g;
  }
  function stainedGlass(ctx, x, y, w, h, seed) {
    const r = rng(seed + 'glass');
    const cols = ['rgba(233,183,200,.22)', 'rgba(185,215,240,.22)', 'rgba(200,235,201,.22)', 'rgba(247,227,163,.25)'];
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = cols[i % 4]; ctx.beginPath();
      const px = x + r() * w, py = y + r() * h, s = 40 + r() * 90;
      ctx.moveTo(px, py); ctx.lineTo(px + s, py + r() * s * 0.5); ctx.lineTo(px + r() * s, py + s); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(60,45,20,.35)'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  function sparkles(ctx, x, y, w, h, seed, n) {
    const r = rng(seed + 'spk');
    for (let i = 0; i < n; i++) {
      const px = x + r() * w, py = y + r() * h, s = 6 + r() * 14;
      ctx.fillStyle = 'rgba(255,246,215,' + (0.5 + r() * 0.5) + ')';
      ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px + s * 0.25, py - s * 0.25); ctx.lineTo(px + s, py); ctx.lineTo(px + s * 0.25, py + s * 0.25);
      ctx.lineTo(px, py + s); ctx.lineTo(px - s * 0.25, py + s * 0.25); ctx.lineTo(px - s, py); ctx.lineTo(px - s * 0.25, py - s * 0.25); ctx.closePath(); ctx.fill();
    }
  }

  /** card: { characterId, eventId, skillId, secondaryTraits[], rarity, cardNumber, example? } ; W×H canvas, format 'feed'|'story' */
  function drawCard(ctx, W, H, card) {
    const ch = D.CHAR_BY_ID[card.characterId], ev = D.EVENT_BY_ID[card.eventId], sk = D.SKILL_BY_ID[card.skillId];
    const story = H / W > 1.5;
    const s = W / 1080; ctx.save(); ctx.scale(s, s);
    const w = 1080, h = H / s;
    const f = FRAMES[card.rarity] || FRAMES.N;
    // outer frame
    ctx.fillStyle = '#0E1411'; ctx.fillRect(0, 0, w, h);
    rr(ctx, 18, 18, w - 36, h - 36, 46); ctx.fillStyle = frameGrad(ctx, 0, 0, w, h, card.rarity); ctx.fill();
    // inner body
    rr(ctx, 44, 44, w - 88, h - 88, 32);
    const body = ctx.createLinearGradient(0, 0, 0, h); body.addColorStop(0, '#22302A'); body.addColorStop(1, '#16201B');
    ctx.fillStyle = body; ctx.fill();
    // header
    ctx.fillStyle = f.a; ctx.font = `600 30px ${FONT.display}`; ctx.textAlign = 'left';
    ctx.fillText('MY FAITH STORY', 84, 108);
    ctx.font = `500 24px ${FONT.sans}`; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText((ch.testament === 'OT' ? '구약' : '신약') + ' 성경 인물 카드', w - 84, 106);
    // portrait window
    const px = 84, py = 136, pw = w - 168, ph = story ? 980 : 640;
    ctx.save(); rr(ctx, px, py, pw, ph, 24); ctx.clip();
    ctx.drawImage(portraitCanvas(ch.id, 720, Math.round(720 * ph / pw)), px, py, pw, ph);
    if (card.rarity === 'SSR') stainedGlass(ctx, px, py, pw, ph * 0.45, ch.id);
    if (f.glow) { const g = ctx.createLinearGradient(px, py, px + pw, py + ph); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, f.glow); g.addColorStop(0.55, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }
    if (card.rarity === 'SR' || card.rarity === 'SSR') sparkles(ctx, px, py, pw, ph * 0.6, ch.id, card.rarity === 'SSR' ? 22 : 12);
    ctx.restore();
    ctx.strokeStyle = frameGrad(ctx, px, py, pw, ph, card.rarity); ctx.lineWidth = 6; rr(ctx, px, py, pw, ph, 24); ctx.stroke();
    if (!REAL.has(ch.id)) { ctx.fillStyle = 'rgba(14,20,17,.6)'; rr(ctx, px + 16, py + 16, 172, 40, 20); ctx.fill();
      ctx.fillStyle = C.muted; ctx.font = `500 20px ${FONT.sans}`; ctx.textAlign = 'center'; ctx.fillText('일러스트 준비 중', px + 102, py + 43); }
    // name plate
    let y = py + ph - 40;
    rr(ctx, px + 60, y, pw - 120, 112, 56); ctx.fillStyle = f.plate; ctx.fill();
    ctx.strokeStyle = f.b; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = f.text; ctx.textAlign = 'center';
    let nameSize = 52; ctx.font = `700 ${nameSize}px ${FONT.serif}`;
    const nm = ch.displayName + (ch.distinguishingLabel ? '' : '');
    while (ctx.measureText(nm).width > pw - 180 && nameSize > 30) { nameSize -= 2; ctx.font = `700 ${nameSize}px ${FONT.serif}`; }
    ctx.fillText(nm, w / 2, y + 62);
    ctx.font = `500 24px ${FONT.sans}`; ctx.fillStyle = '#5C4E36';
    ctx.fillText(ch.distinguishingLabel ? ch.distinguishingLabel + ' · ' + ev.title : ev.title, w / 2, y + 95);
    y += 150;
    // skill
    ctx.textAlign = 'left'; ctx.fillStyle = C.sage; ctx.font = `600 24px ${FONT.sans}`; ctx.fillText('대표 특기', 84, y);
    ctx.fillStyle = C.ivory; ctx.font = `700 44px ${FONT.serif}`; ctx.fillText(sk.label, 84, y + 56);
    ctx.fillStyle = C.muted; ctx.font = `400 27px ${FONT.sans}`;
    y = text(ctx, sk.description, 84, y + 102, w - 168, 40, 2);
    // secondary traits
    const chips = (card.secondaryTraits || []).slice(0, 3).map(id => D.SKILL_BY_ID[id].label);
    if (chips.length) {
      y += 8; let x = 84; ctx.font = `500 23px ${FONT.sans}`;
      chips.forEach(c => { const cw = ctx.measureText(c).width + 36; if (x + cw > w - 84) return; rr(ctx, x, y, cw, 44, 22); ctx.strokeStyle = 'rgba(145,179,154,.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = C.sage; ctx.fillText(c, x + 18, y + 30); x += cw + 10; });
      y += 64;
    }
    ctx.fillStyle = C.gold; ctx.font = `500 26px ${FONT.serif}`; ctx.fillText('성경 · ' + ev.scriptureRefs, 84, Math.min(y + 30, h - 170));
    // footer: disclaimer (left) + rarity & number (bottom-right)
    const fy = h - 96;
    ctx.strokeStyle = 'rgba(220,196,138,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(84, fy - 46); ctx.lineTo(w - 84, fy - 46); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `400 20px ${FONT.sans}`;
    ctx.fillText(card.example ? '예시 카드 · 실제 결과와 무관합니다' : '등급은 특기 조합의 설계상 희귀도이며', 84, fy - 6);
    ctx.fillText(card.example ? '등급은 신앙 수준이 아닙니다' : '신앙의 높고 낮음을 뜻하지 않아요', 84, fy + 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = card.rarity === 'SSR' ? frameGrad(ctx, w - 300, fy - 40, 220, 60, 'SSR') : f.a;
    ctx.font = `700 62px ${FONT.display}`; ctx.fillText(card.rarity || '—', w - 84, fy + 18);
    ctx.fillStyle = C.muted; ctx.font = `500 22px ${FONT.sans}`;
    ctx.fillText((card.cardNumber || ch.cardCode) + ' · ' + (FRAMES[card.rarity] ? FRAMES[card.rarity].name : ''), w - 84, fy + 50);
    ctx.restore();
  }
  function drawCardBack(ctx, W, H) {
    const s = W / 1080; ctx.save(); ctx.scale(s, s); const w = 1080, h = H / s;
    ctx.fillStyle = '#0E1411'; ctx.fillRect(0, 0, w, h);
    rr(ctx, 18, 18, w - 36, h - 36, 46); const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#E7D49C'); g.addColorStop(.5, '#A88A4E'); g.addColorStop(1, '#E7D49C'); ctx.fillStyle = g; ctx.fill();
    rr(ctx, 44, 44, w - 88, h - 88, 32); ctx.fillStyle = '#1C2822'; ctx.fill();
    ctx.strokeStyle = 'rgba(220,196,138,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(w / 2, h / 2, 60 + i * 34, 0, Math.PI * 2); ctx.stroke(); }
    for (let a = 0; a < 24; a++) { ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + Math.cos(a * Math.PI / 12) * 520, h / 2 + Math.sin(a * Math.PI / 12) * 520); ctx.stroke(); }
    ctx.fillStyle = '#1C2822'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 180, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.stroke();
    // open book mark
    ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(w / 2 - 80, h / 2 - 20); ctx.quadraticCurveTo(w / 2 - 40, h / 2 - 40, w / 2, h / 2 - 10); ctx.quadraticCurveTo(w / 2 + 40, h / 2 - 40, w / 2 + 80, h / 2 - 20);
    ctx.lineTo(w / 2 + 80, h / 2 + 40); ctx.quadraticCurveTo(w / 2 + 40, h / 2 + 20, w / 2, h / 2 + 50); ctx.quadraticCurveTo(w / 2 - 40, h / 2 + 20, w / 2 - 80, h / 2 + 40); ctx.closePath(); ctx.moveTo(w / 2, h / 2 - 10); ctx.lineTo(w / 2, h / 2 + 50); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.font = `600 40px ${FONT.display}`; ctx.fillText('MY FAITH STORY', w / 2, h / 2 + 260);
    ctx.font = `500 28px ${FONT.sans}`; ctx.fillStyle = C.muted; ctx.fillText('탭하여 카드를 뒤집어 보세요', w / 2, h / 2 + 310);
    ctx.restore();
  }

  // ── Radar (canvas)
  function drawRadar(ctx, cx, cy, R, chart, opts) {
    opts = opts || {};
    const n = chart.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    ctx.lineWidth = 2;
    [0.5, 1].forEach((k, j) => { ctx.strokeStyle = j ? 'rgba(243,235,221,.35)' : 'rgba(243,235,221,.18)'; ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = ang(i % n); const x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R); ctx.stroke(); }
    ctx.beginPath(); chart.forEach((c, i) => { const v = 0.12 + 0.88 * c.aShare; const x = cx + Math.cos(ang(i)) * R * v, y = cy + Math.sin(ang(i)) * R * v; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
    ctx.fillStyle = 'rgba(145,179,154,.42)'; ctx.fill(); ctx.strokeStyle = C.sage; ctx.lineWidth = 4; ctx.stroke();
    chart.forEach((c, i) => { const v = 0.12 + 0.88 * c.aShare; ctx.fillStyle = C.ivory; ctx.beginPath(); ctx.arc(cx + Math.cos(ang(i)) * R * v, cy + Math.sin(ang(i)) * R * v, 7, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = C.ivory; ctx.font = `700 ${opts.label || 34}px ${FONT.serif}`; ctx.textAlign = 'center';
    chart.forEach((c, i) => { const a = ang(i); ctx.fillText(c.label, cx + Math.cos(a) * (R + 50), cy + Math.sin(a) * (R + 50) + 12); });
  }

  // ── Card news (7 slides)
  function slideFrame(ctx, w, h, i, title) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1C2822'); g.addColorStop(1, '#121915'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const gl = ctx.createRadialGradient(w * 0.85, 0, 0, w * 0.85, 0, w * 0.9); gl.addColorStop(0, 'rgba(220,196,138,.16)'); gl.addColorStop(1, 'rgba(220,196,138,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(220,196,138,.4)'; ctx.lineWidth = 2; rr(ctx, 36, 36, w - 72, h - 72, 30); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.font = `600 28px ${FONT.display}`; ctx.textAlign = 'left'; ctx.fillText('MY FAITH STORY', 84, 116);
    ctx.textAlign = 'right'; ctx.font = `600 28px ${FONT.display}`; ctx.fillText(String(i).padStart(2, '0') + ' / 07', w - 84, 116);
    ctx.textAlign = 'left'; ctx.fillStyle = C.ivory; ctx.font = `700 58px ${FONT.serif}`;
    const y = text(ctx, title, 84, 210, w - 168, 72, 2);
    ctx.fillStyle = C.gold; ctx.fillRect(84, y - 20, 70, 3);
    ctx.fillStyle = '#8E978C'; ctx.font = `400 22px ${FONT.sans}`; ctx.textAlign = 'center';
    ctx.fillText('응답 기반 콘텐츠 비교이며 신앙 평가나 진단이 아닙니다 · 회원가입 없이 무료', w / 2, h - 70);
    return y + 30;
  }
  function drawSlide(ctx, W, H, idx, R) {
    // R: view-model built by app (see app.js buildView)
    const s = W / 1080; ctx.save(); ctx.scale(s, s);
    const w = 1080, h = H / s, story = h / w > 1.5;
    const L = 84, MW = w - 168;
    let y;
    if (idx === 1) {
      y = slideFrame(ctx, w, h, 1, R.hasCard ? '지금의 나와 닮은 성경 속 모습' : '지금의 나를 돌아보는 묵상 카드');
      if (R.hasCard) {
        const cw = story ? 760 : 560, chh = cw * 1.25; const cx = (w - cw) / 2;
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = chh; drawCard(cv.getContext('2d'), cw, chh, R.card);
        ctx.drawImage(cv, cx, y, cw, chh); y += chh + 40;
        ctx.textAlign = 'center'; ctx.fillStyle = C.ivory; ctx.font = `700 40px ${FONT.serif}`;
        text(ctx, R.headline, w / 2, y, MW, 54, 2, 'center');
      }
    } else if (idx === 2) {
      y = slideFrame(ctx, w, h, 2, '나의 신앙 프로필');
      const RR = story ? 300 : 230; const cy = y + RR + 70;
      drawRadar(ctx, w / 2, cy, RR, R.chart);
      y = cy + RR + 100;
      ctx.textAlign = 'left'; ctx.font = `400 26px ${FONT.sans}`;
      R.chart.forEach(c => {
        if (y > h - 150) return;
        ctx.fillStyle = C.sage; ctx.font = `700 26px ${FONT.serif}`; ctx.fillText(c.label, L, y);
        ctx.fillStyle = C.muted; ctx.font = `400 24px ${FONT.sans}`;
        const dir = c.aShare === 1 ? 'A 방향 2개 · ' + c.aText : c.aShare === 0 ? 'B 방향 2개 · ' + c.bText : 'A·B 하나씩 · 두 방향을 모두 선택';
        y = text(ctx, dir, L + 110, y, MW - 110, 34, story ? 2 : 1) + 10;
      });
      ctx.fillStyle = '#8E978C'; ctx.font = `400 22px ${FONT.sans}`; text(ctx, '바깥쪽은 A, 안쪽은 B 방향을 고른 정도예요. 높고 낮음의 평가가 아니에요.', L, Math.min(y + 10, h - 110), MW, 30, 2);
    } else if (idx === 3) {
      y = slideFrame(ctx, w, h, 3, '나와 닮은 성경 인물 TOP 3');
      const rowH = story ? 360 : 260;
      R.top.forEach((t, i) => {
        const ty = y + i * (rowH + 20);
        rr(ctx, L, ty, MW, rowH, 24); ctx.fillStyle = 'rgba(37,51,44,.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(59,77,67,1)'; ctx.lineWidth = 2; ctx.stroke();
        const pw = rowH - 40, ph = pw; ctx.save(); rr(ctx, L + 20, ty + 20, pw * 0.8, ph, 18); ctx.clip(); ctx.drawImage(portraitCanvas(t.characterId, 288, 360), L + 20, ty + 20, pw * 0.8, ph); ctx.restore();
        const tx = L + 40 + pw * 0.8;
        ctx.textAlign = 'left'; ctx.fillStyle = C.gold; ctx.font = `700 30px ${FONT.display}`; ctx.fillText(String(i + 1), tx, ty + 60);
        ctx.fillStyle = C.ivory; ctx.font = `700 42px ${FONT.serif}`; ctx.fillText(t.name, tx + 40, ty + 62);
        ctx.fillStyle = C.sage; ctx.font = `500 26px ${FONT.sans}`; text(ctx, t.eventTitle + ' · ' + t.refs, tx, ty + 108, MW - (tx - L) - 20, 34, 1);
        ctx.fillStyle = C.muted; ctx.font = `400 24px ${FONT.sans}`; text(ctx, t.why, tx, ty + 150, MW - (tx - L) - 20, 34, story ? 5 : 3);
      });
      if (!R.top.length) { ctx.fillStyle = C.muted; ctx.font = `400 30px ${FONT.sans}`; text(ctx, '근거가 충분한 후보가 없어 묵상 주제로 안내해요.', L, y + 40, MW, 44); }
    } else if (idx === 4) {
      y = slideFrame(ctx, w, h, 4, '성경 속 사건');
      if (R.hasCard) {
        const ih = story ? 620 : 420; ctx.save(); rr(ctx, L, y, MW, ih, 24); ctx.clip();
        const sc = document.createElement('canvas'); sc.width = 900; sc.height = Math.round(900 * ih / MW); scene(sc.getContext('2d'), sc.width, sc.height, R.event.id);
        ctx.drawImage(sc, L, y, MW, ih); ctx.restore();
        ctx.fillStyle = 'rgba(14,20,17,.6)'; rr(ctx, L + 16, y + 16, 150, 40, 20); ctx.fill(); ctx.fillStyle = C.muted; ctx.font = `500 20px ${FONT.sans}`; ctx.textAlign = 'center'; ctx.fillText('임시 일러스트', L + 91, y + 43);
        y += ih + 70; ctx.textAlign = 'left';
        ctx.fillStyle = C.gold; ctx.font = `600 30px ${FONT.serif}`; ctx.fillText(R.event.refs, L, y);
        ctx.fillStyle = C.ivory; ctx.font = `700 46px ${FONT.serif}`; y = text(ctx, R.name + ' · ' + R.event.title, L, y + 66, MW, 58, 2);
        ctx.fillStyle = C.sage; ctx.font = `600 24px ${FONT.sans}`; ctx.fillText('본문 요약 (자체 요약)', L, y + 20);
        ctx.fillStyle = C.muted; ctx.font = `400 30px ${FONT.sans}`; text(ctx, R.event.summary, L, y + 66, MW, 46, story ? 8 : 4);
      }
    } else if (idx === 5) {
      y = slideFrame(ctx, w, h, 5, '나의 강점과 돌아볼 점');
      ctx.textAlign = 'left'; ctx.fillStyle = C.sage; ctx.font = `600 26px ${FONT.sans}`; ctx.fillText('강점 · 내가 고른 응답에서', L, y); y += 52;
      ctx.fillStyle = C.ivory; ctx.font = `700 40px ${FONT.serif}`; y = text(ctx, R.skillLabel, L, y, MW, 52, 2);
      ctx.fillStyle = C.muted; ctx.font = `400 28px ${FONT.sans}`; y = text(ctx, R.strength, L, y + 6, MW, 42, 3) + 20;
      R.evidence.slice(0, story ? 4 : 3).forEach(e => { ctx.fillStyle = C.gold; ctx.fillRect(L, y - 24, 4, 30); ctx.fillStyle = C.muted; ctx.font = `400 25px ${FONT.sans}`; y = text(ctx, e, L + 20, y, MW - 20, 36, 2) + 14; });
      y += 30; ctx.fillStyle = C.sage; ctx.font = `600 26px ${FONT.sans}`; ctx.fillText('돌아볼 질문', L, y); y += 52;
      ctx.fillStyle = C.ivory; ctx.font = `500 34px ${FONT.serif}`; text(ctx, R.reflection, L, y, MW, 50, 4);
    } else if (idx === 6) {
      y = slideFrame(ctx, w, h, 6, '오늘의 말씀과 실천');
      ctx.textAlign = 'left'; ctx.fillStyle = C.gold; ctx.font = `600 32px ${FONT.serif}`; ctx.fillText(R.event ? R.event.refs : '', L, y); y += 52;
      ctx.fillStyle = C.muted; ctx.font = `400 28px ${FONT.sans}`; y = text(ctx, R.commentary, L, y, MW, 42, 4) + 40;
      ctx.fillStyle = C.sage; ctx.font = `600 26px ${FONT.sans}`; ctx.fillText('오늘 해 볼 3가지', L, y); y += 30;
      R.actions.forEach((a, i) => {
        const bh = story ? 190 : 150; rr(ctx, L, y, MW, bh, 20); ctx.fillStyle = 'rgba(37,51,44,.8)'; ctx.fill();
        ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L + 50, y + 54, 24, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = C.gold; ctx.font = `700 26px ${FONT.serif}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), L + 50, y + 63);
        ctx.textAlign = 'left'; ctx.fillStyle = C.ivory; ctx.font = `400 28px ${FONT.sans}`; text(ctx, a, L + 96, y + 62, MW - 120, 40, story ? 3 : 2);
        y += bh + 18;
      });
    } else if (idx === 7) {
      y = slideFrame(ctx, w, h, 7, '오늘의 기도');
      const g = ctx.createRadialGradient(w / 2, y + 260, 0, w / 2, y + 260, 520); g.addColorStop(0, 'rgba(255,236,190,.12)'); g.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = g; ctx.fillRect(0, y, w, 900);
      ctx.fillStyle = C.ivory; ctx.font = `500 36px ${FONT.serif}`; ctx.textAlign = 'left';
      y = text(ctx, R.prayer, L, y + 30, MW, 62, story ? 12 : 8) + 30;
      ctx.fillStyle = C.gold; ctx.font = `500 30px ${FONT.serif}`; ctx.fillText('아멘.', L, y); y += 90;
      ctx.fillStyle = C.muted; ctx.font = `400 26px ${FONT.sans}`;
      text(ctx, '개인 성찰을 위해 서비스가 작성한 기도문이에요. 나의 말로 바꾸어 드려도 좋아요.', L, y, MW, 38, 2);
      ctx.fillStyle = C.gold; ctx.font = `700 34px ${FONT.serif}`; ctx.textAlign = 'center'; ctx.fillText('나의 믿음은 누구를 닮았을까?', w / 2, h - 190);
      ctx.fillStyle = C.muted; ctx.font = `400 24px ${FONT.sans}`; ctx.fillText('12개의 질문 · 회원가입 없이 누구나 무료', w / 2, h - 146);
    }
    ctx.restore();
  }

  // ── Link-preview (Open Graph) image, 1200×630: portrait left, text right. Used only at build time.
  function drawOG(ctx, W, H, characterId, eventId, opts) {
    const s = W / 1200; ctx.save(); ctx.scale(s, s); const w = 1200, h = 630;
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1F2B25'); g.addColorStop(1, '#121915'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const gl = ctx.createRadialGradient(w * 0.85, 0, 0, w * 0.85, 0, 700); gl.addColorStop(0, 'rgba(220,196,138,.18)'); gl.addColorStop(1, 'rgba(220,196,138,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
    const ch = characterId && D.CHAR_BY_ID[characterId], ev = eventId && D.EVENT_BY_ID[eventId];
    let tx = 80;
    if (ch) {
      const pw = 400, ph = 500, px = 70, py = 65;
      ctx.save(); rr(ctx, px, py, pw, ph, 26); ctx.clip(); ctx.drawImage(portraitCanvas(ch.id, 480, 600), px, py, pw, ph); ctx.restore();
      const fg = ctx.createLinearGradient(px, py, px + pw, py + ph); fg.addColorStop(0, '#F6E3A8'); fg.addColorStop(.5, '#B8913F'); fg.addColorStop(1, '#F6E3A8');
      ctx.strokeStyle = fg; ctx.lineWidth = 6; rr(ctx, px, py, pw, ph, 26); ctx.stroke();
      tx = px + pw + 60;
    }
    const mw = w - tx - 70;
    ctx.textAlign = 'left'; ctx.fillStyle = C.gold; ctx.font = `600 26px ${FONT.display}`; ctx.fillText('MY FAITH STORY', tx, 120);
    if (ch) {
      ctx.fillStyle = C.ivory; ctx.font = `700 70px ${FONT.serif}`; let y = text(ctx, ch.displayName, tx, 215, mw, 80, 1);
      if (ch.distinguishingLabel) { ctx.fillStyle = C.muted; ctx.font = `500 26px ${FONT.sans}`; ctx.fillText(ch.distinguishingLabel, tx, y - 18); y += 22; }
      // character-level image (shared by all of the character's events): no event title here,
      // the event appears in the link text instead
      ctx.fillStyle = C.sage; ctx.font = `600 28px ${FONT.sans}`; ctx.fillText((ch.testament === 'OT' ? '구약' : '신약') + ' 성경 인물 카드 · ' + ch.cardCode, tx, y + 14);
      ctx.fillStyle = C.muted; ctx.font = `400 30px ${FONT.sans}`; y = text(ctx, ch.bioSummary, tx, y + 70, mw, 44, 2);
      ctx.fillStyle = C.gold; ctx.font = `500 26px ${FONT.serif}`; ctx.fillText(ch.references, tx, y + 14);
    } else {
      const fan = (opts && opts.fan) || [];
      fan.slice(0, 4).forEach((id, i) => {
        const fw = 170, fh = 212, fx = 700 + i * 105, fy = 150 + (i % 2) * 24;
        ctx.save(); ctx.translate(fx + fw / 2, fy + fh / 2); ctx.rotate((i - 1.5) * 0.07); ctx.translate(-fw / 2, -fh / 2);
        ctx.save(); rr(ctx, 0, 0, fw, fh, 14); ctx.clip(); ctx.drawImage(portraitCanvas(id, 340, 424), 0, 0, fw, fh); ctx.restore();
        ctx.strokeStyle = '#DCC48A'; ctx.lineWidth = 4; rr(ctx, 0, 0, fw, fh, 14); ctx.stroke(); ctx.restore();
      });
      const tw = fan.length ? 560 : w - 160;
      ctx.fillStyle = C.ivory; ctx.font = `700 64px ${FONT.serif}`; text(ctx, '나의 믿음은 누구를 닮았을까?', tx, 230, tw, 84, 2);
      ctx.fillStyle = C.muted; ctx.font = `400 28px ${FONT.sans}`; text(ctx, '12개의 질문으로 만나는 나의 성경 인물 카드', tx, 420, tw, 40, 2);
    }
    // CTA pill
    const cy = h - 110; ctx.font = `700 30px ${FONT.sans}`; const label = '나도 테스트하기 ›'; const cw = ctx.measureText(label).width + 64;
    rr(ctx, tx, cy, cw, 62, 31); const bg = ctx.createLinearGradient(0, cy, 0, cy + 62); bg.addColorStop(0, '#EBD9A6'); bg.addColorStop(1, '#C9AC6A'); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#1E241F'; ctx.fillText(label, tx + 32, cy + 42);
    ctx.fillStyle = '#8E978C'; ctx.font = `400 22px ${FONT.sans}`; ctx.fillText('회원가입 없이 무료 · 12문항', tx + cw + 24, cy + 40);
    ctx.restore();
  }

  // ── 7-day plan image (1080×1920 story)
  function drawPlan(ctx, W, H, plan) {
    const s = W / 1080; ctx.save(); ctx.scale(s, s); const w = 1080, h = H / s;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1C2822'); g.addColorStop(1, '#121915'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(220,196,138,.4)'; ctx.lineWidth = 2; rr(ctx, 36, 36, w - 72, h - 72, 30); ctx.stroke();
    const ch = D.CHAR_BY_ID[plan.characterId];
    ctx.save(); rr(ctx, 84, 96, 220, 275, 20); ctx.clip(); ctx.drawImage(portraitCanvas(ch.id, 440, 550), 84, 96, 220, 275); ctx.restore();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4; rr(ctx, 84, 96, 220, 275, 20); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = C.gold; ctx.font = `600 26px ${FONT.display}`; ctx.fillText('MY FAITH STORY · 7 DAYS', 340, 136);
    ctx.fillStyle = C.ivory; ctx.font = `700 52px ${FONT.serif}`; let y = text(ctx, plan.title, 340, 210, 660, 64, 2);
    ctx.fillStyle = C.muted; ctx.font = `400 26px ${FONT.sans}`; text(ctx, plan.intro, 340, y + 6, 660, 38, 3);
    y = 430;
    plan.days.forEach(d => {
      const bh = 186; rr(ctx, 84, y, w - 168, bh, 22); ctx.fillStyle = 'rgba(37,51,44,.85)'; ctx.fill();
      ctx.strokeStyle = 'rgba(59,77,67,1)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.gold; ctx.font = `700 30px ${FONT.serif}`; ctx.fillText(d.day + '일차', 116, y + 52);
      ctx.fillStyle = C.ivory; ctx.font = `700 30px ${FONT.serif}`; text(ctx, d.title, 236, y + 52, w - 168 - 180, 38, 1);
      ctx.fillStyle = C.sage; ctx.font = `500 25px ${FONT.sans}`; ctx.fillText(d.ref, 236, y + 94);
      ctx.fillStyle = C.muted; ctx.font = `400 24px ${FONT.sans}`; text(ctx, d.question, 236, y + 136, w - 168 - 180, 34, 2);
      y += bh + 16;
    });
    ctx.fillStyle = '#8E978C'; ctx.font = `400 22px ${FONT.sans}`; ctx.textAlign = 'center';
    ctx.fillText('성경 본문은 직접 펼쳐 읽어 주세요 · 응답 기반 콘텐츠이며 신앙 평가가 아닙니다', w / 2, h - 70);
    ctx.restore();
  }

  function toBlob(canvas) { return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')); }
  function render(fn, W, H) { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; fn(cv.getContext('2d'), W, H); return cv; }

  root.MFS_RENDER = { drawPlan, drawOG, hasPortrait, portraitSrc, loadPortrait, preload, drawCard, drawCardBack, drawSlide, drawRadar, portraitURL, portraitCanvas, sceneURL, render, toBlob, FRAMES, rng };
})(window);
