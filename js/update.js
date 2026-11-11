// update.js — 게임 규칙 (상태를 바꾸는 유일한 곳)
(function (G) {
  'use strict';

  function update(state, input, dt) {
    state.time += dt;
    if (input.consumePressed('debug')) state.debug = !state.debug;

    if (state.scene === 'explore') updateExplore(state, input, dt);
    // 이후: else if (state.scene === 'dialog') updateDialog(state, input, dt); ...
  }

  function updateExplore(state, input, dt) {
    const p = state.player;
    const C = G.config;

    // 1) 계단 이동 중에는 다른 입력을 받지 않는다
    if (p.floorMove) {
      p.walking = false;
      p.floorMove.t += dt / C.FLOOR_MOVE_MS;
      if (p.floorMove.t >= 1) {
        p.floor = p.floorMove.to;
        p.floorMove = null;
      }
      return;
    }

    // 2) 좌우 이동 (외벽에서 멈춤)
    const h = input.getHorizontal();
    p.walking = !!h;
    if (h) {
      p.facing = h;
      const sign = h === 'left' ? -1 : 1;
      const b = G.world.xBounds();
      p.x = Math.max(b.min, Math.min(b.max, p.x + sign * C.PLAYER_SPEED * dt / 1000));
    }

    // 3) 계단실에서만 층 이동 (한 번 누르면 한 층)
    const up = input.consumePressed('up');
    const down = input.consumePressed('down');
    const dir = up ? 1 : down ? -1 : 0;
    if (dir) {
      const to = G.world.floorTarget(state, dir);
      if (to !== null) p.floorMove = { from: p.floor, to: to, t: 0 };
    }
  }

  G.update = update;
})(window.Game = window.Game || {});
