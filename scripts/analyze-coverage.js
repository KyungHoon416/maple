#!/usr/bin/env node
/* Diagnostics for result concentration: who dominates, who never appears, and why. */
'use strict';
const D = require('../src/data.js'), E = require('../src/engine.js');
const eng = E.create(D, null);
const all = E.allAnswers();
const prim = {}, top3 = {}, beatBy = {};
const results = all.map(a => eng.match(a));
results.forEach(r => {
  if (!r.primary) return;
  prim[r.primary.characterId] = (prim[r.primary.characterId] || 0) + 1;
  r.top.forEach(t => { top3[t.characterId] = (top3[t.characterId] || 0) + 1; });
});
const elig = D.CHARACTERS.filter(c => c.eligibleForPrimary);
const shown = elig.filter(c => prim[c.id]);
const sorted = Object.entries(prim).sort((a, b) => b[1] - a[1]);
console.log('primary-eligible', elig.length, 'appear as primary', shown.length, 'max share', (sorted[0][1] / 4096 * 100).toFixed(1) + '%');
console.log('top10', sorted.slice(0, 10).map(([k, v]) => D.CHAR_BY_ID[k].displayName + ':' + v).join(' '));
if (process.argv.includes('--detail')) {
  // for each unexposed eligible character: best possible own-event score when all its signals match, and the winner in that case
  elig.filter(c => !prim[c.id]).forEach(c => {
    const evs = c.eventIds.map(id => D.EVENT_BY_ID[id]).filter(e => e.eligibility === 'primary');
    const best = evs.map(ev => {
      // build an answer string that matches this event fully, rest A
      const arr = Array(12).fill('A'); ev.signals.forEach(s => { arr[D.OPT[s].q - 1] = s.slice(-1); });
      const r = eng.match(arr.join(''));
      const mine = r.top.find(t => t.characterId === c.id);
      return `${ev.title}[${ev.signals.join(' ')}] → winner ${D.CHAR_BY_ID[r.primary.characterId].displayName} ${r.primary.score} / mine ${mine ? mine.score : '-'}`;
    });
    console.log('-', c.displayName, '|', best.join(' || '));
  });
}
