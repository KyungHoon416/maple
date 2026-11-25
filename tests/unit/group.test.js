'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('../../src/data.js');
const G = require('../../src/group.js').create(D);

test('every matchable event yields a 5-part guide with observation/interpretation/application questions', () => {
  D.EVENTS.filter(e => e.eligibility === 'primary' || e.eligibility === 'support').forEach(e => {
    const g = G.build(e.characterId, e.id);
    assert.ok(g, e.id);
    assert.strictEqual(g.sections.length, 5);
    const kinds = g.sections[2].questions.map(q => q.kind);
    ['관찰', '해석', '적용'].forEach(k => assert.ok(kinds.includes(k), e.id + ' ' + k));
    assert.strictEqual(g.sections.reduce((a, s) => a + s.minutes, 0), 60);
  });
});
test('guides never built for reflection/library events; links round-trip', () => {
  assert.strictEqual(G.build('ot-cain', 'ot-cain-1'), null);
  assert.deepStrictEqual(G.parse('#group-nt-barnabas-e2'), { characterId: 'nt-barnabas', eventId: 'nt-barnabas-2' });
  assert.strictEqual(G.parse('#group-nt-judas-iscariot-e1'), null);
});
test('copy text contains the guide and the rarity disclaimer', () => {
  const t = G.toText(G.build('nt-barnabas', 'nt-barnabas-2'));
  assert.ok(t.startsWith('[소그룹 나눔 가이드]'));
  assert.ok(t.includes('신앙 수준이 아니에요'));
});
