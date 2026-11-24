'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('../../src/data.js');
const E = require('../../src/engine.js');
const R = require('../../src/rarity-index.js');
const eng = E.create(D, R);

test('data: 100 characters, 50/50, 12 questions × 2 options, 24 traits', () => {
  assert.strictEqual(D.CHARACTERS.length, 100);
  assert.strictEqual(D.CHARACTERS.filter(c => c.testament === 'OT').length, 50);
  assert.strictEqual(D.QUESTIONS.length, 12);
  D.QUESTIONS.forEach(q => assert.strictEqual(q.options.length, 2));
  assert.strictEqual([].concat(...Object.values(D.TRAITS)).length, 24);
});

test('unmeasured traits are excluded (not treated as 0)', () => {
  ['intercession', 'reverence', 'dedication', 'hesitation', 'fear', 'avoidance'].forEach(t => assert.ok(eng.UNMEASURED.includes(t)));
  const u = eng.userVector('AAAAAAAAAAAA');
  assert.ok(!('fear' in u));
});

test('invalid answers are rejected', () => {
  assert.strictEqual(eng.match('AAAA').ok, false);
  assert.strictEqual(eng.match('AAAAAAAAAAAC').ok, false);
  assert.strictEqual(eng.match(null).ok, false);
  assert.strictEqual(eng.match('AAAAAAAAAA').ok, false); // old 10-question session
});

test('deterministic: same answers → identical result', () => {
  const a = 'ABABBBABAABA';
  assert.deepStrictEqual(eng.match(a), E.create(D, R).match(a));
});

test('chart shows direction share only (0 / 0.5 / 1)', () => {
  const r = eng.match('AABBABABABAB');
  r.chartData.forEach(c => assert.ok([0, 0.5, 1].includes(c.aShare)));
  assert.strictEqual(r.chartData.find(c => c.area === 'faith').aShare, 1);
  assert.strictEqual(r.chartData.find(c => c.area === 'word').aShare, 0);
});

test('TOP3 has distinct characters and primary first', () => {
  for (const a of ['AAAAAAAAAAAA', 'BBBBBBBBBBBB', 'ABABABABABAB']) {
    const r = eng.match(a);
    assert.strictEqual(new Set(r.top.map(t => t.characterId)).size, r.top.length);
    assert.strictEqual(r.top[0].characterId, r.primary.characterId);
  }
});

test('skill needs evidence in both the answers and the event', () => {
  const r = eng.match('AAAABBBAAAAA'); // 5B + 6B
  const p = r.primary;
  D.SKILL_BY_ID[p.skillId].requiredSignals.forEach(s => {
    assert.ok(r.signals.includes(s));
    assert.ok(D.EVENT_BY_ID[p.eventId].signals.includes(s));
  });
});

test('rarity comes from the static index and is never random', () => {
  const r = eng.match('BABAABBABBAB');
  assert.strictEqual(r.primary.rarity, R.keys[r.primary.signatureKey].rarity);
  assert.ok(!/[AB]{12}/.test(r.primary.signatureKey));
});

test('share path contains no personal data and round-trips', () => {
  const r = eng.match('ABBBAABAABBA');
  const h = eng.sharePath(r.primary.characterId, r.primary.eventId);
  assert.ok(!h.includes(r.answers));
  assert.ok(!/\d+\.\d+/.test(h));
  assert.deepStrictEqual(eng.parseSharePath(h), { characterId: r.primary.characterId, eventId: r.primary.eventId });
  assert.strictEqual(eng.parseSharePath('#share-nt-peter-e99'), null);
});

test('negative-event characters never appear as primary or in TOP3', () => {
  const banned = new Set(['ot-cain', 'nt-judas-iscariot', 'ot-saul', 'nt-ananias-sapphira', 'nt-sapphira']);
  for (const a of E.allAnswers().filter((_, i) => i % 7 === 0)) {
    eng.match(a).top.forEach(t => assert.ok(!banned.has(t.characterId)));
  }
});
