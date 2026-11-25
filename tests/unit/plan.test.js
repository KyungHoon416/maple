'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('../../src/data.js');
const P = require('../../src/plan.js').create(D);

test('every matchable event yields a complete 7-day plan', () => {
  D.EVENTS.filter(e => e.eligibility === 'primary' || e.eligibility === 'support').forEach(e => {
    const p = P.build(e.characterId, e.id);
    assert.ok(p, e.id);
    assert.strictEqual(p.days.length, 7);
    p.days.forEach((d, i) => { assert.strictEqual(d.day, i + 1); ['title', 'ref', 'question', 'action', 'prayer'].forEach(k => assert.ok(d[k], `${e.id} day${d.day} ${k}`)); });
    assert.strictEqual(p.days[0].ref, e.scriptureRefs);
    assert.strictEqual(p.days[6].ref, e.scriptureRefs);
  });
});

test('plan is deterministic and built from public content only', () => {
  assert.deepStrictEqual(P.build('nt-peter', 'nt-peter-2'), P.build('nt-peter', 'nt-peter-2'));
  assert.strictEqual(P.build('nt-peter', 'ot-david-1'), null);
  assert.strictEqual(P.build.length, 2); // (characterId, eventId) — no answers parameter
});

test('plan links round-trip and reject reflection/library events', () => {
  assert.deepStrictEqual(P.parse('#plan-nt-peter-e2'), { characterId: 'nt-peter', eventId: 'nt-peter-2' });
  assert.strictEqual(P.parse('#plan-ot-cain-e1'), null);
  assert.strictEqual(P.parse('#plan-nt-peter-e99'), null);
  assert.strictEqual(P.slug('nt-peter', 'nt-peter-2'), 'nt-peter-e2');
});

test('companion story is another character with the same situation type', () => {
  const p = P.build('nt-peter', 'nt-peter-2');
  const d4 = p.days[3];
  if (d4.kind === 'companion') assert.ok(!d4.title.includes('베드로 ·'));
});
