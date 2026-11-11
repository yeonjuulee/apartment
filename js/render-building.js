// render-building.js — 건물, 방, 복도, 경계, 엘리베이터 그리기 (상태는 읽기만)
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;
  const W = G.world;

  let currentLayout = null;   // 화면 x 변환용 (render 시작 시 설정)

  // ---------- 외벽 / 바닥 ----------
  function walls(ctx, L) {
    const top = L.buildingTop;
    const h = L.buildingBottom - top;
    ctx.fillStyle = P.wall;
    ctx.fillRect(L.innerX - C.WALL, top, C.WALL, h);
    ctx.fillRect(L.innerX + L.innerW, top, C.WALL, h);
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
    if (item) S.ITEMS[item.shape](ctx, currentLayout.toScreenX(W.housePoint(id, 0.27)), base, { hole: room });
  }

  function hallway(ctx, x, top, w) {
    ctx.fillStyle = P.hallway;
    ctx.fillRect(x, top, w, C.FLOOR_H);
    ctx.fillStyle = P.hallwayTone;
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

  // ---------- 집과 복도 경계 (천장에서 내려온 짧은 기둥) ----------
  function boundaries(ctx, L) {
    const hall = W.hallway();
    ctx.fillStyle = P.silhouette;
    for (let f = 1; f <= G.building.floors; f++) {
      const t = L.floorTop(f);
      [hall.x0, hall.x1].forEach(function (x) {
        ctx.fillRect(L.toScreenX(x) - C.PILLAR_W / 2, t, C.PILLAR_W, C.PILLAR_H);
      });
    }
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
    const top = L.floorTop(G.building.floors);          // 맨 위층 천장 ~ 1층 바닥 사이만
    ctx.fillRect(ex - C.ELEV_W / 2 - 6, top, C.ELEV_W + 12, L.floorBase(1) - top);
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

      ctx.fillStyle = P.elevDoor;                       // 문짝 (양옆으로 열림)
      ctx.fillRect(ex - half, y, pw, C.ELEV_H);
      ctx.fillRect(ex + half - pw, y, pw, C.ELEV_H);
      if (open === 0) {
        ctx.fillStyle = P.elevFrame;
        ctx.fillRect(ex - 1, y, 2, C.ELEV_H);
      }

      ctx.fillStyle = P.elevFrame;                      // 문틀
      ctx.fillRect(ex - half - 6, y - 6, C.ELEV_W + 12, 6);
      ctx.fillRect(ex - half - 6, y, 6, C.ELEV_H);
      ctx.fillRect(ex + half, y, 6, C.ELEV_H);

      ctx.fillStyle = P.silhouette;                     // 층 표시등
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
    walls: walls, slabs: slabs, rooms: rooms, boundaries: boundaries,
    shaft: shaft, car: car, elevatorDoors: elevatorDoors,
    floorBaseAt: floorBaseAt,
  };
})(window.Game = window.Game || {});
