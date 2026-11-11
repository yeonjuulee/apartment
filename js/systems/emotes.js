// emotes.js — 감정 이펙트 (머리 위 기호 + 몸짓)
// 기호(type): 'anger'(💢) | 'anger2'(💢💢) | 'sweat'(💧) | 'surprise'(❗)
// 몸짓(gesture): 'tremble'(부들부들) | 'jump'(깜짝 뜀) | 'slump'(축 처짐) | 'stomp'(발 구르기) | null
// 대상: 'player' 또는 집 호수('301' 등)
// 기본 대화 중에는 쓰지 않는다. 감정이 생기는 순간에만 쓴다.
(function (G) {
  'use strict';

  // 같은 대상에 이미 이펙트가 있으면 새 것으로 바꾼다
  function show(state, target, type, ms, gesture) {
    state.emotes = state.emotes.filter(function (e) { return e.target !== target; });
    state.emotes.push({ target: target, type: type, gesture: gesture || null, t: 0, ms: ms || G.config.EMOTE_MS });
  }

  function update(state, dt) {
    state.emotes.forEach(function (e) { e.t += dt; });
    state.emotes = state.emotes.filter(function (e) { return e.t < e.ms; });
  }

  function of(state, target) {
    return state.emotes.find(function (e) { return e.target === target; }) || null;
  }

  G.emotes = { show: show, update: update, of: of };
})(window.Game = window.Game || {});
