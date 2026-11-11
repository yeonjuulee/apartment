// render-ui.js — 상단/하단 UI, 안내, 말풍선, 대화창, 엘리베이터 층 선택창 (상태는 읽기만)
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;
  const W = G.world;

  // ---------- 상단: 집 아이콘 / DAY 진행 / 오늘 대화 수 ----------
  function topBar(ctx, L, state) {
    const cy = C.TOP_UI / 2;

    ctx.strokeStyle = P.uiLight;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(34, cy, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = P.uiLight;
    S.poly(ctx, [[25, cy + 1], [34, cy - 9], [43, cy + 1]]);
    ctx.fillRect(28, cy + 1, 12, 8);

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
      if (d < state.day) S.circle(ctx, dx, dy, 5);
      else if (d === state.day) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.stroke();
        S.circle(ctx, dx, dy, 2.5);
      } else S.circle(ctx, dx, dy, 2);
    }

    const talked = Object.keys(state.talkedToday).length;
    const total = Object.keys(state.npcs).length;
    ctx.lineWidth = 2;
    for (let i = 0; i < total; i++) {
      const x = L.width - 30 - (total - 1 - i) * 26;
      ctx.strokeStyle = P.uiLight;
      ctx.fillStyle = P.uiLight;
      if (i < talked) S.circle(ctx, x, cy, 9);
      else {
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(x, cy, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ---------- 하단: 현재 위치 + 조작 안내 ----------
  function helpText(state) {
    if (state.scene === 'elevator' && state.elevator.phase === 'select') return 'W S 층 선택 · Space 이동 · A D 내리기';
    if (state.dialog) return 'Space 다음';
    if (state.scene !== 'explore') return '';
    return 'A D 이동 · Space 노크 / 출입 / 엘리베이터 · G 디버그';
  }

  function bottomBar(ctx, L, state) {
    const y = L.buildingBottom + C.SLAB + (C.GROUND - C.SLAB) / 2 + 6;
    ctx.font = 'bold 15px ' + C.FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = P.uiLight;
    ctx.fillText(W.locationLabel(state), L.innerX, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = P.uiDim;
    ctx.font = '13px ' + C.FONT;
    ctx.fillText(helpText(state), L.innerX + L.innerW, y);
  }

  // ---------- Space 안내 (플레이어 머리 위) ----------
  function promptText(state) {
    if (state.scene !== 'explore') return null;
    const it = W.interactionAt(state);
    if (!it) return null;
    if (it.type === 'knock') return 'Space  ' + it.houseId + '호 노크';
    if (it.type === 'enterHome') return 'Space  들어가기';
    if (it.type === 'exitHome') return 'Space  나가기';
    if (it.type === 'elevator') return 'Space  엘리베이터';
    return null;
  }

  function prompt(ctx, L, state) {
    const text = promptText(state);
    if (!text) return;
    const p = state.player;
    pill(ctx, L.toScreenX(p.x), L.floorBase(p.floor) - 96, text, P.silhouette, P.uiLight);
  }

  // ---------- 노크 말풍선 ----------
  function knockBubble(ctx, L, state) {
    const v = state.visit;
    if (!v) return;
    const h = G.building.houses[v.houseId];
    const dx = L.toScreenX(W.doorX(v.houseId));
    const side = h.slot === 'left' ? 1 : -1;            // 복도 쪽
    const y = L.floorBase(h.floor) - C.DOOR_H - 16;
    if (v.phase === 'knock') {
      const shake = Math.sin(state.time / 40) * 2;
      bubble(ctx, dx + side * 30 + shake, y, '똑똑');
    } else if (v.phase === 'silence') {
      bubble(ctx, dx + side * 46, y, '…(인기척이 없다)');
    }
  }

  // ---------- 대화창 ----------
  function dialogBox(ctx, L, state) {
    const d = state.dialog;
    if (!d) return;
    const x = L.innerX + 24;
    const w = L.innerW - 48;
    const h = 100;
    const y = L.buildingBottom - h - 18;

    ctx.fillStyle = P.silhouette;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = P.uiLight;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    ctx.textAlign = 'left';
    ctx.fillStyle = P.accent;
    ctx.font = 'bold 15px ' + C.FONT;
    ctx.fillText(G.residents[d.houseId].name + (d.through ? '  (문 너머로)' : ''), x + 18, y + 28);

    ctx.fillStyle = P.uiLight;
    ctx.font = '16px ' + C.FONT;
    wrap(ctx, d.text, w - 36).forEach(function (line, i) {
      ctx.fillText(line, x + 18, y + 56 + i * 22);
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = P.uiDim;
    ctx.font = '12px ' + C.FONT;
    const blink = Math.floor(state.time / 400) % 2 ? '▶' : '▷';
    ctx.fillText('Space ' + blink, x + w - 14, y + h - 12);
  }

  // ---------- 엘리베이터 층 선택 ----------
  function elevatorPanel(ctx, L, state) {
    const e = state.elevator;
    if (e.phase !== 'select') return;
    const p = state.player;
    const ex = L.toScreenX(W.elevatorX());
    const top = L.floorTop(p.floor);
    const x = ex + C.ELEV_W / 2 + 12;
    const w = 58;
    const row = 24;
    const floors = G.building.floors;
    const y = top + 14;

    ctx.fillStyle = P.silhouette;
    ctx.fillRect(x, y, w, floors * row + 10);
    ctx.strokeStyle = P.uiLight;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, floors * row + 8);

    ctx.font = 'bold 14px ' + C.FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < floors; i++) {
      const f = floors - i;
      const ry = y + 5 + i * row;
      if (f === e.selection) {
        ctx.fillStyle = P.accent;
        ctx.fillRect(x + 5, ry, w - 10, row - 2);
        ctx.fillStyle = P.silhouette;
      } else {
        ctx.fillStyle = f === p.floor ? P.uiDim : P.uiLight;
      }
      ctx.fillText(f === p.floor ? f + 'F ·' : f + 'F', x + w / 2, ry + 17);
    }
  }

  // ---------- 도우미 ----------
  function pill(ctx, cx, cy, text, bg, fg) {
    ctx.font = 'bold 12px ' + C.FONT;
    const w = ctx.measureText(text).width + 18;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - 11, w, 22, 11);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, cy + 4);
  }

  function bubble(ctx, cx, cy, text) {
    ctx.font = 'bold 14px ' + C.FONT;
    const w = ctx.measureText(text).width + 20;
    ctx.fillStyle = P.uiLight;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - 14, w, 28, 8);
    ctx.fill();
    S.poly(ctx, [[cx - 6, cy + 13], [cx + 6, cy + 13], [cx, cy + 22]]);
    ctx.fillStyle = P.silhouette;
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, cy + 5);
  }

  // 한글은 띄어쓰기가 적어도 줄바꿈되도록 글자 단위로 자른다
  function wrap(ctx, text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch.trim() ? ch : ''; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  G.renderUI = {
    topBar: topBar, bottomBar: bottomBar, prompt: prompt, promptText: promptText,
    knockBubble: knockBubble, dialogBox: dialogBox, elevatorPanel: elevatorPanel,
  };
})(window.Game = window.Game || {});
