// visit.js — 남의 집 노크
//
// mode에 따라 진행이 달라진다.
//   normal  : step(경계로 다가감) → knock(두드리는 동작) → approach(이웃이 플레이어 앞으로) → talk → (이웃 복귀)
//   refuse  : step → knock → refuseTalk(이웃은 나오지 않고 집 안에서 대답)
//   silence : step → knock → silence(인기척 없음)
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
    state.visit = { houseId: id, mode: decideMode(state, id), phase: 'step', t: 0 };
    state.scene = 'visit';
    const p = state.player;
    p.facing = G.world.boundaryX(id) < p.x ? 'left' : 'right';   // 그 집 쪽을 바라봄
    p.tween = { fromX: p.x, toX: G.world.knockSpot(id), t: 0, ms: C.KNOCK_STEP_MS };
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
    const p = state.player;
    v.t += dt;

    switch (v.phase) {
      case 'step':
        p.walking = true;
        if (U.stepTween(p, p.tween, dt)) {
          p.tween = null;
          p.walking = false;
          setPhase(v, 'knock');
        }
        break;

      case 'knock':
        if (v.t >= C.KNOCK_MS) {
          if (v.mode === 'silence') {
            setPhase(v, 'silence');
          } else if (v.mode === 'refuse') {
            state.dialog = { houseId: id, text: r.refuse, fromInside: true };
            setPhase(v, 'refuseTalk');
          } else {
            npc.targetX = G.world.meetSpot(id);
            setPhase(v, 'approach');
          }
        }
        break;

      case 'silence':
        if (v.t >= C.SILENCE_MS) finish(state);
        break;

      case 'approach':
        if (G.npcs.isAt(state, id, npc.targetX)) {
          state.dialog = { houseId: id, text: r.greet, fromInside: false };
          setPhase(v, 'talk');
        }
        break;

      case 'talk':
        if (input && input.consumePressed('action')) {
          state.talkedToday[id] = true;
          state.log.push({ day: state.day, houseId: id, text: r.greet });
          finish(state);
        }
        break;

      case 'refuseTalk':
        if (input && input.consumePressed('action')) finish(state);
        break;
    }
  }

  // 화면용: 지금 두드리는 중인가 + 진행 시간
  function knocking(state) {
    const v = state.visit;
    return v && v.phase === 'knock' ? v.t : null;
  }

  G.visit = { start: start, update: update, decideMode: decideMode, knocking: knocking };
})(window.Game = window.Game || {});
