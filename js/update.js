// update.js — 매 프레임 규칙 진행. 장면(scene)에 따라 입력을 받을 시스템을 고른다.
(function (G) {
  'use strict';

  function update(state, input, dt) {
    state.time += dt;
    if (input.consumePressed('debug')) state.debug = !state.debug;

    switch (state.scene) {
      case 'explore': updateExplore(state, input, dt); break;
      case 'doorway': G.doorway.update(state, dt); break;
      case 'visit': G.visit.update(state, input, dt); break;
      case 'elevator': break;   // 아래 elevator.update가 입력까지 처리
    }

    // 장면과 무관하게 계속 움직이는 것들
    G.elevator.update(state, state.scene === 'elevator' ? input : null, dt);
    G.npcs.update(state, dt);
  }

  function updateExplore(state, input, dt) {
    const p = state.player;
    const C = G.config;

    // 좌우 이동 (현재 영역 안에서만)
    const h = input.getHorizontal();
    p.walking = !!h;
    if (h) {
      p.facing = h;
      const sign = h === 'left' ? -1 : 1;
      const b = G.world.areaBounds(p.area);
      p.x = G.util.clamp(p.x + sign * C.PLAYER_SPEED * dt / 1000, b.min, b.max);
    }

    // Space: 노크 / 내 집 출입 / 엘리베이터 호출
    if (!input.consumePressed('action')) return;
    const it = G.world.interactionAt(state);
    if (!it) return;
    p.walking = false;
    if (it.type === 'knock') G.visit.start(state, it.houseId);
    else if (it.type === 'enterHome' || it.type === 'exitHome') G.doorway.start(state);
    else if (it.type === 'elevator') G.elevator.call(state);
  }

  G.update = update;
})(window.Game = window.Game || {});
