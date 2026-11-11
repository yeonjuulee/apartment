// render.js — 그리기 순서 관리 + 인물 그리기 (상태는 읽기만, 절대 수정하지 않음)
//
// 순서: 배경 → 외벽 → 방/복도 → 층 바닥 → 경계 기둥 → 승강로 → 승강기(+탄 플레이어)
//       → 엘리베이터 문 → 이웃 → 플레이어 → 말풍선·안내·대화창 → UI → 디버그
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;
  const W = G.world;
  const RB = G.renderBuilding;
  const RU = G.renderUI;

  function render(ctx, state, L) {
    RB.setLayout(L);

    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, L.width, L.height);

    RB.walls(ctx, L);
    RB.rooms(ctx, L);
    RB.slabs(ctx, L);
    RB.boundaries(ctx, L);
    RB.shaft(ctx, L);
    RB.car(ctx, L, state);
    if (state.player.inElevator) drawPlayer(ctx, L, state);   // 문 뒤에 가려지도록 먼저
    RB.elevatorDoors(ctx, L, state);
    drawNpcs(ctx, L, state);
    if (!state.player.inElevator) drawPlayer(ctx, L, state);

    RU.knockBubble(ctx, L, state);
    RU.prompt(ctx, L, state);
    RU.elevatorPanel(ctx, L, state);
    RU.dialogBox(ctx, L, state);
    RU.topBar(ctx, L, state);
    RU.bottomBar(ctx, L, state);
    if (state.debug) drawDebug(ctx, L, state);
  }

  function bob(walking, time) { return walking ? Math.abs(Math.sin(time / 90)) * 3 : 0; }

  function drawNpcs(ctx, L, state) {
    Object.keys(state.npcs).forEach(function (id) {
      const n = state.npcs[id];
      const h = G.building.houses[id];
      const facing = n.facing || (h.slot === 'left' ? 'right' : 'left');   // 평소엔 문 쪽을 봄
      const base = L.floorBase(h.floor) - bob(n.walking, state.time + id * 37);
      S.FIGURES[G.residents[id].figure](ctx, L.toScreenX(n.x), base, { facing: facing });
    });
  }

  function drawPlayer(ctx, L, state) {
    const p = state.player;
    const e = state.elevator;
    const base = p.inElevator && e.phase === 'moving' ? RB.floorBaseAt(L, e.pos) : L.floorBase(p.floor);
    S.FIGURES.player(ctx, L.toScreenX(p.x), base, {
      facing: p.facing, bob: bob(p.walking, state.time), knock: G.visit.knocking(state),
    });
  }

  function drawDebug(ctx, L, state) {
    const p = state.player;
    const top = L.floorTop(p.floor);
    // 상호작용 범위: 노크(남의 집 경계 복도 쪽), 엘리베이터
    ctx.fillStyle = P.debugZone;
    ['left', 'right'].forEach(function (slot) {
      const id = W.houseIdAt(p.floor, slot);
      if (id === G.building.playerHome) return;
      const bx = L.toScreenX(W.boundaryX(id));
      const inward = slot === 'left' ? 0 : -C.KNOCK_REACH;
      ctx.fillRect(bx + inward, top, C.KNOCK_REACH, C.FLOOR_H);
    });
    const ex = L.toScreenX(W.elevatorX());
    ctx.fillRect(ex - C.ELEV_REACH, top, C.ELEV_REACH * 2, C.FLOOR_H);

    // 현재 영역 이동 범위
    ctx.strokeStyle = P.debugLine;
    ctx.lineWidth = 1;
    const b = W.walkBounds(p.floor);
    [b.min, b.max].forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(L.toScreenX(x) + 0.5, top);
      ctx.lineTo(L.toScreenX(x) + 0.5, top + C.FLOOR_H);
      ctx.stroke();
    });

    const text = 'floor ' + p.floor + '  x ' + p.x.toFixed(0) + '  area ' + p.area + '  scene ' + state.scene +
      '  elev ' + state.elevator.phase + '@' + state.elevator.floor +
      (state.visit ? '  visit ' + state.visit.houseId + ':' + state.visit.phase : '');
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = P.debugBg;
    ctx.fillRect(L.innerX, L.buildingTop - 30, ctx.measureText(text).width + 12, 20);
    ctx.fillStyle = P.uiLight;
    ctx.fillText(text, L.innerX + 6, L.buildingTop - 16);
  }

  G.render = render;
})(window.Game = window.Game || {});
