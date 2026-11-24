/* MY FAITH STORY — matching / skill / rarity engine. Pure functions, no I/O, no randomness.
 * Same data version + same answers → same result. Works in the browser (window.MFS_ENGINE) and Node. */
(function (root) {
  'use strict';
  function create(D, rarityIndex) {
    const QN = D.QUESTIONS.length;

    // Denominator per trait: sum over questions of the max weight either option gives that trait.
    const OPPORTUNITY = {};
    D.QUESTIONS.forEach(q => {
      const local = {};
      q.options.forEach(o => Object.entries(o.weights).forEach(([t, w]) => { local[t] = Math.max(local[t] || 0, w); }));
      Object.entries(local).forEach(([t, w]) => { OPPORTUNITY[t] = (OPPORTUNITY[t] || 0) + w; });
    });
    // Specificity: how distinctive a behaviour signal is across the eligible event DB (IDF, 0~1).
    const SIG_COUNT = {}; let NEV = 0;
    D.EVENTS.forEach(ev => { if (ev.eligibility !== 'primary' && ev.eligibility !== 'support') return; NEV++; ev.signals.forEach(s => { SIG_COUNT[s] = (SIG_COUNT[s] || 0) + 1; }); });
    const IDF = {}; let IDF_MAX = 0;
    Object.keys(D.OPT).forEach(s => { IDF[s] = Math.log((NEV + 1) / ((SIG_COUNT[s] || 0) + 1)); IDF_MAX = Math.max(IDF_MAX, IDF[s]); });
    const ALL_TRAITS = [].concat(...Object.values(D.TRAITS));
    const MEASURED = ALL_TRAITS.filter(t => OPPORTUNITY[t] > 0);
    const UNMEASURED = ALL_TRAITS.filter(t => !(OPPORTUNITY[t] > 0));

    /** answers: string of 12 'A'/'B' chars (index 0 = Q01). Returns null when invalid. */
    function normalize(answers) {
      if (Array.isArray(answers)) answers = answers.join('');
      if (typeof answers !== 'string' || answers.length !== QN || !/^[AB]+$/.test(answers)) return null;
      return answers;
    }
    function signalsOf(ans) { return ans.split('').map((c, i) => (i + 1) + c); }

    function userVector(ans) {
      const sum = {};
      signalsOf(ans).forEach(s => Object.entries(D.OPT[s].weights).forEach(([t, w]) => { sum[t] = (sum[t] || 0) + w; }));
      const u = {};
      MEASURED.forEach(t => { u[t] = (sum[t] || 0) / OPPORTUNITY[t]; });
      return u;
    }

    function cosine(u, ev) {
      const keys = Object.keys(ev.traits).filter(t => OPPORTUNITY[t] > 0);
      if (!keys.length) return 0;
      let dot = 0, nu = 0, ne = 0;
      keys.forEach(t => { const a = u[t] || 0, b = ev.traits[t] / 3; dot += a * b; nu += a * a; ne += b * b; });
      if (nu === 0 || ne === 0) return 0;
      return dot / Math.sqrt(nu * ne);
    }

    function scoreEvent(ev, ctx) {
      if (!ev.signals.length) return null;
      const qs = new Set(ev.signals.map(s => D.OPT[s].q));
      const matched = ev.signals.filter(s => ctx.sigSet.has(s));
      const matchedQ = new Set(matched.map(s => D.OPT[s].q)).size;
      const behavior = matchedQ / qs.size;
      const coverage = Math.min(1, matchedQ / D.CONFIG.coverageTarget);
      const cos = cosine(ctx.u, ev);
      const specificity = matched.length ? matched.reduce((a, s) => a + IDF[s], 0) / matched.length / IDF_MAX : 0;
      let bonus = 0; const rules = [];
      D.MATCH_RULES.forEach(r => {
        if (r.events.includes(ev.id) && r.all.every(s => ctx.sigSet.has(s))) { bonus += r.bonus; rules.push(r.id); }
      });
      bonus = Math.max(-D.CONFIG.bonusCap, Math.min(D.CONFIG.bonusCap, bonus));
      const W = D.CONFIG.scoreWeights;
      let score = 100 * (W.cos * cos + W.behavior * behavior + W.coverage * coverage + W.specificity * specificity) + bonus;
      score = Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
      return { eventId: ev.id, characterId: ev.characterId, score, cos, behavior, coverage, specificity, matched, matchedQ, rules, bonus };
    }

    function cmp(a, b) {
      return (b.score - a.score) || (b.matchedQ - a.matchedQ) || (b.coverage - a.coverage) ||
        (b.rules.length - a.rules.length) || (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0);
    }

    /** Skill: first combo skill fully supported by (event signals ∩ user signals), else base skill of the
     *  first matched event signal (authoring order = most characteristic behaviour of the event). */
    function chooseSkill(ev, matched) {
      const m = new Set(matched);
      const combo = D.SKILLS.find(s => s.requiredSignals.length > 1 && s.requiredSignals.every(x => m.has(x)));
      const primary = combo || D.SKILL_BY_ID['sk-' + matched[0]];
      const rest = matched.filter(x => !primary.requiredSignals.includes(x)).map(x => D.SKILL_BY_ID['sk-' + x]);
      const secondary = rest.find(s => s.family !== primary.family) || null;
      return { skill: primary, secondary, secondaryTraits: rest.slice(0, 3) };
    }

    function rarityFor(key) {
      if (!rarityIndex || !rarityIndex.keys) return null;
      const hit = rarityIndex.keys[key];
      return hit ? hit.rarity : null;
    }

    function chart(ans) {
      return D.AREAS.map(area => {
        const qs = D.QUESTIONS.filter(q => q.area === area.id);
        const picks = qs.map(q => ({ questionId: q.id, key: ans[q.n - 1], text: q.options.find(o => o.key === ans[q.n - 1]).text }));
        const aShare = picks.filter(p => p.key === 'A').length / qs.length; // 0, 0.5, 1 — direction, not strength
        return { area: area.id, label: area.label, aShare, aText: area.a, bText: area.b, picks };
      });
    }

    function match(answers) {
      const ans = normalize(answers);
      if (!ans) return { ok: false, error: 'invalid_answers' };
      const sigs = signalsOf(ans);
      const ctx = { sigSet: new Set(sigs), u: userVector(ans) };
      const scored = [];
      D.EVENTS.forEach(ev => {
        if (ev.eligibility !== 'primary' && ev.eligibility !== 'support') return;
        const s = scoreEvent(ev, ctx);
        if (s && s.matchedQ >= D.CONFIG.minEvidenceQuestions) scored.push(s);
      });
      scored.sort(cmp);
      // best event per character
      const bestByChar = new Map();
      scored.forEach(s => { if (!bestByChar.has(s.characterId)) bestByChar.set(s.characterId, s); });
      const bestPrimaryByChar = new Map();
      scored.forEach(s => {
        const ev = D.EVENT_BY_ID[s.eventId];
        if (ev.eligibility === 'primary' && D.CHAR_BY_ID[s.characterId].eligibleForPrimary && !bestPrimaryByChar.has(s.characterId)) bestPrimaryByChar.set(s.characterId, s);
      });
      const primaryList = [...bestPrimaryByChar.values()].sort(cmp);
      const primary = primaryList[0] && primaryList[0].score >= D.CONFIG.minPrimaryScore ? primaryList[0] : null;

      const top = [];
      if (primary) top.push(primary);
      [...bestByChar.values()].sort(cmp).forEach(s => {
        if (top.length >= 3) return;
        if (top.some(t => t.characterId === s.characterId)) return;
        if (s.score < D.CONFIG.minTopScore) return;
        top.push(s);
      });

      const result = {
        ok: true, version: D.DATA_VERSION, rarityRuleVersion: D.CONFIG.rarityRuleVersion,
        answers: ans, signals: sigs, chartData: chart(ans),
        primary: null, top, nearTie: false, lowFit: !primary,
      };
      if (primary) {
        const ev = D.EVENT_BY_ID[primary.eventId];
        const sk = chooseSkill(ev, primary.matched);
        const secondaryFamily = sk.secondary ? sk.secondary.family : 'none';
        const signatureKey = sk.skill.id + '|' + secondaryFamily + '|' + ev.context;
        const ch = D.CHAR_BY_ID[ev.characterId];
        result.primary = {
          characterId: ch.id, eventId: ev.id, score: primary.score, matched: primary.matched, rules: primary.rules,
          evidenceQuestionIds: primary.matched.map(s => 'Q' + String(D.OPT[s].q).padStart(2, '0')),
          skillId: sk.skill.id, secondarySkillId: sk.secondary ? sk.secondary.id : null,
          secondaryTraits: sk.secondaryTraits.map(s => s.id),
          signatureKey, rarity: rarityFor(signatureKey),
          cardVariantId: ev.id + '--' + sk.skill.id,
          cardNumber: ch.cardCode + '-' + String(ev.index).padStart(2, '0'),
        };
        result.nearTie = primaryList[1] ? (primary.score - primaryList[1].score) < D.CONFIG.nearTieGap : false;
        if (result.nearTie) result.coCandidateId = primaryList[1].characterId;
      }
      return result;
    }

    /** Public share hash: character + event only. Never answers, scores or identifiers. */
    function sharePath(characterId, eventId) {
      const ev = D.EVENT_BY_ID[eventId];
      if (!D.CHAR_BY_ID[characterId] || !ev || ev.characterId !== characterId) return '#characters';
      return '#share-' + characterId + '-e' + ev.index;
    }
    function parseSharePath(hash) {
      const m = /^#?share-([a-z0-9-]+)-e(\d+)$/.exec(hash || '');
      if (!m) return null;
      const ev = D.EVENT_BY_ID[m[1] + '-' + m[2]];
      return ev ? { characterId: m[1], eventId: ev.id } : null;
    }

    return { IDF, sharePath, parseSharePath, normalize, signalsOf, userVector, cosine, scoreEvent, chooseSkill, chart, match, rarityFor, MEASURED, UNMEASURED, OPPORTUNITY };
  }

  /** Enumerate all 2^12 answer strings in a stable order. */
  function allAnswers(n) {
    n = n || 12; const out = [];
    for (let i = 0; i < (1 << n); i++) { let s = ''; for (let b = n - 1; b >= 0; b--) s += (i >> b) & 1 ? 'B' : 'A'; out.push(s); }
    return out;
  }

  const api = { create, allAnswers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MFS_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
