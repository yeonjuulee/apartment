// visit.js — 남의 집 노크
//
// mode에 따라 진행이 달라진다.
//   normal  : step(경계로 다가감) → knock(두드림) → approach(이웃이 플레이어 앞으로) → talk(증언, 여러 줄) → (이웃 복귀)
//   refuse  : step → knock → refuseTalk(이웃은 나오지 않고 집 안에서 대답)   이웃 💢+발 구르기, 플레이어 💧+축 처짐
//   silence : step → knock → silence(대답 없음, 이웃은 등을 돌림)            이웃 💢💢+부들부들, 플레이어 💧+축 처짐
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

  // 그날의 증언. 없으면 기본 대사(기록 안 됨).
  function testimonyFor(id, day) {
    const r = G.residents[id];
    const t = r.testimony && r.testimony[day];
    return t ? { lines: t.lines, note: t.note } : { lines: [r.idle], note: null };
  }

  function start(state, id) {
    state.knocksToday[id] = (state.knocksToday[id] || 0) + 1;
    state.visit = { houseId: id, mode: decideMode(state, id), phase: 'step', t: 0 };
    state.hints.seen.knock = true;
    state.scene = 'visit';
    const p = state.player;
    p.facing = G.world.boundaryX(id) < p.x ? 'left' : 'right';   // 그 집 쪽을 바라봄
    p.tween = { fromX: p.x, toX: G.world.knockSpot(id), t: 0, ms: C.KNOCK_STEP_MS };
  }

  function setPhase(v, phase) { v.phase = phase; v.t = 0; }

  function finish(state) {
    const v = state.visit;
    const npc = state.npcs[v.houseId];
    if (npc) { npc.targetX = npc.homeX; npc.facing = null; }
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
        if (v.t < C.KNOCK_MS) break;
        if (v.mode === 'silence') {
          npc.facing = G.building.houses[id].slot === 'left' ? 'left' : 'right';  // 복도 반대쪽으로 등을 돌림
          G.emotes.show(state, id, 'anger2', C.SILENCE_MS, 'tremble');           // 부들부들
          G.emotes.show(state, 'player', 'sweat', C.SILENCE_MS, 'slump');        // 축 처짐
          setPhase(v, 'silence');
        } else if (v.mode === 'refuse') {
          state.dialog = { speaker: r.name + '  (집 안에서)', lines: [r.refuse], index: 0 };
          G.emotes.show(state, id, 'anger', null, 'stomp');                      // 발 구르기
          G.emotes.show(state, 'player', 'sweat', null, 'slump');
          setPhase(v, 'refuseTalk');
        } else {
          npc.targetX = G.world.meetSpot(id);
          setPhase(v, 'approach');
        }
        break;

      case 'silence':
        if (v.t >= C.SILENCE_MS) finish(state);
        break;

      case 'approach':
        if (G.npcs.isAt(state, id, npc.targetX)) {
          v.testimony = testimonyFor(id, state.day);
          state.dialog = { speaker: r.name, lines: v.testimony.lines, index: 0 };
          setPhase(v, 'talk');
        }
        break;

      case 'talk':
        if (!input || !input.consumePressed('action')) break;
        state.dialog.index++;
        if (state.dialog.index >= state.dialog.lines.length) {
          state.talkedToday[id] = true;
          if (v.testimony.note) {
            G.notebook.record(state, { day: state.day, type: 'testimony', houseId: id, text: v.testimony.note });
          }
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

  G.visit = { start: start, update: update, decideMode: decideMode, knocking: knocking, testimonyFor: testimonyFor };
})(window.Game = window.Game || {});
