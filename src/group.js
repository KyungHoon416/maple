/* MY FAITH STORY — small-group sharing guide.
 * Built only from PUBLIC content (a character + one of its events), never from answers or scores.
 * Pure + deterministic. Scripture as references only; questions are the service's own wording (draft). */
(function (root) {
  'use strict';
  // Interpretation question per situation type (what the scene says about God / faith life)
  const INTERPRET = {
    wait: '기다리는 동안 이 인물이 붙든 것은 무엇이었을까요? 우리에게 기다림은 어떤 시간인가요?',
    meditate: '이 장면에서 말씀을 듣고 머무는 시간은 어떤 변화를 가져왔나요?',
    act: '다 이해하지 못한 채 한 걸음을 내딛게 한 힘은 무엇이었을까요?',
    restore: '넘어진 뒤 다시 시작할 수 있었던 이유는 무엇이라고 생각하나요?',
    serve: '이 섬김은 누구의 필요를 보았기에 시작될 수 있었을까요?',
    worship: '이 찬양과 감사는 어떤 상황에서 나왔나요? 상황과 고백 사이의 거리를 이야기해 봐요.',
    courage: '두려움이 사라진 것이 아니라면, 무엇이 이 인물을 앞으로 나아가게 했을까요?',
    lament: '하나님 앞에서 솔직하게 탄식하는 것은 믿음과 어떤 관계가 있을까요?',
    learn: '이 인물의 질문은 믿음을 약하게 했나요, 더 깊게 했나요?',
    reconcile: '이 장면에서 관계가 회복되기 위해 누가 먼저 무엇을 했나요?',
    pray: '이 기도는 어떤 마음에서 시작되었고, 기도하는 동안 무엇이 달라졌나요?',
  };
  // Application question per behaviour signal (turns the recorded behaviour into a group question)
  const APPLY = {
    '1A': '어려운 일이 생겼을 때 기도로 먼저 시작해 본 경험이 있나요?', '1B': '최근 막힌 문제 앞에서 직접 길을 찾아 움직여 본 일이 있나요?',
    '2A': '말씀에서 쉽게 이해되지 않았던 부분을 어떻게 붙들고 있나요?', '2B': '다 이해되지 않아도 작게 순종해 본 경험을 나눠 볼까요?',
    '3A': '요즘 오래 붙들고 있는 말씀 한 구절이 있나요?', '3B': '말씀이 실제 행동으로 이어졌던 순간을 나눠 볼까요?',
    '4A': '혼자 조용히 나를 돌아보는 시간은 언제, 어떻게 갖고 있나요?', '4B': '누군가와 말씀을 나누며 새롭게 깨달은 경험이 있나요?',
    '5A': '하나님께 솔직하게 말하기 어려운 마음이 있다면 어떤 것일까요?', '5B': '나만의 기도 시간이나 습관이 있다면 나눠 볼까요?',
    '6A': '지쳐서 잠시 쉬어 가야 했던 때, 하나님은 어떻게 느껴졌나요?', '6B': '오래 기도해 온 제목이 있나요? 그 기다림은 어떤가요?',
    '7A': '예배 중 말씀이 마음에 머물렀던 순간을 나눠 볼까요?', '7B': '이번 주 감사의 고백 한 가지를 나눠 볼까요?',
    '8A': '지난 예배나 묵상에서 아직 마음에 남은 것이 있나요?', '8B': '예배에서 받은 것을 일상의 행동으로 옮겨 본 적이 있나요?',
    '9A': '넘어진 뒤 작은 것부터 다시 시작했던 경험이 있나요?', '9B': '요즘 오래 생각하며 정리하고 있는 고민이 있나요?',
    '10A': '힘들 때 도움을 구할 수 있는 사람이 곁에 있나요? 우리 모임은 그런 곳인가요?', '10B': '혼자 생각할 시간이 나에게 어떤 도움이 되나요?',
    '11A': '최근 누군가를 격려하거나 격려받은 경험을 나눠 볼까요?', '11B': '이번 주 내 주변에서 눈에 띈 구체적인 필요가 있나요?',
    '12A': '갈등이 생겼을 때 먼저 대화를 시도해 본 경험이 있나요?', '12B': '마음을 가라앉히고 관계를 돌아본 경험을 나눠 볼까요?',
  };
  const LEADER_TIPS = [
    '카드 등급(C·U·R·RR·SR·UR)은 특기 조합의 희귀도일 뿐, 신앙의 높고 낮음이 아니에요. 등급 비교가 되지 않도록 안내해 주세요.',
    '결과는 각자 원하는 만큼만 나누면 돼요. 결과를 보여 달라고 요구하지 않아요.',
    '정답을 찾는 시간이 아니라 서로의 이야기를 듣는 시간이에요. 판단하거나 고쳐 주기보다 들어 주세요.',
    '성경 본문은 각자의 성경으로 함께 읽어 주세요. 이 가이드는 장절과 질문만 담고 있어요.',
    '나눔에서 들은 개인적인 이야기는 모임 밖으로 옮기지 않기로 약속해 주세요.',
  ];

  function create(D) {
    const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return w + b; return w + ((c - 0xAC00) % 28 ? a : b); };
    const usable = e => e.eligibility === 'primary' || e.eligibility === 'support';
    function slug(characterId, eventId) {
      const ev = D.EVENT_BY_ID[eventId];
      return ev && ev.characterId === characterId && D.CHAR_BY_ID[characterId] ? characterId + '-e' + ev.index : null;
    }
    function parse(hash) {
      const m = /^#?group-([a-z0-9-]+)-e(\d+)$/.exec(hash || '');
      if (!m) return null;
      const ev = D.EVENT_BY_ID[m[1] + '-' + m[2]];
      return ev && usable(ev) ? { characterId: m[1], eventId: ev.id } : null;
    }
    function build(characterId, eventId) {
      const ch = D.CHAR_BY_ID[characterId], ev = D.EVENT_BY_ID[eventId];
      if (!ch || !ev || ev.characterId !== ch.id || !usable(ev)) return null;
      const name = ch.displayName, tpl = D.CONTEXT_TEMPLATES[ev.context];
      const apply = ev.signals.slice(0, 2).map(s => APPLY[s]);
      const sections = [
        { minutes: 5, title: '여는 시간', items: [
          '짧게 기도하며 모임을 시작해요.',
          '테스트를 해 본 사람은 원하는 만큼 자기 카드의 인물과 대표 특기를 한 문장으로 소개해요. (등급 말고 특기 이야기를 나눠 주세요.)',
          '테스트를 안 해 본 사람도 괜찮아요. “요즘 나와 닮았다고 느끼는 성경 인물”을 자유롭게 말해 봐요.' ] },
        { minutes: 10, title: '말씀 함께 읽기', ref: ev.scriptureRefs, items: [
          `${ev.scriptureRefs}을 돌아가며 소리 내어 읽어요.`,
          `줄거리 확인: ${ev.factualSummary}` ] },
        { minutes: 30, title: '나눔 질문', questions: [
          { kind: '관찰', q: `본문에서 ${josa(name, '이', '가')} 한 말과 행동을 순서대로 짚어 볼까요?` },
          { kind: '해석', q: INTERPRET[ev.context] },
          ...apply.map(q => ({ kind: '적용', q })),
          { kind: '함께', q: '서로 받은 카드가 다르다면, 다른 인물의 모습에서 배우고 싶은 점은 무엇인가요?' } ] },
        { minutes: 10, title: '함께 실천하기', items: [
          `이번 주 모두가 해 볼 한 가지: ${D.ACTION_TEXT[ev.signals[0] || '11A']}`,
          `돌아볼 질문을 하나씩 품고 헤어져요: ${tpl.q}` ] },
        { minutes: 5, title: '마치는 기도', items: ['서로의 기도 제목을 한 가지씩 나누고 짝을 지어 기도해요.', tpl.prayer] },
      ];
      return {
        slug: slug(ch.id, ev.id), characterId: ch.id, eventId: ev.id, context: ev.context,
        title: `${name} · ${ev.title}`, subtitle: `소그룹 나눔 가이드 · 약 60분`,
        sections, tips: LEADER_TIPS.slice(),
      };
    }
    /** Plain text for pasting into a group chat. */
    function toText(g, url) {
      const lines = [`[소그룹 나눔 가이드] ${g.title}`, g.subtitle, ''];
      g.sections.forEach((s, i) => {
        lines.push(`${i + 1}. ${s.title} (${s.minutes}분)`);
        (s.items || []).forEach(t => lines.push(` - ${t}`));
        (s.questions || []).forEach(q => lines.push(` - [${q.kind}] ${q.q}`));
        lines.push('');
      });
      lines.push('※ 카드 등급은 신앙 수준이 아니에요. 결과는 원하는 만큼만 나눠요.');
      if (url) lines.push(url);
      return lines.join('\n');
    }
    return { build, slug, parse, toText, LEADER_TIPS };
  }
  const api = { create, INTERPRET, APPLY, LEADER_TIPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MFS_GROUP = api;
})(typeof window !== 'undefined' ? window : globalThis);
