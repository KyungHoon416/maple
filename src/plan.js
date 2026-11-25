/* MY FAITH STORY — 7-day meditation plan.
 * Built only from PUBLIC content (a character + one of its events), never from answers or scores,
 * so a plan link (#plan-<characterId>-e<n>) carries no personal data. Pure + deterministic.
 * Scripture is given as references only (read in your own Bible); texts are the service's own wording. */
(function (root) {
  'use strict';
  // Companion passages per situation type (references only; reviewed=false until a human editor approves)
  const CONTEXT_REFS = {
    wait: [['시 27:13-14', '여호와를 기다리라'], ['사 40:28-31', '여호와를 앙망하는 자'], ['애 3:22-26', '여호와를 기다리는 자에게 선하시도다']],
    meditate: [['시 1:1-3', '주야로 묵상하는 자'], ['시 119:97-105', '내 발에 등이요'], ['수 1:8', '주야로 묵상하여']],
    act: [['약 1:22-25', '말씀을 행하는 자'], ['마 7:24-27', '반석 위에 지은 집'], ['미 6:8', '정의와 인자와 겸손']],
    restore: [['시 51:10-12', '정한 마음을 창조하시고'], ['애 3:22-23', '아침마다 새로우니'], ['요일 1:9', '우리 죄를 자백하면']],
    serve: [['마 25:34-40', '지극히 작은 자 하나에게'], ['갈 6:9-10', '선을 행하되 낙심하지 말자'], ['벧전 4:10', '받은 은사대로 서로 봉사하라']],
    worship: [['시 100', '감사함으로 그 문에 들어가며'], ['시 103:1-5', '그의 모든 은택을 잊지 말지어다'], ['골 3:16-17', '감사하는 마음으로 찬양하고']],
    courage: [['수 1:9', '강하고 담대하라'], ['시 46:1-3', '피난처시요 힘이시니'], ['사 41:10', '두려워하지 말라']],
    lament: [['시 13', '어느 때까지니이까'], ['시 42:5', '내 영혼아 네가 어찌하여'], ['마 11:28-30', '수고하고 무거운 짐 진 자들아']],
    learn: [['잠 2:1-6', '명철을 얻으려고 소리를 높이며'], ['약 1:5', '지혜가 부족하거든'], ['시 25:4-5', '주의 길을 내게 보이시고']],
    reconcile: [['마 5:23-24', '먼저 가서 형제와 화목하고'], ['롬 12:17-18', '모든 사람과 더불어 화목하라'], ['엡 4:31-32', '서로 친절하게 하며']],
    pray: [['마 6:6-13', '골방에 들어가 문을 닫고'], ['살전 5:16-18', '쉬지 말고 기도하라'], ['빌 4:6-7', '아무 것도 염려하지 말고']],
  };
  const SHORT_PRAYER = {
    wait: '기다리는 오늘도 주님을 신뢰하게 해 주세요.', meditate: '오늘 읽은 말씀이 제 마음에 머물게 해 주세요.',
    act: '알게 된 말씀을 작은 행동으로 옮기게 해 주세요.', restore: '다시 시작할 힘을 주세요.',
    serve: '제 곁의 필요를 보는 눈을 주세요.', worship: '받은 은혜를 기억하며 감사하게 해 주세요.',
    courage: '두려움 속에서도 한 걸음 내딛게 해 주세요.', lament: '지친 마음을 주님께 그대로 드립니다.',
    learn: '묻고 배우는 마음을 지켜 주세요.', reconcile: '먼저 듣고 화해의 말을 건네게 해 주세요.',
    pray: '오늘도 기도의 자리를 지키게 해 주세요.',
  };

  function create(D) {
    const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return w + b; return w + ((c - 0xAC00) % 28 ? a : b); };
    const usable = e => e.eligibility === 'primary' || e.eligibility === 'support';

    function slug(characterId, eventId) {
      const ev = D.EVENT_BY_ID[eventId];
      return ev && ev.characterId === characterId && D.CHAR_BY_ID[characterId] ? characterId + '-e' + ev.index : null;
    }
    function parse(hash) {
      const m = /^#?plan-([a-z0-9-]+)-e(\d+)$/.exec(hash || '');
      if (!m) return null;
      const ev = D.EVENT_BY_ID[m[1] + '-' + m[2]];
      return ev && usable(ev) ? { characterId: m[1], eventId: ev.id } : null;
    }

    /** Another character whose matchable event shares the situation type: a deterministic "companion story". */
    function companion(ev) {
      const pool = D.EVENTS.filter(e => e.eligibility === 'primary' && e.context === ev.context && e.characterId !== ev.characterId);
      if (!pool.length) return null;
      let h = 0; for (const ch of ev.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return pool[h % pool.length];
    }

    function build(characterId, eventId) {
      const ch = D.CHAR_BY_ID[characterId], ev = D.EVENT_BY_ID[eventId];
      if (!ch || !ev || ev.characterId !== ch.id) return null;
      const ctx = ev.context, refs = CONTEXT_REFS[ctx], tpl = D.CONTEXT_TEMPLATES[ctx];
      const others = ch.eventIds.map(id => D.EVENT_BY_ID[id]).filter(e => e.id !== ev.id && usable(e));
      const comp = companion(ev);
      const sigs = ev.signals.length ? ev.signals : ['3A', '7A', '11A'];
      const act = i => D.ACTION_TEXT[sigs[i % sigs.length]];
      const name = ch.displayName;
      const day = (n, kind, title, ref, note, question, action) => ({ day: n, kind, title, ref, note, question, action, prayer: SHORT_PRAYER[ctx] });
      const days = [
        day(1, 'event', `${name}의 장면: ${ev.title}`, ev.scriptureRefs, ev.factualSummary,
          `이 장면에서 ${josa(name, '이', '가')} 한 행동 가운데 지금 나에게 가장 가까운 것은 무엇인가요?`, act(0)),
        others[0]
          ? day(2, 'character', `${name} 더 알기: ${others[0].title}`, others[0].scriptureRefs, others[0].factualSummary,
            `어제 읽은 장면과 오늘 장면에서 ${josa(name, '은', '는')} 어떻게 같고 또 어떻게 다른가요?`, act(1))
          : day(2, 'context', `말씀으로 이어 읽기: ${refs[2][1]}`, refs[2][0], '어제 장면과 같은 주제의 말씀이에요.',
            '어제 장면과 오늘 말씀을 함께 보면 어떤 마음이 드나요?', act(1)),
        day(3, 'context', `오늘의 말씀: ${refs[0][1]}`, refs[0][0], `${D.CONTEXTS[ctx]}에 관한 말씀이에요.`,
          `이 말씀이 오늘 나의 ‘${D.CONTEXTS[ctx]}’에 건네는 한 문장을 적어 보세요.`, act(2)),
        comp
          ? day(4, 'companion', `닮은 이야기: ${D.CHAR_BY_ID[comp.characterId].displayName} · ${comp.title}`, comp.scriptureRefs, comp.factualSummary,
            `${josa(name, '과', '와')} ${D.CHAR_BY_ID[comp.characterId].displayName}의 이야기에서 함께 보이는 모습은 무엇인가요?`, act(3))
          : day(4, 'context', `오늘의 말씀: ${refs[2][1]}`, refs[2][0], `${D.CONTEXTS[ctx]}에 관한 말씀이에요.`, '이 말씀을 읽고 떠오른 사람이 있나요?', act(3)),
        day(5, 'context', `오늘의 말씀: ${refs[1][1]}`, refs[1][0], `${D.CONTEXTS[ctx]}에 관한 말씀이에요.`,
          tpl.q, act(4)),
        others[1]
          ? day(6, 'share', `나누는 날: ${others[1].title}`, others[1].scriptureRefs, others[1].factualSummary,
            '이번 주에 받은 은혜 한 가지를 누구와 나눌 수 있을까요?', D.ACTION_TEXT['4B'])
          : day(6, 'share', `나누는 날: ${refs[2][1]}`, refs[2][0], '이번 주의 묵상을 한 사람과 나눠 보는 날이에요.',
            '이번 주에 받은 은혜 한 가지를 누구와 나눌 수 있을까요?', D.ACTION_TEXT['4B']),
        day(7, 'review', `다시 읽기: ${ev.title}`, ev.scriptureRefs, '첫날의 장면을 다시 읽고 한 주를 돌아보는 날이에요.',
          '7일 전과 지금, 같은 장면이 다르게 읽히는 부분이 있나요? 나만의 기도문을 한 줄 적어 보세요.', '이번 주 묵상 노트에서 가장 마음에 남은 한 문장을 골라 보세요.'),
      ];
      return {
        slug: slug(ch.id, ev.id), characterId: ch.id, eventId: ev.id, context: ctx,
        title: `${name}와 함께하는 7일`.replace(name + '와', josa(name, '과', '와')),
        intro: `${ev.scriptureRefs} ‘${ev.title}’ 장면에서 시작해, ${D.CONTEXTS[ctx]}을 주제로 일주일 동안 말씀을 읽고 묵상해요.`,
        closingPrayer: tpl.prayer, days,
      };
    }
    return { build, slug, parse, CONTEXT_REFS };
  }
  const api = { create, CONTEXT_REFS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MFS_PLAN = api;
})(typeof window !== 'undefined' ? window : globalThis);
