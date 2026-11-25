#!/usr/bin/env node
/* Generates docs/DATA_DICTIONARY.md, docs/ASSET_MANIFEST.csv, docs/ASSET_GENERATION_QUEUE.csv from src/data.js */
'use strict';
const fs = require('fs'), path = require('path');
const D = require('../src/data.js');
const root = path.join(__dirname, '..');
const csv = rows => '﻿' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n';
const setting = c => c.testament === 'OT' ? 'historically informed ancient Near Eastern setting' : 'historically informed first-century Mediterranean setting';
const tpl = (subject, ratio) => `Original editorial watercolor illustration, ${subject}, ${ratio.setting}, natural expression, textured handmade paper, cinematic warm diffuse light, muted sage and warm earth palette, intentional negative space for typography, no letters, no logos, no modern artifacts, no watermark, ${ratio.r}.`;
const P = require('./portrait-prompts.js');
const urls = {}; try { fs.readFileSync(path.join(root, 'assets-src/portrait-urls.txt'), 'utf8').trim().split('\n').forEach(l => { const [id, , at] = l.split(' '); urls[id] = at; }); } catch (e) { }
const realSet = new Set(fs.existsSync(path.join(root, 'public/assets/characters')) ? fs.readdirSync(path.join(root, 'public/assets/characters')).map(f => f.replace('.webp', '')) : []);
const portraitPrompt = c => P.STYLE.replace('{subject}', P.S[c.id] || '').replace('{setting}', c.testament === 'OT' ? 'ancient Near Eastern' : 'first-century Mediterranean');
const q = [['assetId', 'type', 'path', 'characterId', 'eventId', 'ratio', 'targetSize', 'priority', 'status', 'prompt', 'reviewNote']];
const m = [['assetId', 'path', 'alt', 'focalPoint', 'ratio', 'source', 'license', 'status', 'generatedAt', 'characterId', 'eventId']];
D.CHARACTERS.forEach(c => {
  const main = D.EVENT_BY_ID[c.eventIds[0]];
  const label = c.displayName + (c.distinguishingLabel ? ` (${c.distinguishingLabel})` : '');
  const real = realSet.has(c.id);
  q.push([c.portraitAssetId, 'portrait', `public/assets/characters/${c.id}.webp`, c.id, '', '4:5', '720x900 webp (source 928x1152)', c.eligibleForPrimary ? 'P1' : 'P2', real ? 'generated' : 'queued-not-generated',
    P.S[c.id] ? portraitPrompt(c) : tpl(`biblical figure ${label} (${c.references}), shown in the context of "${main.title}" (${main.scriptureRefs})`, { setting: setting(c), r: 'portrait 4:5' }),
    'Gender/age/era/symbols must be checked against the passage; do not fix historical appearance; consistent motif per character']);
  m.push(real ? [c.portraitAssetId, `public/assets/characters/${c.id}.webp`, `${c.displayName} 수채화 일러스트`, '0.5,0.4', '4:5', 'Figma generate_image (model gemini-3.1-flash-lite-image); original JPEG in assets-src/characters', 'AI-generated via user\'s Figma plan — confirm Figma AI terms before commercial use', 'generated-needs-content-review', urls[c.id] || '', c.id, '']
    : [c.portraitAssetId, '(runtime canvas)', `${c.displayName} 임시 일러스트`, '0.5,0.35', '4:5', 'procedural placeholder (src/render.js)', 'own code', 'placeholder', '', c.id, '']);
});
D.EVENTS.filter(e => e.eligibility === 'primary').forEach(e => {
  const c = D.CHAR_BY_ID[e.characterId];
  q.push([e.sceneAssetId, 'event-scene', `public/assets/events/${e.id}.webp`, c.id, e.id, '3:2', '1620x1080', 'P2', 'queued-not-generated',
    tpl(`scene of ${c.displayName}: "${e.title}" (${e.scriptureRefs}) — ${e.factualSummary}`, { setting: setting(c), r: 'landscape 3:2' }), 'Scene content needs theological review']);
  m.push([e.sceneAssetId, '(runtime canvas)', `${c.displayName} · ${e.title} 임시 장면`, '0.5,0.5', '3:2', 'procedural placeholder', 'own code', 'placeholder', '', c.id, e.id]);
});
[['bg-hero', 'hero landscape at dawn over Judean hills', '16:9'], ['bg-quiz', 'quiet olive grove path at golden hour', '9:16'], ['bg-result', 'soft sage valley under warm light', '16:9']].forEach(([id, s, r]) => q.push([id, 'background', `public/assets/backgrounds/${id}.webp`, '', '', r, '', 'P3', 'queued-not-generated', tpl(s, { setting: 'ancient Near Eastern', r }), '']));
D.AREAS.forEach(a => q.push(['area-' + a.id, 'area', `public/assets/ui/area-${a.id}.webp`, '', '', '1:1', '1024x1024', 'P3', 'queued-not-generated', tpl(`symbolic still life for "${a.label}" area`, { setting: 'ancient Near Eastern', r: 'square' }), '']));
['C', 'U', 'R', 'RR', 'SR', 'UR', 'story'].forEach(r => q.push(['cardbg-' + r, 'card-background', `public/assets/ui/cardbg-${r}.webp`, '', '', r === 'story' ? '9:16' : '4:5', '', 'P3', 'queued-not-generated', tpl(`abstract watercolor texture for a ${r} card edition background`, { setting: 'no setting', r: '4:5' }), 'Frames themselves stay CSS/Canvas']));
q.push(['og-default', 'og', 'public/share/og-default.png', '', '', '1200:630', '1200x630', 'P1', 'queued-not-generated', tpl('wide hero with fanned blank cards on a stone ledge', { setting: 'ancient Near Eastern', r: '1200x630' }), 'No text baked in']);
fs.writeFileSync(path.join(root, 'docs/ASSET_GENERATION_QUEUE.csv'), csv(q));
fs.writeFileSync(path.join(root, 'docs/ASSET_MANIFEST.csv'), csv(m));

const E = { primary: '대표', support: '보조', reflection: '묵상', library: '사전' };
let md = `# DATA DICTIONARY (data ${D.DATA_VERSION})\n\n자동 생성: \`node scripts/generate-docs.js\`. 모든 항목은 **검수 전 초안(draft-needs-human-review)** 이다. 장절은 탐색·요약 근거이며 성경 본문 전문가 검수를 받지 않았다.\n\n`;
md += `- 인물 ${D.CHARACTERS.length}명 (구약 ${D.CHARACTERS.filter(c => c.testament === 'OT').length} / 신약 ${D.CHARACTERS.filter(c => c.testament === 'NT').length}), 대표 후보 자격 ${D.CHARACTERS.filter(c => c.eligibleForPrimary).length}명\n- 사건 프로필 ${D.EVENTS.length}개: ` + Object.entries(E).map(([k, v]) => `${v} ${D.EVENTS.filter(e => e.eligibility === k).length}`).join(', ') + ` (목표 약 300개 대비 미달 — 근거 부족 사건을 억지로 채우지 않음)\n- 특기 ${D.SKILLS.length}개 (조합 특기 10 + 신호별 기본 특기 24), 복합 규칙 ${D.MATCH_RULES.length}개\n\n`;
md += `## 스키마\n- Character: id, displayName, testament, number, cardCode, distinguishingLabel, aliases, bioSummary, references, portraitAssetId, eligibleForPrimary, reviewStatus, notes, eventIds\n- EventProfile: id, characterId, index, title, scriptureRefs, factualSummary, signals[] (= observedBehaviorTags/supportedQuestionSignals), traits{code:1~3} (신호에서 파생), context, eligibility(primary/support/reflection/library), sceneAssetId, reviewStatus. interpretation·strength·reflection·prayer 문장은 조건별 템플릿(SIGNAL_TEXT, ACTION_TEXT, CONTEXT_TEMPLATES)으로 생성\n\n`;
md += `## 인물 목록\n\n| 코드 | 인물 | 대표 후보 | 사건 (자격 · 장절 · 신호) | 비고 |\n|---|---|---|---|---|\n`;
D.CHARACTERS.forEach(c => { md += `| ${c.cardCode} | ${c.displayName}${c.distinguishingLabel ? ' (' + c.distinguishingLabel + ')' : ''} | ${c.eligibleForPrimary ? '예' : '아니오'} | ${c.eventIds.map(id => { const e = D.EVENT_BY_ID[id]; return `${e.title} (${E[e.eligibility]} · ${e.scriptureRefs} · ${e.signals.join(' ') || '—'})`; }).join('<br>')} | ${c.notes || ''} |\n`; });
fs.writeFileSync(path.join(root, 'docs/DATA_DICTIONARY.md'), md);
console.log('portraits generated:', realSet.size); console.log('docs generated:', q.length - 1, 'queued assets,', m.length - 1, 'placeholder manifest rows');
