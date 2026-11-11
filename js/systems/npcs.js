// npcs.js — 이웃 이동: targetX를 향해 걸어간다. 어디로 갈지는 visit.js가 정한다.
(function (G) {
  'use strict';

  function update(state, dt) {
    const speed = G.config.NPC_SPEED * dt / 1000;
    Object.keys(state.npcs).forEach(function (id) {
      const n = state.npcs[id];
      const dx = n.targetX - n.x;
      if (Math.abs(dx) <= speed) {
        const arrivedHome = n.walking && n.targetX === n.homeX;
        n.x = n.targetX;
        n.walking = false;
        if (arrivedHome) n.facing = null;   // 제자리에 돌아오면 평소 방향으로
      } else {
        n.x += Math.sign(dx) * speed;
        n.walking = true;
        n.facing = dx > 0 ? 'right' : 'left';
      }
    });
  }

  function isAt(state, id, x) { return state.npcs[id].x === x; }

  // 아침: 모두 제자리로
  function resetAll(state) {
    Object.keys(state.npcs).forEach(function (id) {
      const n = state.npcs[id];
      n.x = n.targetX = n.homeX;
      n.walking = false;
      n.facing = null;
    });
  }

  G.npcs = { update: update, isAt: isAt, resetAll: resetAll };
})(window.Game = window.Game || {});
