// render.js — 그리기 순서 관리 + 인물 그리기 (상태는 읽기만, 절대 수정하지 않음)
//
// 순서: 배경 → [흔들림 시작] 외벽 → 방/복도 → 층 바닥 → 경계 기둥 → 승강로 → 승강기(+탄 플레이어)
//       → 엘리베이터 문 → 쪽지 → 이웃 → 플레이어 → 밤 어둠 → (누운 플레이어) → 감정 이펙트 [흔들림 끝]
//       → 말풍선·안내·층 선택 → 상단/하단 바 → 토스트 → 대화 영역(게임 화면 아래)
//       → 카드(쪽지·목표)·수첩·임시 종료 → 암전 → 타이틀 → 디버그
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;
  const W = G.world;
  const RB = G.renderBuilding;
  const RU = G.renderUI;
  const FX = G.renderFX;

  function render(ctx, state, L) {
    RB.setLayout(L);

    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, L.width, L.height);

    const sh = FX.shakeOffset(state);
    ctx.save();
    ctx.translate(sh.x, sh.y);
    RB.walls(ctx, L);
    RB.rooms(ctx, L);
    RB.slabs(ctx, L);
    RB.boundaries(ctx, L);
    RB.shaft(ctx, L);
    RB.car(ctx, L, state);
    if (state.player.inElevator) drawPlayer(ctx, L, state);   // 문 뒤에 가려지도록 먼저
    RB.elevatorDoors(ctx, L, state);
    FX.note(ctx, L, state);
    drawNpcs(ctx, L, state);
    if (!state.player.inElevator && !FX.isLying(state)) drawPlayer(ctx, L, state);
    FX.nightOverlay(ctx, L, state);
    if (FX.isLying(state)) FX.lyingPlayer(ctx, L, state);
    FX.emotes(ctx, L, state);
    ctx.restore();

    RU.knockBubble(ctx, L, state);
    RU.prompt(ctx, L, state);
    RU.elevatorPanel(ctx, L, state);
    RU.topBar(ctx, L, state);
    RU.bottomBar(ctx, L, state);
    RU.toast(ctx, L, state);
    RU.dialogArea(ctx, L, state);
    RU.card(ctx, L, state);
    RU.notebook(ctx, L, state);
    RU.stub(ctx, L, state);
    FX.blackoutLayer(ctx, L, state);
    RU.title(ctx, L, state);
    if (state.debug) drawDebug(ctx, L, state);
  }

  function bob(walking, time) { return walking ? Math.abs(Math.sin(time / 90)) * 3 : 0; }

  function drawNpcs(ctx, L, state) {
    Object.keys(state.npcs).forEach(function (id) {
      const n = state.npcs[id];
      const h = G.building.houses[id];
      const facing = n.facing || (h.slot === 'left' ? 'right' : 'left');   // 평소엔 복도 쪽을 봄
      const base = L.floorBase(h.floor) - bob(n.walking, state.time + id * 37);
      const g = FX.gesture(G.emotes.of(state, id), facing);
      ctx.save();
      ctx.translate(L.toScreenX(n.x) + g.dx, base + g.dy);
      ctx.rotate(g.rot);
      S.FIGURES[G.residents[id].figure](ctx, 0, 0, { facing: facing });
      ctx.restore();
    });
  }

  function drawPlayer(ctx, L, state) {
    const p = state.player;
    const e = state.elevator;
    const base = p.inElevator && e.phase === 'moving' ? RB.floorBaseAt(L, e.pos) : L.floorBase(p.floor);
    const g = FX.gesture(G.emotes.of(state, 'player'), p.facing);
    ctx.save();
    ctx.translate(L.toScreenX(p.x) + g.dx, base + g.dy);
    ctx.rotate(g.rot);
    S.FIGURES.player(ctx, 0, 0, {
      facing: p.facing, bob: bob(p.walking, state.time), knock: G.visit.knocking(state),
    });
    ctx.restore();
  }

  function drawDebug(ctx, L, state) {
    const p = state.player;
    const top = L.floorTop(p.floor);
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

    ctx.strokeStyle = P.debugLine;
    ctx.lineWidth = 1;
    const b = W.walkBounds(p.floor);
    [b.min, b.max].forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(L.toScreenX(x) + 0.5, top);
      ctx.lineTo(L.toScreenX(x) + 0.5, top + C.FLOOR_H);
      ctx.stroke();
    });

    const text = 'day ' + state.day + '  floor ' + p.floor + '  x ' + p.x.toFixed(0) + '  area ' + p.area +
      '  scene ' + state.scene + '  bedArmed ' + state.bedArmed + '  elev ' + state.elevator.phase +
      (state.visit ? '  visit ' + state.visit.houseId + ':' + state.visit.phase : '') +
      (state.night ? '  night ' + state.night.n + ':' + state.night.phase : '');
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = P.debugBg;
    ctx.fillRect(L.innerX, L.height - 22, ctx.measureText(text).width + 12, 20);
    ctx.fillStyle = P.uiLight;
    ctx.fillText(text, L.innerX + 6, L.height - 8);
  }

  G.render = render;
})(window.Game = window.Game || {});
