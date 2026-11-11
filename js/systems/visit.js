// visit.js — 남의 집 노크
//
// mode에 따라 진행이 달라진다.
//   normal  : knock → approach(이웃이 문으로) → open → talk → close → (이웃 복귀)
//   refuse  : knock → approach → refuseTalk(문 너머 대사, 문은 안 열림) → (이웃 복귀)
//   silence : knock → silence(인기척 없음, 이웃은 움직이지 않음)
//
// 오늘 처음 → normal / 이미 대화함 → refuse / 오늘 KNOCK_LIMIT번째 이상 → silence
(function (G) {
  'use strict';

  const C = G.config;
  const U = G.util;

  function decideMode(state, id) {
    const n = state.knocksToday[id];
    if (n >= C.KNOCK_LIMIT) return 'silence';
    if (state.talkedToday[id]) return 'refuse';
    return 'normal';
  }

  function start(state, id) {
    state.knocksToday[id] = (state.knocksToday[id] || 0) + 1;
    state.visit = { houseId: id, mode: decideMode(state, id), phase: 'knock', t: 0 };
    state.scene = 'visit';
    const p = state.player;
    p.walking = false;
    p.facing = G.world.doorX(id) < p.x ? 'left' : 'right';   // 문 쪽을 바라봄
  }

  function setPhase(v, phase) { v.phase = phase; v.t = 0; }

  function finish(state) {
    const v = state.visit;
    if (state.npcs[v.houseId]) state.npcs[v.houseId].targetX = state.npcs[v.houseId].homeX;
    state.visit = null;
    state.dialog = null;
    state.scene = 'explore';
  }

  function update(state, input, dt) {
    const v = state.visit;
    if (!v) return;
    const id = v.houseId;
    const r = G.residents[id];
    const npc = state.npcs[id];
    v.t += dt;

    switch (v.phase) {
      case 'knock':
        if (v.t >= C.KNOCK_MS) {
          if (v.mode === 'silence') {
            setPhase(v, 'silence');
          } else {
            npc.targetX = G.world.doorSpotInside(id);
            setPhase(v, 'approach');
          }
        }
        break;

      case 'silence':
        if (v.t >= C.SILENCE_MS) finish(state);
        break;

      case 'approach':
        if (G.npcs.isAt(state, id, npc.targetX)) {
          if (v.mode === 'refuse') {
            state.dialog = { houseId: id, text: r.refuse, through: true };
            setPhase(v, 'refuseTalk');
          } else {
            setPhase(v, 'open');
          }
        }
        break;

      case 'open':
        if (v.t >= C.DOOR_MS) {
          state.dialog = { houseId: id, text: r.greet, through: false };
          setPhase(v, 'talk');
        }
        break;

      case 'talk':
        if (input && input.consumePressed('action')) {
          state.talkedToday[id] = true;
          state.log.push({ day: state.day, houseId: id, text: r.greet });
          state.dialog = null;
          setPhase(v, 'close');
        }
        break;

      case 'refuseTalk':
        if (input && input.consumePressed('action')) finish(state);
        break;

      case 'close':
        if (v.t >= C.DOOR_MS) finish(state);
        break;
    }
  }

  // 집 문이 얼마나 열렸는지 (0~1). 내 집은 doorway.js가 담당.
  function openAmount(state, id) {
    const v = state.visit;
    if (!v || v.houseId !== id) return 0;
    if (v.phase === 'open') return U.progress(v.t, C.DOOR_MS);
    if (v.phase === 'talk') return 1;
    if (v.phase === 'close') return 1 - U.progress(v.t, C.DOOR_MS);
    return 0;
  }

  G.visit = { start: start, update: update, openAmount: openAmount, decideMode: decideMode };
})(window.Game = window.Game || {});
