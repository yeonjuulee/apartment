// doorway.js — 내 집 문 드나들기
// 단계: open(문 열림) → walk(문을 지나감) → close(문 닫힘)
(function (G) {
  'use strict';

  const C = G.config;
  const U = G.util;

  function start(state) {
    const p = state.player;
    const toArea = p.area === 'home' ? 'hallway' : 'home';
    state.doorway = { toArea: toArea, phase: 'open', t: 0 };
    state.scene = 'doorway';
    p.walking = false;
    p.facing = p.x < G.world.doorX(G.building.playerHome) ? 'right' : 'left';
  }

  function update(state, dt) {
    const d = state.doorway;
    const p = state.player;
    if (!d) return;
    d.t += dt;

    if (d.phase === 'open' && d.t >= C.DOOR_MS) {
      const b = G.world.areaBounds(d.toArea);
      const goingRight = p.facing === 'right';
      const toX = goingRight ? b.min + 14 : b.max - 14;
      p.tween = { fromX: p.x, toX: toX, t: 0, ms: C.DOORWAY_MS };
      d.phase = 'walk'; d.t = 0;
    } else if (d.phase === 'walk') {
      p.walking = true;
      if (U.stepTween(p, p.tween, dt)) {
        p.tween = null;
        p.walking = false;
        p.area = d.toArea;
        d.phase = 'close'; d.t = 0;
      }
    } else if (d.phase === 'close' && d.t >= C.DOOR_MS) {
      state.doorway = null;
      state.scene = 'explore';
    }
  }

  // 내 집 문이 얼마나 열렸는지 (0~1)
  function openAmount(state) {
    const d = state.doorway;
    if (!d) return 0;
    if (d.phase === 'open') return U.progress(d.t, C.DOOR_MS);
    if (d.phase === 'walk') return 1;
    return 1 - U.progress(d.t, C.DOOR_MS);
  }

  G.doorway = { start: start, update: update, openAmount: openAmount };
})(window.Game = window.Game || {});
