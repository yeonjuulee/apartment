// render.js — 화면 그리기 (상태를 읽기만 하고 절대 수정하지 않음)
// 그리는 순서: 배경 → 옥상 → 외벽 → 각 층(방·계단) → 층 바닥 → 플레이어 → UI → 디버그
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;

  function render(ctx, state, L) {
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, L.width, L.height);
    ctx.fillStyle = P.sky;                          // 옥상 실루엣이 보이도록 밤하늘
    ctx.fillRect(0, C.TOP_UI, L.width, C.ROOF_H);

    drawRoofline(ctx, L);
    drawWalls(ctx, L);
    for (let f = 1; f <= G.building.floors; f++) drawFloor(ctx, L, f, state);
    drawSlabs(ctx, L);
    drawPlayer(ctx, L, state);
    drawStairHint(ctx, L, state);
    drawTopUI(ctx, L, state);
    drawBottomUI(ctx, L, state);
    if (state.debug) drawDebug(ctx, L, state);
  }

  // ---------- 건물 ----------
  function drawRoofline(ctx, L) {
    const top = L.buildingTop;
    const x0 = L.innerX - C.WALL;
    const W = L.innerW + C.WALL * 2;
    ctx.fillStyle = P.silhouette;
    ctx.fillRect(x0, top - 8, W, 8);
    // 물탱크
    ctx.fillRect(x0 + 60, top - 44, 70, 36);
    S.poly(ctx, [[x0 + 54, top - 44], [x0 + 136, top - 44], [x0 + 95, top - 58]]);
    // 옥탑방 + 불 켜진 창
    ctx.fillRect(x0 + W * 0.45, top - 50, 90, 42);
    S.poly(ctx, [[x0 + W * 0.45 - 8, top - 50], [x0 + W * 0.45 + 98, top - 50], [x0 + W * 0.45 + 70, top - 62], [x0 + W * 0.45 + 10, top - 62]]);
    ctx.fillStyle = P.roomOrange;
    ctx.fillRect(x0 + W * 0.45 + 52, top - 40, 18, 18);
    // 안테나 + 굴뚝
    ctx.fillStyle = P.silhouette;
    ctx.strokeStyle = P.silhouette;
    S.stroke(ctx, [[x0 + W - 90, top - 8], [x0 + W - 90, top - 60]], 3);
    S.stroke(ctx, [[x0 + W - 106, top - 50], [x0 + W - 74, top - 50]], 3);
    S.stroke(ctx, [[x0 + W - 102, top - 40], [x0 + W - 78, top - 40]], 3);
    ctx.fillRect(x0 + W - 52, top - 38, 16, 30);
  }

  function drawWalls(ctx, L) {
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

  function drawFloor(ctx, L, f, state) {
    const top = L.floorTop(f);
    const base = L.floorBase(f);
    G.world.segments().forEach(function (seg) {
      const x = L.toScreenX(seg.x0);
      if (seg.type === 'stairs') {
        drawStairwell(ctx, x, top, seg.width, f);
      } else {
        const id = G.world.houseIdAt(f, seg.slot);
        drawHouse(ctx, x, top, seg.width, base, id, seg.slot, state);
      }
    });
  }

  function drawHouse(ctx, x, top, w, base, id, slot, state) {
    const house = G.building.houses[id];
    const room = P[house.color];
    const tone = P[house.tone];

    ctx.fillStyle = room;
    ctx.fillRect(x, top, w, C.FLOOR_H);

    // 배경 장식 (같은 계열 어두운 톤)
    house.deco.forEach(function (d, i) {
      DECO[d](ctx, x + w * (i === 0 ? 0.3 : 0.72), top, base, room, tone);
    });

    // 호수 표시
    ctx.fillStyle = tone;
    ctx.font = 'bold 15px ' + C.FONT;
    ctx.textAlign = slot === 'left' ? 'left' : 'right';
    ctx.fillText(id, slot === 'left' ? x + 10 : x + w - 10, top + 22);

    // 아이템 + 이웃 실루엣 (바깥쪽에 아이템, 계단 쪽에 이웃)
    const r = G.residents[id];
    const outer = slot === 'left' ? 0.28 : 0.72;
    const inner = slot === 'left' ? 0.7 : 0.3;
    if (r.item) S.ITEMS[r.item.shape](ctx, x + w * outer, base, { hole: room });
    if (r.figure) S.FIGURES[r.figure](ctx, x + w * inner, base, { facing: slot === 'left' ? 'left' : 'right' });
  }

  const DECO = {
    window: function (ctx, cx, top, base, room, tone) {
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 26, top + 30, 52, 56);
      ctx.fillStyle = room;
      ctx.fillRect(cx - 2, top + 34, 4, 48);
      ctx.fillRect(cx - 22, top + 56, 44, 4);
    },
    frame: function (ctx, cx, top, base, room, tone) {
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 20, top + 36, 40, 30);
      ctx.fillStyle = room;
      ctx.fillRect(cx - 14, top + 42, 28, 18);
      ctx.fillStyle = tone;
      S.poly(ctx, [[cx - 14, top + 60], [cx - 2, top + 48], [cx + 14, top + 60]]);
    },
    lamp: function (ctx, cx, top, base, room, tone) {
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 1, top, 3, 34);
      S.poly(ctx, [[cx - 16, top + 52], [cx + 17, top + 52], [cx + 8, top + 34], [cx - 7, top + 34]]);
    },
    clock: function (ctx, cx, top, base, room, tone) {
      ctx.fillStyle = tone;
      S.circle(ctx, cx, top + 50, 16);
      ctx.fillStyle = room;
      S.circle(ctx, cx, top + 50, 11);
      ctx.fillStyle = tone;
      ctx.fillRect(cx - 1, top + 41, 3, 10);
      ctx.fillRect(cx - 1, top + 49, 8, 3);
    },
  };

  function drawStairwell(ctx, x, top, w, f) {
    ctx.fillStyle = P.stairs;
    ctx.fillRect(x, top, w, C.FLOOR_H);
    // 지그재그 계단 실루엣 (층마다 방향을 바꿔 이어지는 느낌)
    const steps = 7;
    const sw = w / steps;
    const sh = C.FLOOR_H / steps;
    const base = top + C.FLOOR_H;
    const rising = f % 2 === 1;   // 홀수 층: 왼→오 오르막, 짝수 층: 반대
    const pts = [[x, base]];
    for (let i = 0; i < steps; i++) {
      const y = base - (i + 1) * sh * 0.55;
      pts.push([x + i * sw, y], [x + (i + 1) * sw, y]);
    }
    pts.push([x + w, base]);
    const mirrored = rising ? pts : pts.map(function (p) { return [2 * x + w - p[0], p[1]]; });
    ctx.fillStyle = P.stairsStep;
    S.poly(ctx, mirrored);
  }

  function drawSlabs(ctx, L) {
    ctx.fillStyle = P.silhouette;
    for (let f = 1; f <= G.building.floors; f++) {
      ctx.fillRect(L.innerX - C.WALL, L.floorTop(f) - C.SLAB, L.innerW + C.WALL * 2, C.SLAB);
    }
    ctx.fillRect(L.innerX - C.WALL, L.floorBase(1), L.innerW + C.WALL * 2, C.SLAB);
    // 집과 계단실 사이 얇은 칸막이 기둥 (통과 가능, 장식)
    G.world.segments().forEach(function (seg) {
      if (seg.type !== 'stairs') return;
      for (let f = 1; f <= G.building.floors; f++) {
        const t = L.floorTop(f);
        ctx.fillRect(L.toScreenX(seg.x0) - 3, t, 6, 26);
        ctx.fillRect(L.toScreenX(seg.x1) - 3, t, 6, 26);
      }
    });
  }

  // ---------- 플레이어 ----------
  function playerScreenBase(L, p) {
    if (!p.floorMove) return L.floorBase(p.floor);
    const t = p.floorMove.t;
    const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
    const a = L.floorBase(p.floorMove.from);
    const b = L.floorBase(p.floorMove.to);
    return a + (b - a) * k;
  }

  function drawPlayer(ctx, L, state) {
    const p = state.player;
    const bob = p.walking ? Math.abs(Math.sin(state.time / 90)) * 3 : 0;
    S.FIGURES.player(ctx, L.toScreenX(p.x), playerScreenBase(L, p), { facing: p.facing, bob: bob });
  }

  function drawStairHint(ctx, L, state) {
    const p = state.player;
    if (p.floorMove || !G.world.isInStairs(p.x)) return;
    const x = L.toScreenX(p.x);
    const base = L.floorBase(p.floor);
    const lift = Math.sin(state.time / 200) * 3;
    ctx.fillStyle = P.accent;
    if (p.floor < G.building.floors) {
      const y = base - 96 + lift;
      S.poly(ctx, [[x - 9, y + 8], [x + 9, y + 8], [x, y - 4]]);
    }
    if (p.floor > 1) {
      const y = base - 80 - lift;
      S.poly(ctx, [[x - 9, y - 4], [x + 9, y - 4], [x, y + 8]]);
    }
  }

  // ---------- UI ----------
  function drawTopUI(ctx, L, state) {
    const cy = C.TOP_UI / 2;

    // 왼쪽: 동그란 집 아이콘
    ctx.strokeStyle = P.uiLight;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(34, cy, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = P.uiLight;
    S.poly(ctx, [[25, cy + 1], [34, cy - 9], [43, cy + 1]]);
    ctx.fillRect(28, cy + 1, 12, 8);

    // 가운데: DAY + 진행 점 (지난 날 ✓, 오늘 ◉, 남은 날 ·)
    const mid = L.width / 2;
    ctx.fillStyle = P.accent;
    ctx.font = 'bold 22px ' + C.FONT;
    ctx.textAlign = 'center';
    ctx.fillText('DAY ' + state.day, mid, cy - 4);
    const gap = 18;
    const sx = mid - ((state.maxDay - 1) * gap) / 2;
    for (let d = 1; d <= state.maxDay; d++) {
      const dx = sx + (d - 1) * gap;
      const dy = cy + 16;
      ctx.fillStyle = P.accent;
      ctx.strokeStyle = P.accent;
      if (d < state.day) {
        S.circle(ctx, dx, dy, 5);
      } else if (d === state.day) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.stroke();
        S.circle(ctx, dx, dy, 2.5);
      } else {
        S.circle(ctx, dx, dy, 2);
      }
    }

    // 오른쪽: 오늘 대화한 이웃 수 (점선 원 5개, 이후 단계에서 채워짐)
    const talked = Object.keys(state.talkedToday).length;
    const total = Object.keys(G.residents).length - 1;
    ctx.lineWidth = 2;
    for (let i = 0; i < total; i++) {
      const x = L.width - 30 - (total - 1 - i) * 26;
      ctx.strokeStyle = P.uiLight;
      ctx.fillStyle = P.uiLight;
      if (i < talked) {
        S.circle(ctx, x, cy, 9);
      } else {
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(x, cy, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawBottomUI(ctx, L, state) {
    const p = state.player;
    const y = L.buildingBottom + C.SLAB + (C.GROUND - C.SLAB) / 2 + 6;
    const floor = p.floorMove ? p.floorMove.to : p.floor;
    const room = G.world.roomAt(floor, p.x);
    let label = floor + 'F · ';
    if (room.type === 'stairs') label += '계단';
    else if (room.id === G.building.playerHome) label += room.id + '호 · 내 집';
    else label += G.residents[room.id].name;

    ctx.font = 'bold 15px ' + C.FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = P.uiLight;
    ctx.fillText(label, L.innerX, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = P.uiDim;
    ctx.font = '13px ' + C.FONT;
    ctx.fillText('A D 이동 · 계단에서 W S 층 이동 · G 디버그', L.innerX + L.innerW, y);
  }

  // ---------- 디버그 ----------
  function drawDebug(ctx, L, state) {
    const p = state.player;
    G.world.segments().forEach(function (seg) {
      if (seg.type === 'stairs') {
        ctx.fillStyle = P.debugZone;
        for (let f = 1; f <= G.building.floors; f++) {
          ctx.fillRect(L.toScreenX(seg.x0), L.floorTop(f), seg.width, C.FLOOR_H);
        }
      }
    });
    ctx.strokeStyle = P.debugLine;
    ctx.lineWidth = 1;
    const b = G.world.xBounds();
    [b.min, b.max, p.x].forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(L.toScreenX(x) + 0.5, L.buildingTop);
      ctx.lineTo(L.toScreenX(x) + 0.5, L.buildingBottom);
      ctx.stroke();
    });
    const room = G.world.roomAt(p.floor, p.x);
    const text = 'floor ' + p.floor + '  x ' + p.x.toFixed(1) + '  room ' + (room.id || 'stairs') +
      (p.floorMove ? '  moving→' + p.floorMove.to : '');
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = P.debugBg;
    ctx.fillRect(L.innerX, L.buildingTop - 30, ctx.measureText(text).width + 12, 20);
    ctx.fillStyle = P.uiLight;
    ctx.fillText(text, L.innerX + 6, L.buildingTop - 16);
  }

  G.render = render;
})(window.Game = window.Game || {});
