#!/usr/bin/env node
/* Exhaustive QA over all 2^12 = 4,096 answer combinations.
 * The 4,096 combinations are an equal-weight QA space, NOT a real user distribution. */
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('../src/data.js');
const E = require('../src/engine.js');
const R = require('../src/rarity-index.js');

const eng = E.create(D, R);
const eng2 = E.create(D, R);
const fails = [];
const fail = (m) => { if (fails.length < 50) fails.push(m); };
const all = E.allAnswers();
const results = new Map();

const charCount = {}, eventCount = {}, skillCount = {}, rarityCount = { N: 0, R: 0, SR: 0, SSR: 0 }, keyCount = {};
const charRarity = {}, top3Count = {};
let nearTie = 0, exactTie = 0, lowFit = 0, topShort = 0;
const primaryScores = [];

for (const a of all) {
  const r = eng.match(a);
  const r2 = eng2.match(a);
  if (JSON.stringify(r) !== JSON.stringify(r2)) fail('non-deterministic ' + a);
  if (!r.ok) { fail('not ok ' + a); continue; }
  results.set(a, r);
  r.top.forEach(t => {
    ['score', 'cos', 'behavior', 'coverage', 'specificity'].forEach(k => { if (!Number.isFinite(t[k])) fail(`NaN ${k} ${a}`); });
    if (t.score < 0 || t.score > 100) fail('score range ' + a);
    if (t.matchedQ < D.CONFIG.minEvidenceQuestions) fail('low evidence in top ' + a);
    const ev = D.EVENT_BY_ID[t.eventId];
    if (!['primary', 'support'].includes(ev.eligibility)) fail('ineligible event in top ' + a + ' ' + ev.id);
    top3Count[t.characterId] = (top3Count[t.characterId] || 0) + 1;
  });
  if (new Set(r.top.map(t => t.characterId)).size !== r.top.length) fail('TOP3 duplicate character ' + a);
  if (r.top.length < 3) topShort++;
  r.chartData.forEach(c => { if (![0, 0.5, 1].includes(c.aShare)) fail('chart value ' + a); });
  if (!r.primary) { lowFit++; continue; }
  const p = r.primary;
  const ch = D.CHAR_BY_ID[p.characterId], ev = D.EVENT_BY_ID[p.eventId];
  if (!ch.eligibleForPrimary) fail('ineligible primary character ' + a);
  if (ev.eligibility !== 'primary') fail('non-primary event as primary ' + a);
  if (ev.characterId !== ch.id) fail('card/character mismatch ' + a);
  if (r.top[0].characterId !== p.characterId) fail('top[0] != primary ' + a);
  if (!p.rarity) fail('missing rarity (index stale?) ' + a + ' ' + p.signatureKey);
  if (!D.SKILL_BY_ID[p.skillId].requiredSignals.every(s => p.matched.includes(s) && r.signals.includes(s))) fail('skill without evidence ' + a);
  if (/[AB]{12}/.test(p.signatureKey)) fail('raw answers in signatureKey');
  if (r.nearTie) nearTie++;
  if (r.top[1] && r.top[1].score === r.top[0].score) exactTie++;
  primaryScores.push(p.score);
  charCount[p.characterId] = (charCount[p.characterId] || 0) + 1;
  eventCount[p.eventId] = (eventCount[p.eventId] || 0) + 1;
  skillCount[p.skillId] = (skillCount[p.skillId] || 0) + 1;
  keyCount[p.signatureKey] = (keyCount[p.signatureKey] || 0) + 1;
  rarityCount[p.rarity]++;
  charRarity[p.characterId] = charRarity[p.characterId] || { N: 0, R: 0, SR: 0, SSR: 0 };
  charRarity[p.characterId][p.rarity]++;
}

// rarity index re-verification
Object.entries(keyCount).forEach(([k, c]) => { if (!R.keys[k] || R.keys[k].patternCount !== c) fail('rarity index mismatch for ' + k); });
const sumKeys = Object.values(keyCount).reduce((a, b) => a + b, 0);
if (sumKeys + lowFit !== 4096) fail('frequency sum mismatch');

// Rarity must not reward a particular answer direction: share of SR/SSR when choosing A vs B per question
const optionBias = [];
for (let qi = 0; qi < 12; qi++) {
  const row = { question: 'Q' + String(qi + 1).padStart(2, '0') };
  ['A', 'B'].forEach(k => {
    let n = 0, high = 0; const chars = {};
    results.forEach((r, a) => { if (a[qi] !== k || !r.primary) return; n++; if (['SR', 'SSR'].includes(r.primary.rarity)) high++; chars[r.primary.characterId] = (chars[r.primary.characterId] || 0) + 1; });
    row[k + '_highRarityShare'] = +(high / n).toFixed(3);
    row[k + '_topCharacter'] = Object.entries(chars).sort((x, y) => y[1] - x[1])[0][0];
  });
  optionBias.push(row);
}

// Sensitivity: 4,096 × 12 single-answer flips = 49,152 directed neighbour comparisons
let flips = 0, changedChar = 0, changedRarity = 0;
results.forEach((r, a) => {
  for (let i = 0; i < 12; i++) {
    const b = a.slice(0, i) + (a[i] === 'A' ? 'B' : 'A') + a.slice(i + 1);
    const s = results.get(b); flips++;
    if ((r.primary && r.primary.characterId) !== (s.primary && s.primary.characterId)) changedChar++;
    if ((r.primary && r.primary.rarity) !== (s.primary && s.primary.rarity)) changedRarity++;
  }
});

// Why characters never appear as primary
const unexposed = D.CHARACTERS.filter(c => !charCount[c.id]).map(c => {
  let reason;
  if (!c.eligibleForPrimary) reason = c.eventIds.some(e => D.EVENT_BY_ID[e].eligibility === 'primary') ? 'flag:primary=false' : 'no primary-eligible event (record limited / reflection·library only)';
  else {
    // best rank the character reaches across all combos
    let bestRank = Infinity;
    results.forEach(r => { const i = r.top.findIndex(t => t.characterId === c.id); if (i >= 0) bestRank = Math.min(bestRank, i + 1); });
    reason = bestRank < Infinity ? 'outscored (appears in TOP3 at best rank ' + bestRank + '): its primary events share common signals with higher-coverage events' : 'algorithm: never reaches TOP3 — signals overlap with events that have more matched questions';
  }
  return { id: c.id, name: c.displayName, eligibleForPrimary: c.eligibleForPrimary, reason, top3Appearances: top3Count[c.id] || 0 };
});

primaryScores.sort((a, b) => a - b);
const q = p => primaryScores[Math.floor(p * (primaryScores.length - 1))];
const summary = {
  dataVersion: D.DATA_VERSION, space: 4096, note: 'equal-weight QA space, not a real user distribution',
  failures: fails.length, failSamples: fails,
  primaryCards: sumKeys, noCardLowFit: lowFit, nearTieRate: +(nearTie / 4096).toFixed(4), exactTop2TieRate: +(exactTie / 4096).toFixed(4),
  top3ShorterThan3: topShort,
  primaryScore: { min: q(0), p25: q(0.25), median: q(0.5), p75: q(0.75), max: q(1) },
  distinctPrimaryCharacters: Object.keys(charCount).length,
  primaryEligibleCharacters: D.CHARACTERS.filter(c => c.eligibleForPrimary).length,
  distinctPrimaryEvents: Object.keys(eventCount).length, distinctSkills: Object.keys(skillCount).length,
  signatureKeys: Object.keys(keyCount).length, rarityCombos: rarityCount,
  rarityKeys: Object.values(R.keys).reduce((a, v) => (a[v.rarity] = (a[v.rarity] || 0) + 1, a), {}),
  sensitivity: { flips, primaryCharacterChanged: +(changedChar / flips).toFixed(4), rarityChanged: +(changedRarity / flips).toFixed(4) },
  maxCharacterShare: +(Math.max(...Object.values(charCount)) / 4096).toFixed(4),
};

const root = path.join(__dirname, '..');
const csv = rows => '﻿' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n';
const rows = [['type', 'id', 'name', 'primaryCount', 'top3Count', 'N', 'R', 'SR', 'SSR', 'note']];
D.CHARACTERS.forEach(c => {
  const cr = charRarity[c.id] || { N: 0, R: 0, SR: 0, SSR: 0 };
  const u = unexposed.find(x => x.id === c.id);
  rows.push(['character', c.id, c.displayName, charCount[c.id] || 0, top3Count[c.id] || 0, cr.N, cr.R, cr.SR, cr.SSR, u ? u.reason : '']);
});
D.EVENTS.forEach(ev => rows.push(['event', ev.id, D.CHAR_BY_ID[ev.characterId].displayName + ' · ' + ev.title, eventCount[ev.id] || 0, '', '', '', '', '', ev.eligibility]));
D.SKILLS.forEach(s => rows.push(['skill', s.id, s.label, skillCount[s.id] || 0, '', '', '', '', '', s.family]));
fs.writeFileSync(path.join(root, 'docs/QA_DISTRIBUTION.csv'), csv(rows));
fs.writeFileSync(path.join(root, 'docs/qa-exhaustive.json'), JSON.stringify({ summary, optionBias, unexposed }, null, 2));

console.log(JSON.stringify(summary, null, 2));
if (fails.length) { console.error('FAILED:', fails.length); fails.forEach(f => console.error(' -', f)); process.exit(1); }
const missingGrades = ['N', 'R', 'SR', 'SSR'].filter(g => !rarityCount[g]);
if (missingGrades.length) console.warn('WARNING: grades not reached:', missingGrades);
console.log('test:exhaustive OK');
