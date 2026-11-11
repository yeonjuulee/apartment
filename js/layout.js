// layout.js — 화면 좌표 계산 (월드 좌표 → 캔버스 좌표). 상태와 무관한 순수 계산.
(function (G) {
  'use strict';

  function computeLayout() {
    const C = G.config;
    const B = G.building;
    const innerW = G.world.innerWidth();
    const buildingTop = C.TOP_UI + C.ROOF_H;
    const buildingH = B.floors * C.FLOOR_H + (B.floors + 1) * C.SLAB;

    const dialogTop = buildingTop + buildingH + C.GROUND;   // 게임 화면 아래 대화 영역

    const L = {
      width: innerW + C.WALL * 2,
      height: dialogTop + C.DIALOG_H + 12,
      dialogTop: dialogTop,
      innerX: C.WALL,                       // 층 내부 x=0 의 캔버스 x
      innerW: innerW,
      buildingTop: buildingTop,
      buildingBottom: buildingTop + buildingH,

      // 층 f(1~floors)의 방 윗면 / 바닥면 캔버스 y
      floorTop: function (f) {
        return buildingTop + C.SLAB + (B.floors - f) * (C.FLOOR_H + C.SLAB);
      },
      floorBase: function (f) { return L.floorTop(f) + C.FLOOR_H; },
      toScreenX: function (x) { return C.WALL + x; },
    };
    return L;
  }

  G.computeLayout = computeLayout;
})(window.Game = window.Game || {});
