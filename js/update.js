// update.js — 매 프레임 규칙 진행. 장면(scene)에 따라 입력을 받을 시스템을 고른다.
(function (G) {
  'use strict';

  function update(state, input, dt) {
    state.time += dt;
    if (input.consumePressed('debug')) state.debug = !state.debug;

    // 수첩 열기: Tab 또는 상단 아이콘 클릭 (낮 / 침대 메뉴 / 지목 중에만)
    const click = input.consumeClick ? input.consumeClick() : null;
    if (G.notebook.canOpen(state) && (input.consumePressed('notebook') || G.notebook.hitIcon(click))) {
      G.notebook.open(state);
      return;
    }
    if (state.scene === 'notebook' && G.notebook.hitIcon(click)) {
      G.notebook.close(state);
      return;
    }

    switch (state.scene) {
      case 'explore': updateExplore(state, input, dt); break;
      case 'visit': G.visit.update(state, input, dt); break;
      case 'elevator': break;   // 아래 elevator.update가 입력까지 처리
      case 'notebook': G.notebook.update(state, input); break;
      case 'endDay': G.dayflow.updateEndDay(state, input); break;
      case 'night': G.dayflow.updateNight(state, input, dt); break;
      case 'accuse': G.accuse.update(state, input); break;
      case 'cutscene': G.cutscene.update(state, input, dt); break;
    }

    G.notebook.updateToast(state, dt);
    G.hints.update(state);
    if (state.scene === 'notebook') return;   // 수첩이 열려 있으면 게임은 멈춤

    G.elevator.update(state, state.scene === 'elevator' ? input : null, dt);
    G.npcs.update(state, dt);
    G.emotes.update(state, dt);
  }

  function updateExplore(state, input, dt) {
    const p = state.player;
    const C = G.config;

    // 좌우 이동 (복도 + 내 집, 남의 집 경계에서 멈춤)
    const h = input.getHorizontal();
    p.walking = !!h;
    if (h) {
      p.facing = h;
      const sign = h === 'left' ? -1 : 1;
      const b = G.world.walkBounds(p.floor);
      p.x = G.util.clamp(p.x + sign * C.PLAYER_SPEED * dt / 1000, b.min, b.max);
      p.area = G.world.areaAt(p.floor, p.x);
      if (p.area === 'hallway') state.flags.wentOut = true;
    }

    // 침대 앞에 오면 "잠자리에 들까?"
    G.dayflow.checkBed(state);
    if (state.scene !== 'explore') return;

    // Space: 노크 / 엘리베이터 호출
    if (!input.consumePressed('action')) return;
    const it = G.world.interactionAt(state);
    if (!it) return;
    p.walking = false;
    if (it.type === 'knock') G.visit.start(state, it.houseId);
    else if (it.type === 'elevator') G.elevator.call(state);
  }

  G.update = update;
})(window.Game = window.Game || {});
