// render-ui.js — 화면 위 UI 전부 (상태는 읽기만)
//   상단 바(수첩 아이콘·DAY·오늘 만난 이웃) / 하단 바 / Space 안내 / 노크 말풍선 / 엘리베이터 층 선택 / 토스트
//   대화 영역(게임 화면 아래): 대화 · 침대 메뉴 · 범인 지목 · 밤 소음 텍스트 · 첫 행동 안내
//   카드(쪽지·목표·엔딩) / 수첩 / 타이틀
// 모든 패널은 같은 디자인: 검정 바탕 + 밝은 테두리 + 빨강 강조
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;
  const W = G.world;

  // ================= 공용 도우미 =================
  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = P.silhouette;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = P.uiLight;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  function text(ctx, str, x, y, opt) {
    ctx.font = (opt.bold ? 'bold ' : '') + (opt.size || 14) + 'px ' + C.FONT;
    ctx.fillStyle = opt.color || P.uiLight;
    ctx.textAlign = opt.align || 'left';
    ctx.fillText(str, x, y);
  }

  function pill(ctx, cx, cy, str, bg, fg) {
    ctx.font = 'bold 12px ' + C.FONT;
    const w = ctx.measureText(str).width + 18;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - 11, w, 22, 11);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.fillText(str, cx, cy + 4);
  }

  function bubble(ctx, cx, cy, str) {
    ctx.font = 'bold 14px ' + C.FONT;
    const w = ctx.measureText(str).width + 20;
    ctx.fillStyle = P.uiLight;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - 14, w, 28, 8);
    ctx.fill();
    S.poly(ctx, [[cx - 6, cy + 13], [cx + 6, cy + 13], [cx, cy + 22]]);
    ctx.fillStyle = P.silhouette;
    ctx.textAlign = 'center';
    ctx.fillText(str, cx, cy + 5);
  }

  // 한글은 띄어쓰기가 적어도 줄바꿈되도록 글자 단위로 자른다 (font를 먼저 정해야 함)
  function wrap(ctx, str, maxW) {
    const lines = [];
    let line = '';
    for (const ch of str) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch.trim() ? ch : ''; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  function wrapText(ctx, str, x, y, maxW, size, color, lh) {
    ctx.font = size + 'px ' + C.FONT;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    const lines = wrap(ctx, str, maxW);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    return lines.length;
  }

  function nightLabel(nt) { return typeof nt.n === 'number' ? 'NIGHT ' + nt.n : 'NIGHT'; }   // 엔딩용 밤은 번호 없음

  function blink(state) { return Math.floor(state.time / 400) % 2 ? '▶' : '▷'; }

  // ================= 상단 바 =================
  function topBar(ctx, L, state) {
    const cy = C.TOP_UI / 2;
    const I = C.NOTEBOOK_ICON;

    // 수첩 아이콘 (Tab 또는 클릭)
    ctx.strokeStyle = P.uiLight;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(I.x, I.y, I.r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = P.uiLight;
    ctx.fillRect(I.x - 8, I.y - 10, 16, 20);
    ctx.fillStyle = P.silhouette;
    ctx.fillRect(I.x - 4, I.y - 5, 9, 2);
    ctx.fillRect(I.x - 4, I.y - 1, 9, 2);
    ctx.fillRect(I.x - 4, I.y + 3, 6, 2);
    ctx.fillStyle = P.uiDim;
    ctx.fillRect(I.x - 8, I.y - 10, 3, 20);
    if (state.notebook.unread) {
      ctx.fillStyle = P.accent;
      S.circle(ctx, I.x + 14, I.y - 13, 5);
    }
    text(ctx, 'Tab', I.x + I.r + 8, I.y + 5, { size: 11, color: P.uiDim });

    // DAY + 진행 점
    const mid = L.width / 2;
    const isNight = state.night && state.night.phase !== 'dawn';
    text(ctx, (isNight ? nightLabel(state.night) : 'DAY ' + state.day),
      mid, cy - 4, { size: 22, bold: true, color: P.accent, align: 'center' });
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

    // 오늘 만난 이웃 (점선 원 → 채운 원)
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

  // ================= 하단 바 =================
  function helpText(state) {
    switch (state.scene) {
      case 'elevator': return state.elevator.phase === 'select' ? 'W S 층 선택 · Space 이동 · A D 내리기' : '';
      case 'visit': return state.dialog ? 'Space 다음' : '';
      case 'endDay': return 'W S 선택 · Space 확인 · Tab 수첩';
      case 'accuse': return state.accuse && state.accuse.confirm ? 'A D 선택 · Space 확인 · Esc 돌아가기'
        : 'A D 집 선택 · Space 지목 · Tab 수첩 · Esc 돌아가기';
      case 'cutscene': return state.cutscene && state.cutscene.skippable ? 'Esc 인트로 건너뛰기' : '';
      case 'explore': return 'A D 이동 · Space 노크 / 엘리베이터 · Tab 수첩 · G 디버그';
      default: return '';
    }
  }

  function bottomBar(ctx, L, state) {
    const y = L.buildingBottom + C.SLAB + (C.GROUND - C.SLAB) / 2 + 6;
    const label = state.night && state.night.phase !== 'dawn' ? '밤 · 201호 · 내 집' : W.locationLabel(state);
    text(ctx, label, L.innerX, y, { size: 15, bold: true });
    text(ctx, helpText(state), L.innerX + L.innerW, y, { size: 13, color: P.uiDim, align: 'right' });
  }

  // ================= Space 안내 =================
  function promptText(state) {
    if (state.scene !== 'explore') return null;
    const it = W.interactionAt(state);
    if (!it) return null;
    if (it.type === 'knock') return 'Space  ' + it.houseId + '호 노크';
    if (it.type === 'elevator') return 'Space  엘리베이터';
    return null;
  }

  function prompt(ctx, L, state) {
    const str = promptText(state);
    if (!str) return;
    const p = state.player;
    pill(ctx, L.toScreenX(p.x), L.floorBase(p.floor) - 96, str, P.silhouette, P.uiLight);
  }

  // ================= 노크 =================
  function knockBubble(ctx, L, state) {
    const v = state.visit;
    if (!v) return;
    const h = G.building.houses[v.houseId];
    const bx = L.toScreenX(W.boundaryX(v.houseId));
    const side = h.slot === 'left' ? 1 : -1;            // 복도 쪽 방향
    const base = L.floorBase(h.floor);
    const kt = G.visit.knocking(state);

    if (kt !== null) {
      bubble(ctx, bx + side * 34, base - 104, '똑똑');
      if (kt % 300 < 110) {                              // 주먹이 닿는 순간
        ctx.strokeStyle = P.uiLight;
        ctx.lineWidth = 2;
        const cy = base - 40;
        [[-0.6, 9], [0, 11], [0.6, 9]].forEach(function (a) {
          const dx = -side * Math.cos(a[0]);
          const dy = Math.sin(a[0]);
          ctx.beginPath();
          ctx.moveTo(bx + dx * 4, cy + dy * 4);
          ctx.lineTo(bx + dx * (4 + a[1]), cy + dy * (4 + a[1]));
          ctx.stroke();
        });
      }
    } else if (v.phase === 'silence') {
      bubble(ctx, bx + side * 56, base - 120, '…(대답이 없다)');
    }
  }

  // ================= 엘리베이터 층 선택 =================
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
    panel(ctx, x, y, w, floors * row + 10);
    for (let i = 0; i < floors; i++) {
      const f = floors - i;
      const ry = y + 5 + i * row;
      let color = f === p.floor ? P.uiDim : P.uiLight;
      if (f === e.selection) {
        ctx.fillStyle = P.accent;
        ctx.fillRect(x + 5, ry, w - 10, row - 2);
        color = P.silhouette;
      }
      text(ctx, f === p.floor ? f + 'F ·' : f + 'F', x + w / 2, ry + 17, { size: 14, bold: true, color: color, align: 'center' });
    }
  }

  // ================= 토스트: 수첩에 기록됨 =================
  function toast(ctx, L, state) {
    const t = state.toast;
    if (!t) return;
    const k = t.t < 160 ? t.t / 160 : Math.min(1, (C.TOAST_MS - t.t) / 300);
    ctx.save();
    ctx.globalAlpha = Math.max(0, k);
    const cx = L.width / 2;
    const cy = C.TOP_UI + 22 - (1 - Math.min(1, t.t / 160)) * 8;
    ctx.font = 'bold 13px ' + C.FONT;
    const w = ctx.measureText(t.text).width + 46;
    ctx.fillStyle = P.uiLight;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - 14, w, 28, 14);
    ctx.fill();
    ctx.fillStyle = P.silhouette;                       // 작은 수첩 그림
    ctx.fillRect(cx - w / 2 + 14, cy - 7, 11, 14);
    ctx.fillStyle = P.uiLight;
    ctx.fillRect(cx - w / 2 + 17, cy - 3, 6, 1.5);
    ctx.fillRect(cx - w / 2 + 17, cy + 1, 6, 1.5);
    text(ctx, t.text, cx + 10, cy + 5, { size: 13, bold: true, color: P.silhouette, align: 'center' });
    ctx.restore();
  }

  // ================= 대화 영역 (게임 화면 아래) =================
  // 우선순위: 대화 > 침대 메뉴 > 범인 지목 > 밤 소음 텍스트 > 첫 행동 안내 > 빈 틀
  function dialogContent(state) {
    if (G.cutscene.isTitle(state)) return null;
    if (state.dialog) return 'dialog';
    const under = state.scene === 'notebook' ? state.notebook.prevScene : state.scene;   // 수첩 아래에 깔린 장면
    if (under === 'endDay') return 'choice';
    if (under === 'accuse') return 'accuse';
    const nt = state.night;
    if (nt && !nt.hideText && (nt.phase === 'typing' || nt.phase === 'hold')) return 'night';
    if (G.hints.text(state)) return 'hint';
    return 'empty';
  }

  function dialogArea(ctx, L, state) {
    const kind = dialogContent(state);
    if (!kind) return;
    const x = 16, w = L.width - 32, y = L.dialogTop + 4, h = C.DIALOG_H;
    if (kind === 'empty') {
      ctx.strokeStyle = P.uiDim;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      return;
    }
    panel(ctx, x, y, w, h);
    const tx = x + 22;

    if (kind === 'dialog') {
      const d = state.dialog;
      const line = d.lines[d.index];
      if (d.narration) {
        ctx.font = 'italic 18px ' + C.FONT;
        ctx.fillStyle = P.uiLight;
        ctx.textAlign = 'center';
        ctx.fillText(line, x + w / 2, y + h / 2 + 6);
      } else {
        text(ctx, d.speaker, tx, y + 32, { size: 15, bold: true, color: P.accent });
        wrapText(ctx, line, tx, y + 64, w - 44, 17, P.uiLight, 24);
      }
      const page = d.lines.length > 1 ? (d.index + 1) + ' / ' + d.lines.length + '   ' : '';
      text(ctx, page + 'Space ' + blink(state), x + w - 16, y + h - 14, { size: 12, color: P.uiDim, align: 'right' });
    }

    if (kind === 'choice') {
      const e = state.endDay;
      const last = state.day >= state.maxDay;
      text(ctx, '나', tx, y + 30, { size: 15, bold: true, color: P.accent });
      text(ctx, last ? '오늘이 마지막 날이다. 범인을 정해야 해.' : '오늘은 여기까지 할까…?', tx, y + 60, { size: 17 });
      const met = Object.keys(state.talkedToday).length;
      text(ctx, '오늘 만난 이웃  ' + met + ' / ' + Object.keys(state.npcs).length, tx, y + 88, { size: 13, color: P.uiDim });
      const LABEL = { sleep: '잠자리에 든다', accuse: '범인을 지목한다', notYet: '아직 아니야' };
      const ox = x + w - 260;
      e.options.forEach(function (opt, i) {
        const oy = y + 34 + i * 30;
        const on = i === e.index;
        if (on) text(ctx, '▶', ox, oy, { size: 15, color: P.accent });
        text(ctx, LABEL[opt], ox + 24, oy, { size: 16, bold: on, color: on ? P.accent : P.uiLight });
      });
    }

    if (kind === 'accuse') {
      const a = state.accuse;
      const id = G.accuse.selected(state);
      if (!a.confirm) {
        text(ctx, '누가 범인일까?', tx, y + 30, { size: 16, bold: true, color: P.accent });
        const cw = 92, chh = 54, gap = 14;
        const gx = x + w / 2 - (G.accuse.ORDER.length * (cw + gap) - gap) / 2;
        G.accuse.ORDER.forEach(function (hid, i) {
          const cx = gx + i * (cw + gap), cy = y + 50;
          const off = !!state.notebook.excluded[hid];
          ctx.fillStyle = off ? P.lightOff : P[G.building.houses[hid].color];
          ctx.fillRect(cx, cy, cw, chh);
          text(ctx, hid + '호', cx + cw / 2, cy + 24, { size: 15, bold: true, align: 'center', color: off ? P.uiDim : P.silhouette });
          text(ctx, G.residents[hid].item.name, cx + cw / 2, cy + 44, { size: 11, align: 'center', color: off ? P.uiDim : P.silhouette });
          if (i === a.index) {
            ctx.strokeStyle = P.accent;
            ctx.lineWidth = 3;
            ctx.strokeRect(cx - 3, cy - 3, cw + 6, chh + 6);
          }
        });
      } else {
        text(ctx, '나', tx, y + 30, { size: 15, bold: true, color: P.accent });
        text(ctx, '정말 ' + G.residents[id].name + '이(가) 범인일까?', tx, y + 62, { size: 17 });
        text(ctx, '틀리면 그대로 끝이다.', tx, y + 90, { size: 13, color: P.uiDim });
        const ox = x + w - 260;
        ['지목한다', '다시 생각한다'].forEach(function (label, i) {
          const oy = y + 50 + i * 32;
          const on = i === a.confirmIndex;
          if (on) text(ctx, '▶', ox, oy, { size: 15, color: P.accent });
          text(ctx, label, ox + 24, oy, { size: 16, bold: on, color: on ? P.accent : P.uiLight });
        });
      }
    }

    if (kind === 'night') {
      const nt = state.night;
      text(ctx, nightLabel(nt), tx, y + 32, { size: 14, bold: true, color: P.accent });
      wrapText(ctx, G.dayflow.visibleNightText(state), tx, y + 70, w - 44, 21, P.uiLight, 30);
      text(ctx, nt.phase === 'hold' ? 'Space ' + blink(state) : 'Space 건너뛰기', x + w - 16, y + h - 14,
        { size: 12, color: P.uiDim, align: 'right' });
    }

    if (kind === 'hint') {
      ctx.fillStyle = P.accent;
      ctx.fillRect(tx, y + h / 2 - 12, 40, 22);
      text(ctx, 'TIP', tx + 20, y + h / 2 + 4, { size: 12, bold: true, color: P.silhouette, align: 'center' });
      wrapText(ctx, G.hints.text(state), tx + 56, y + h / 2 + 5, w - 100, 15, P.uiLight, 22);
    }
  }

  // ================= 카드: 쪽지 / 목표 안내 (컷신) =================
  function card(ctx, L, state) {
    const cs = state.cutscene;
    if (!cs || !cs.card) return;
    const c = cs.card;
    const cx = L.width / 2;
    const cy = (L.buildingTop + L.buildingBottom) / 2;

    if (c.type === 'note') {
      const w = 380, h = 220;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.025);
      ctx.fillStyle = P.uiLight;                       // 메모지
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = P.uiDim;
      ctx.fillRect(-w / 2, -h / 2, w, 6);
      c.lines.forEach(function (l, i) {
        text(ctx, l, -w / 2 + 30, -h / 2 + 56 + i * 32, { size: 18, color: P.silhouette });
      });
      text(ctx, '— ' + c.from + '호', w / 2 - 30, h / 2 - 34, { size: 16, bold: true, color: P.silhouette, align: 'right' });
      ctx.restore();
      text(ctx, 'Space ' + blink(state), cx, cy + h / 2 + 30, { size: 13, color: P.uiLight, align: 'center' });
    }

    if (c.type === 'goal') {
      const w = 500, h = 290;
      const x = cx - w / 2, y = cy - h / 2;
      panel(ctx, x, y, w, h);
      ctx.font = 'bold 20px ' + C.FONT;
      ctx.fillStyle = P.accent;
      ctx.textAlign = 'center';
      ctx.fillText(c.title, cx, y + 46);
      let ly = y + 92;
      c.rules.forEach(function (r) {
        text(ctx, '·', x + 34, ly, { size: 16, bold: true, color: P.accent });
        const n = wrapText(ctx, r, x + 52, ly, w - 86, 15, P.uiLight, 22);
        ly += n * 22 + 10;
      });
      text(ctx, 'Space  Day 1 시작 ' + blink(state), x + w - 20, y + h - 18, { size: 13, color: P.uiDim, align: 'right' });
    }

    if (c.type === 'ending') {
      const w = 500, h = 250;
      const x = cx - w / 2, y = cy - h / 2;
      panel(ctx, x, y, w, h);
      text(ctx, c.good ? 'ENDING · 해결' : 'ENDING · 오해', cx, y + 40, { size: 13, bold: true, color: c.good ? P.uiLight : P.accent, align: 'center' });
      text(ctx, c.title, cx, y + 78, { size: 24, bold: true, color: P.accent, align: 'center' });
      c.body.forEach(function (b, i) {
        text(ctx, b, cx, y + 124 + i * 28, { size: 15, align: 'center', color: i === 0 ? P.uiLight : P.uiDim });
      });
      text(ctx, 'Space  처음으로 ' + blink(state), cx, y + h - 20, { size: 13, color: P.uiDim, align: 'center' });
    }
  }

  // ================= 타이틀 =================
  function title(ctx, L, state) {
    if (!G.cutscene.isTitle(state)) return;
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, L.width, L.height);
    const cx = L.width / 2;

    // 창문 그리드 (불 꺼진 집들 사이 201호만 켜져 있음)
    const cw = 70, chh = 50, gap = 14;
    const gx = cx - cw - gap / 2;
    const gy = 120;
    G.notebook.GRID.forEach(function (row, r) {
      row.forEach(function (id, c) {
        const x = gx + c * (cw + gap), y = gy + r * (chh + gap);
        ctx.fillStyle = id === G.building.playerHome ? P.roomTeal : P.lightOff;
        ctx.fillRect(x, y, cw, chh);
        if (id === G.building.playerHome) {           // 침대 위 실루엣
          ctx.fillStyle = P.silhouette;
          ctx.fillRect(x + 12, y + chh - 14, 46, 8);
          S.circle(ctx, x + 20, y + chh - 18, 5);
        }
      });
    });

    // "쿵" — 주기적으로 흔들림
    const t = state.time % 2600;
    const shake = t < 320 ? Math.sin(t / 14) * 6 * (1 - t / 320) : 0;
    ctx.font = 'bold 120px ' + C.FONT;
    ctx.fillStyle = P.accent;
    ctx.textAlign = 'center';
    ctx.fillText('쿵', cx + shake, 450);
    text(ctx, '층간소음 추리 게임', cx, 492, { size: 16, color: P.uiDim, align: 'center' });
    text(ctx, 'Space  시작', cx, 580, { size: 18, bold: true, align: 'center' });
    text(ctx, 'Esc  인트로 건너뛰기', cx, 612, { size: 13, color: P.uiDim, align: 'center' });
  }

  // ================= 수첩 =================
  function notebook(ctx, L, state) {
    if (state.scene !== 'notebook') return;
    const nb = state.notebook;
    const x = L.innerX + 16;
    const y = C.TOP_UI + 10;
    const w = L.innerW - 32;
    const h = L.buildingBottom - y - 8;
    panel(ctx, x, y, w, h);
    text(ctx, '수첩', x + 22, y + 36, { size: 22, bold: true });

    // 보기 탭
    [['daily', '날짜별'], ['neighbor', '이웃별']].forEach(function (m, i) {
      const tx = x + w - 170 + i * 80;
      if (nb.mode === m[0]) {
        ctx.fillStyle = P.accent;
        ctx.fillRect(tx, y + 16, 72, 28);
      }
      text(ctx, m[1], tx + 36, y + 35, { size: 14, bold: true, color: nb.mode === m[0] ? P.silhouette : P.uiDim, align: 'center' });
    });

    if (nb.mode === 'daily') notebookDaily(ctx, state, x, y, w, h);
    else notebookNeighbor(ctx, state, x, y, w, h);

    const hint = nb.mode === 'daily'
      ? 'Q E 보기 전환 · A D 날짜 이동 · Tab 닫기'
      : 'Q E 보기 전환 · W A S D 집 선택 · Space 용의자 제외 표시 · Tab 닫기';
    text(ctx, hint, x + w / 2, y + h - 14, { size: 12, color: P.uiDim, align: 'center' });
  }

  function notebookDaily(ctx, state, x, y, w, h) {
    const nb = state.notebook;
    for (let d = 1; d <= state.maxDay; d++) {
      const tx = x + 22 + (d - 1) * 74;
      const ty = y + 60;
      const sel = d === nb.day;
      if (sel) { ctx.fillStyle = P.accent; ctx.fillRect(tx, ty, 66, 26); }
      else {
        ctx.strokeStyle = d <= state.day ? P.uiLight : P.uiDim;
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 0.5, ty + 0.5, 65, 25);
      }
      text(ctx, 'Day ' + d, tx + 33, ty + 18, {
        size: 13, bold: sel, align: 'center', color: sel ? P.silhouette : d <= state.day ? P.uiLight : P.uiDim,
      });
    }

    const list = G.notebook.entriesForDay(state, nb.day);
    let cy = y + 122;
    if (!list.length) { text(ctx, '아직 기록이 없어요.', x + 24, cy, { size: 15, color: P.uiDim }); return; }
    list.forEach(function (e) {
      const tag = e.type === 'noise' ? '밤 ' + e.day : e.houseId + '호';
      text(ctx, tag, x + 24, cy, { size: 14, bold: true, color: P.accent });
      const n = wrapText(ctx, e.type === 'noise' ? '“' + e.text + '”' : e.text, x + 90, cy, w - 120, 15, P.uiLight, 22);
      cy += n * 22 + 12;
    });
  }

  function notebookNeighbor(ctx, state, x, y, w, h) {
    const nb = state.notebook;
    const cw = 84, chh = 56, gap = 10;
    const gx = x + 24, gy = y + 66;

    G.notebook.GRID.forEach(function (row, r) {
      row.forEach(function (id, c) {
        const cx = gx + c * (cw + gap);
        const cy = gy + r * (chh + gap);
        const me = id === G.building.playerHome;
        const off = !!nb.excluded[id];
        ctx.fillStyle = me ? P.hallway : off ? P.lightOff : P[G.building.houses[id].color];
        ctx.fillRect(cx, cy, cw, chh);
        text(ctx, me ? '나' : id, cx + cw / 2, cy + 22, { size: 14, bold: true, align: 'center', color: me ? P.uiDim : off ? P.uiDim : P.silhouette });
        if (off) text(ctx, '✕', cx + cw / 2, cy + 46, { size: 16, bold: true, align: 'center', color: P.accent });
        if (id === nb.cell) {
          ctx.strokeStyle = P.accent;
          ctx.lineWidth = 3;
          ctx.strokeRect(cx - 2, cy - 2, cw + 4, chh + 4);
        }
      });
    });

    const lx = gx + 2 * (cw + gap) + 22;
    const lw = x + w - lx - 22;
    text(ctx, G.residents[nb.cell].name, lx, gy + 18, { size: 16, bold: true, color: P.accent });
    if (nb.excluded[nb.cell]) text(ctx, '용의자에서 제외함', lx, gy + 40, { size: 12, color: P.uiDim });
    text(ctx, '집에 있는 물건: ' + G.residents[nb.cell].item.name, lx, gy + (nb.excluded[nb.cell] ? 60 : 40), { size: 12, color: P.uiDim });

    const list = G.notebook.entriesForHouse(state, nb.cell);
    let cy = gy + 92;
    if (!list.length) { text(ctx, '아직 들은 증언이 없어요.', lx, cy, { size: 14, color: P.uiDim }); return; }
    list.forEach(function (e) {
      text(ctx, 'Day ' + e.day, lx, cy, { size: 13, bold: true, color: P.accent });
      const n = wrapText(ctx, e.text, lx + 54, cy, lw - 54, 14, P.uiLight, 20);
      cy += n * 20 + 10;
    });
  }

  G.renderUI = {
    topBar: topBar, bottomBar: bottomBar, prompt: prompt, promptText: promptText,
    knockBubble: knockBubble, elevatorPanel: elevatorPanel, toast: toast,
    dialogArea: dialogArea, dialogContent: dialogContent, card: card, title: title, notebook: notebook,
  };
})(window.Game = window.Game || {});
