#!/usr/bin/env node
/* Data integrity checks. This is NOT a theological/content review — that needs a human editor. */
'use strict';
const D = require('../src/data.js');
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

// Characters
if (D.CHARACTERS.length !== 100) err('characters must be 100, got ' + D.CHARACTERS.length);
const ot = D.CHARACTERS.filter(c => c.testament === 'OT').length, nt = D.CHARACTERS.filter(c => c.testament === 'NT').length;
if (ot !== 50 || nt !== 50) err(`OT/NT must be 50/50, got ${ot}/${nt}`);
const ids = new Set();
D.CHARACTERS.forEach(c => { if (ids.has(c.id)) err('duplicate character id ' + c.id); ids.add(c.id); });
const codes = new Set();
D.CHARACTERS.forEach(c => { if (codes.has(c.cardCode)) err('duplicate card code ' + c.cardCode); codes.add(c.cardCode); });
['예수', '하나님', '그리스도'].forEach(n => { if (D.CHARACTERS.some(c => c.displayName === n)) err('forbidden candidate ' + n); });
// same display names must have distinguishing labels
const byName = {};
D.CHARACTERS.forEach(c => { (byName[c.displayName] = byName[c.displayName] || []).push(c); });
Object.entries(byName).forEach(([n, list]) => { if (list.length > 1 && list.some(c => !c.distinguishingLabel)) err('homonym without distinguishing label: ' + n); });

// Questions
if (D.QUESTIONS.length !== 12) err('questions must be 12');
const allTraits = new Set([].concat(...Object.values(D.TRAITS)));
if (allTraits.size !== 24) err('trait tags must be 24, got ' + allTraits.size);
D.QUESTIONS.forEach(q => {
  if (q.options.length !== 2) err(q.id + ' must have exactly 2 options');
  q.options.forEach(o => {
    Object.entries(o.weights).forEach(([t, w]) => {
      if (!allTraits.has(t)) err(`${q.id}${o.key} unknown trait ${t}`);
      if (!(w >= 1 && w <= 3)) err(`${q.id}${o.key} weight out of 1~3: ${t}=${w}`);
    });
    if (!o.signal) err(`${q.id}${o.key} missing behaviour signal`);
  });
});
const perArea = {};
D.QUESTIONS.forEach(q => { perArea[q.area] = (perArea[q.area] || 0) + 1; });
D.AREAS.forEach(a => { if (perArea[a.id] !== 2) err('area ' + a.id + ' must have 2 questions'); });

// Events
const refRe = /^[가-힣]{1,3} \d+/;
const seen = new Set(); const sigSets = new Map();
D.EVENTS.forEach(ev => {
  if (!D.CHAR_BY_ID[ev.characterId]) err('event without character ' + ev.id);
  if (!ev.title || !ev.factualSummary) err('event missing text ' + ev.id);
  if (!refRe.test(ev.scriptureRefs)) err('event reference format ' + ev.id + ' ' + ev.scriptureRefs);
  if (!D.CONTEXTS[ev.context]) err('unknown context ' + ev.id);
  ev.signals.forEach(s => { if (!D.OPT[s]) err('unknown signal ' + s + ' in ' + ev.id); });
  const qs = ev.signals.map(s => D.OPT[s] && D.OPT[s].q);
  if (new Set(qs).size !== qs.length) err('event uses both options of one question: ' + ev.id);
  if ((ev.eligibility === 'primary' || ev.eligibility === 'support') && ev.signals.length < 2) err('matchable event needs ≥2 signals: ' + ev.id);
  const dupKey = ev.characterId + '|' + ev.scriptureRefs;
  if (seen.has(dupKey)) warn('same character+reference twice: ' + dupKey); seen.add(dupKey);
  if (ev.eligibility === 'primary') { const sk = [...ev.signals].sort().join(' '); if (sigSets.has(sk)) warn('identical signal set (always ties): ' + sigSets.get(sk) + ' = ' + ev.id); else sigSets.set(sk, ev.id); }
  if (!D.CONTEXT_TEMPLATES[ev.context]) err('missing template for context ' + ev.context);
});
D.CHARACTERS.forEach(c => { if (!c.eventIds.length) err('character without events ' + c.id); if (c.eventIds.length > 5) err('more than 5 events ' + c.id); });
// negative-event characters must not be primary
['ot-cain', 'nt-judas-iscariot', 'ot-saul', 'nt-ananias-sapphira', 'nt-sapphira'].forEach(id => {
  if (D.CHAR_BY_ID[id].eligibleForPrimary) err('negative-event character eligible for primary: ' + id);
  D.CHAR_BY_ID[id].eventIds.forEach(e => { if (['primary', 'support'].includes(D.EVENT_BY_ID[e].eligibility)) err('negative event matchable: ' + e); });
});

// Skills / rules / templates
const sigs = Object.keys(D.OPT);
sigs.forEach(s => { if (!D.SKILL_BY_ID['sk-' + s]) err('missing base skill for ' + s); if (!D.SIGNAL_TEXT[s] || !D.ACTION_TEXT[s]) err('missing template for ' + s); });
D.SKILLS.forEach(s => s.requiredSignals.forEach(x => { if (!D.OPT[x]) err('skill ' + s.id + ' unknown signal ' + x); }));
D.MATCH_RULES.forEach(r => r.events.forEach(e => { if (!D.EVENT_BY_ID[e]) err('rule ' + r.id + ' unknown event ' + e); else r.all.forEach(s => { if (!D.EVENT_BY_ID[e].signals.includes(s)) warn(`rule ${r.id}: ${e} lacks rule signal ${s} (bonus still evidence-bounded)`); }); }));

// Review status — must not claim approval that never happened
D.EVENTS.concat(D.CHARACTERS).forEach(x => { if (x.reviewStatus === 'approved') err('approved status without human review record: ' + x.id); });

// Rarity index version
try {
  const R = require('../src/rarity-index.js');
  if (R.dataVersion !== D.DATA_VERSION) err('rarity index version mismatch: run npm run generate:rarity');
  if (R.rarityRuleVersion !== D.CONFIG.rarityRuleVersion) err('rarity rule version mismatch');
} catch (e) { err('rarity index missing: run npm run generate:rarity'); }

const ev = D.EVENTS;
const summary = {
  characters: D.CHARACTERS.length, ot, nt,
  primaryEligibleCharacters: D.CHARACTERS.filter(c => c.eligibleForPrimary).length,
  events: ev.length,
  byEligibility: ev.reduce((a, e) => (a[e.eligibility] = (a[e.eligibility] || 0) + 1, a), {}),
  skills: D.SKILLS.length, rules: D.MATCH_RULES.length,
  reviewStatus: 'all draft-needs-human-review',
};
console.log(JSON.stringify(summary, null, 2));
warns.forEach(w => console.warn('warn:', w));
if (errors.length) { errors.forEach(e => console.error('ERROR:', e)); console.error(errors.length + ' error(s)'); process.exit(1); }
console.log('validate:data OK (' + warns.length + ' warning(s))');
