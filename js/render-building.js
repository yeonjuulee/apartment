// render-building.js — 건물, 방, 복도, 문, 엘리베이터 그리기 (상태는 읽기만)
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;
  const W = G.world;

  // ---------- 옥상 / 외벽 / 바닥 ----------
  function roofline(ctx, L) {
    const top = L.buildingTop;
    const x0 = L.innerX - C.WALL;
    const Wd = L.innerW + C.WALL * 2;
    const ex = L.toScreenX(W.elevatorX());
    ctx.fillStyle = P.silhouette;
    ctx.strokeStyle = P.silhouette;
    ctx.fillRect(x0, top - 8, Wd, 8);
    // 물탱크
    ctx.fillRect(x0 + 50, top - 44, 70, 36);
    S.poly(ctx, [[x0 + 44, top - 44], [x0 + 126, top - 44], [x0 + 85, top - 58]]);
    // 엘리베이터 기계실 (승강로 바로 위) + 불 켜진 창
    ctx.fillRect(ex - 50, top - 50, 100, 42);
    S.poly(ctx, [[ex - 58, top - 50], [ex + 58, top - 50], [ex + 40, top - 62], [ex - 40, top - 62]]);
    ctx.fillStyle = P.roomOrange;
    ctx.fillRect(ex + 14, top - 40, 18, 18);
    // 안테나 + 굴뚝
    ctx.fillStyle = P.silhouette;
    S.stroke(ctx, [[x0 + Wd - 90, top - 8], [x0 + Wd - 90, top - 60]], 3);
    S.stroke(ctx, [[x0 + Wd - 106, top - 50], [x0 + Wd - 74, top - 50]], 3);
    S.stroke(ctx, [[x0 + Wd - 102, top - 40], [x0 + Wd - 78, top - 40]], 3);
    ctx.fillRect(x0 + Wd - 52, top - 38, 16, 30);
  }

  function walls(ctx, L) {
    const top = L.buildingTop;
    const h = L.buildingBottom - top;
    [L.innerX - C.WALL, L.innerX + L.innerW].forEach(function (wx) {
      ctx.fillStyle = P.brick;
      ctx.fillRect(wx, top, C.WALL, h);
      ctx.fillStyle = P.brickLine;
      for (let y = top, row = 0; y < top + h; y += 12, row++) {
        ctx.fillRect(wx, y, C.WALL, 2);
        const off = row % 2 ? 10 : 0;
        for (let x = wx + off; x < wx + C.WALL; x += 20) ctx.fillRect(x, y, 2, 12);
      }
    });
  }

  function slabs(ctx, L) {
    ctx.fillStyle = P.silhouette;
    const x = L.innerX - C.WALL;
    const w = L.innerW + C.WALL * 2;
    for (let f = 1; f <= G.building.floors; f++) ctx.fillRect(x, L.floorTop(f) - C.SLAB, w, C.SLAB);
    ctx.fillRect(x, L.floorBase(1), w, C.SLAB);
  }

  // ---------- 방 ----------
  function rooms(ctx, L) {
    for (let f = 1; f <= G.building.floors; f++) {
      const top = L.floorTop(f);
      const base = L.floorBase(f);
      W.segments().forEach(function (seg) {
        const x = L.toScreenX(seg.x0);
        if (seg.type === 'hallway') hallway(ctx, x, top, seg.width);
        else house(ctx, x, top, seg.width, base, W.houseIdAt(f, seg.slot), seg.slot);
      });
    }
  }

  function house(ctx, x, top, w, base, id, slot) {
    const h = G.building.houses[id];
    const room = P[h.color];
    const tone = P[h.tone];

    ctx.fillStyle = room;
    ctx.fillRect(x, top, w, C.FLOOR_H);

    h.deco.forEach(function (d, i) {
      const r = i === 0 ? 0.3 : 0.7;
      DECO[d](ctx, slot === 'left' ? x + w * r : x + w * (1 - r), top, room, tone);
    });

    ctx.fillStyle = tone;
    ctx.font = 'bold 15px ' + C.FONT;
    ctx.textAlign = slot === 'left' ? 'left' : 'right';
    ctx.fillText(id, slot === 'left' ? x + 10 : x + w - 10, top + 22);

    // 유사 소음 아이템 (바깥 외벽 쪽)
    const item = G.residents[id].item;
    if (item) S.ITEMS[item.shape](ctx, L_housePoint(id, 0.27), base, { hole: room });
  }

  let currentLayout = null;   // house()에서 화면 x 변환용 (render 시작 시 설정)
  function L_housePoint(id, ratio) { return currentLayout.toScreenX(W.housePoint(id, ratio)); }

  function hallway(ctx, x, top, w) {
    ctx.fillStyle = P.hallway;
    ctx.fillRect(x, top, w, C.FLOOR_H);
    ctx.fillStyle = P.hallwayTone;
    [0.22, 0.78].forEach(function (r) {           // 천장 등
      const cx = x + w * r;
      ctx.fillRect(cx - 1, top, 3, 18);
      S.poly(ctx, [[cx - 12, top + 30], [cx + 13, top + 30], [cx + 6, top + 18], [cx - 5, top + 18]]);
    });
    ctx.fillRect(x, top + C.FLOOR_H - 6, w, 6);    // 걸레받이
  }

  const DECO = {
    window: function (ctx, cx, top, room, tone) {
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 24, top + 30, 48, 54);
      ctx.fillStyle = room;
      ctx.fillRect(cx - 2, top + 34, 4, 46);
      ctx.fillRect(cx - 20, top + 55, 40, 4);
    },
    frame: function (ctx, cx, top, room, tone) {
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 20, top + 36, 40, 30);
      ctx.fillStyle = room;
      ctx.fillRect(cx - 14, top + 42, 28, 18);
      ctx.fillStyle = tone;
      S.poly(ctx, [[cx - 14, top + 60], [cx - 2, top + 48], [cx + 14, top + 60]]);
    },
    lamp: function (ctx, cx, top, room, tone) {
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 1, top, 3, 34);
      S.poly(ctx, [[cx - 16, top + 52], [cx + 17, top + 52], [cx + 8, top + 34], [cx - 7, top + 34]]);
    },
    clock: function (ctx, cx, top, room, tone) {
      ctx.fillStyle = tone;
      S.circle(ctx, cx, top + 50, 16);
      ctx.fillStyle = room;
      S.circle(ctx, cx, top + 50, 11);
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 1, top + 41, 3, 10);
      ctx.fillRect(cx - 1, top + 49, 8, 3);
    },
  };

  // ---------- 칸막이 벽 + 집 문 ----------
  function partitionsAndDoors(ctx, L, state) {
    Object.keys(G.building.houses).forEach(function (id) {
      const h = G.building.houses[id];
      const top = L.floorTop(h.floor);
      const base = L.floorBase(h.floor);
      const dx = L.toScreenX(W.doorX(id));
      const left = h.slot === 'left';

      ctx.fillStyle = P.silhouette;
      ctx.fillRect(dx - C.PARTITION / 2, top, C.PARTITION, C.FLOOR_H);

      const open = id === G.building.playerHome ? G.doorway.openAmount(state) : G.visit.openAmount(state, id);
      const x = dx - C.DOOR_W / 2;
      const y = base - C.DOOR_H;

      if (open > 0) {
        ctx.fillStyle = P[h.color];                    // 열린 틈으로 집 안 색이 보임
        ctx.fillRect(x, y, C.DOOR_W, C.DOOR_H);
      }
      const panel = Math.max(4, C.DOOR_W * (1 - open));
      ctx.fillStyle = P.door;
      ctx.fillRect(left ? x : x + C.DOOR_W - panel, y, panel, C.DOOR_H); // 집 쪽 경첩으로 접힘
      if (open === 0) {
        ctx.fillStyle = P.doorKnob;                    // 손잡이는 복도 쪽
        S.circle(ctx, left ? x + C.DOOR_W - 7 : x + 7, y + C.DOOR_H * 0.55, 3);
      }
    });
  }

  // ---------- 엘리베이터 ----------
  function floorBaseAt(L, pos) {
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return L.floorBase(lo);
    return L.floorBase(lo) + (L.floorBase(hi) - L.floorBase(lo)) * (pos - lo);
  }

  function shaft(ctx, L) {
    const ex = L.toScreenX(W.elevatorX());
    ctx.fillStyle = P.shaft;
    ctx.fillRect(ex - C.ELEV_W / 2 - 6, L.buildingTop, C.ELEV_W + 12, L.buildingBottom - L.buildingTop);
  }

  function car(ctx, L, state) {
    const ex = L.toScreenX(W.elevatorX());
    const base = floorBaseAt(L, state.elevator.pos);
    ctx.fillStyle = P.elevCar;
    ctx.fillRect(ex - C.ELEV_W / 2, base - C.ELEV_H, C.ELEV_W, C.ELEV_H);
    ctx.fillStyle = P.elevFrame;
    ctx.fillRect(ex - C.ELEV_W / 2, base - C.ELEV_H, C.ELEV_W, 6);
    ctx.fillRect(ex - 14, base - C.ELEV_H + 30, 28, 3);  // 안쪽 손잡이
  }

  function elevatorDoors(ctx, L, state) {
    const e = state.elevator;
    const ex = L.toScreenX(W.elevatorX());
    const half = C.ELEV_W / 2;
    const moving = e.phase === 'moving' || e.phase === 'summon';

    for (let f = 1; f <= G.building.floors; f++) {
      const base = L.floorBase(f);
      const y = base - C.ELEV_H;
      const open = G.elevator.doorOpen(state, f);
      const pw = half * (1 - open);

      // 문짝 (양옆으로 열림)
      ctx.fillStyle = P.elevDoor;
      ctx.fillRect(ex - half, y, pw, C.ELEV_H);
      ctx.fillRect(ex + half - pw, y, pw, C.ELEV_H);
      if (open === 0) {
        ctx.fillStyle = P.elevFrame;
        ctx.fillRect(ex - 1, y, 2, C.ELEV_H);
      }

      // 문틀
      ctx.fillStyle = P.elevFrame;
      ctx.fillRect(ex - half - 6, y - 6, C.ELEV_W + 12, 6);
      ctx.fillRect(ex - half - 6, y, 6, C.ELEV_H);
      ctx.fillRect(ex + half, y, 6, C.ELEV_H);

      // 층 표시등
      ctx.fillStyle = P.silhouette;
      ctx.fillRect(ex - 18, y - 28, 36, 18);
      ctx.fillStyle = P.accent;
      ctx.font = 'bold 13px ' + C.FONT;
      ctx.textAlign = 'center';
      let label = String(moving ? Math.round(e.pos) : e.floor);
      if (moving) label = (e.to > e.from ? '▲' : '▼') + label;
      ctx.fillText(label, ex, y - 14);
    }
  }

  G.renderBuilding = {
    setLayout: function (L) { currentLayout = L; },
    roofline: roofline, walls: walls, slabs: slabs, rooms: rooms,
    partitionsAndDoors: partitionsAndDoors,
    shaft: shaft, car: car, elevatorDoors: elevatorDoors,
    floorBaseAt: floorBaseAt,
  };
})(window.Game = window.Game || {});
