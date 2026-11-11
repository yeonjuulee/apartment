// render-fx.js — 감정 이펙트(기호 + 몸짓), 밤 어둠, 침대에 누운 플레이어, 바닥의 쪽지, 화면 흔들림 (상태는 읽기만)
(function (G) {
  'use strict';

  const C = G.config;
  const P = C.PALETTE;
  const S = G.silhouettes;
  const W = G.world;

  // ---------- 밤 진행 정도 ----------
  function nightAmount(state) {          // 집들이 어두워진 정도 0~1
    const nt = state.night;
    if (!nt || nt.phase === 'dawn') return 0;
    if (nt.phase === 'fadeIn') return Math.min(1, nt.t / C.NIGHT_FADE_MS);
    return 1;
  }
  function blackout(state) {             // 화면 전체가 검게 덮인 정도 0~1 (밤→아침 전환)
    const nt = state.night;
    if (!nt) return 0;
    if (nt.phase === 'fadeOut') return Math.min(1, nt.t / C.NIGHT_FADE_MS);
    if (nt.phase === 'dawn') return 1 - Math.min(1, nt.t / C.NIGHT_FADE_MS);
    return 0;
  }
  function isLying(state) { return !!state.night && state.night.phase !== 'dawn'; }

  // ---------- 몸짓: 감정 이펙트에 따라 인물을 흔들고, 띄우고, 숙인다 ----------
  // 반환값은 발밑 기준 이동/회전: { dx, dy, rot }
  function gesture(e, facing) {
    const none = { dx: 0, dy: 0, rot: 0 };
    if (!e || !e.gesture) return none;
    const t = e.t;
    const f = facing === 'left' ? -1 : 1;
    switch (e.gesture) {
      case 'tremble':                                   // 부들부들
        return { dx: Math.sin(t / 15) * 2.4, dy: 0, rot: Math.sin(t / 21) * 0.035 };
      case 'jump': {                                    // 깜짝 뜀
        const k = Math.min(1, t / 380);
        return { dx: 0, dy: -16 * Math.sin(Math.PI * k), rot: 0 };
      }
      case 'slump': {                                   // 어깨가 축 처짐 (앞으로 숙임)
        const k = Math.min(1, t / 240);
        return { dx: 0, dy: 3 * k, rot: 0.13 * k * f };
      }
      case 'stomp':                                     // 발 구르기
        return t < 720 ? { dx: 0, dy: -Math.abs(Math.sin(t / 60)) * 6, rot: 0 } : none;
      default:
        return none;
    }
  }

  function shakeOffset(state) {
    const nt = state.night;
    if (!nt || nt.shake <= 0) return { x: 0, y: 0 };
    const k = nt.shake / C.SHAKE_MS;
    return { x: Math.sin(state.time / 18) * C.SHAKE_PX * k, y: Math.cos(state.time / 23) * C.SHAKE_PX * 0.6 * k };
  }

  // ---------- 밤: 불 꺼진 건물 ----------
  function nightOverlay(ctx, L, state) {
    const a = nightAmount(state);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    for (let f = 1; f <= G.building.floors; f++) {
      const top = L.floorTop(f);
      W.segments().forEach(function (seg) {
        const id = seg.type === 'house' ? W.houseIdAt(f, seg.slot) : null;
        ctx.fillStyle = id === G.building.playerHome ? P.nightLight : P.nightHeavy;
        ctx.fillRect(L.toScreenX(seg.x0), top, seg.width, C.FLOOR_H);
      });
    }
    ctx.fillStyle = P.nightHeavy;               // 외벽
    ctx.fillRect(L.innerX - C.WALL, L.buildingTop, C.WALL, L.buildingBottom - L.buildingTop);
    ctx.fillRect(L.innerX + L.innerW, L.buildingTop, C.WALL, L.buildingBottom - L.buildingTop);
    ctx.restore();
  }

  function blackoutLayer(ctx, L, state) {
    const a = blackout(state);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, L.width, L.height);
    ctx.restore();
  }

  // ---------- 침대에 누운 플레이어 ----------
  function bedPoint(L) {
    const id = G.building.playerHome;
    return { x: L.toScreenX(W.housePoint(id, 0.27)), base: L.floorBase(G.building.houses[id].floor) };
  }

  function lyingPlayer(ctx, L, state) {
    const b = bedPoint(L);
    const nt = state.night;
    const toss = nt.phase === 'toss' ? Math.sin(nt.t / 70) * 0.12 : 0;
    const g = gesture(G.emotes.of(state, 'player'), 'right');   // 누운 채로 부들부들
    ctx.save();
    ctx.translate(b.x + 44 + g.dx, b.base - 38 + g.dy * 0.3 + (toss ? Math.abs(toss) * 20 : 0));
    ctx.rotate(-Math.PI / 2 + toss);            // 발은 오른쪽, 머리는 머리판 쪽
    S.FIGURES.player(ctx, 0, 0, { facing: 'right' });
    ctx.restore();
  }

  // ---------- 인트로: 바닥에 놓인 쪽지 ----------
  function note(ctx, L, state) {
    const cs = state.cutscene;
    if (!cs || !cs.note) return;
    const h = G.building.houses[G.building.playerHome];
    const x = L.toScreenX(G.cutscene.noteX());
    const base = L.floorBase(h.floor);
    ctx.save();
    ctx.translate(x, base - 3);
    ctx.rotate(-0.12);
    ctx.fillStyle = P.uiLight;
    ctx.fillRect(-11, -5, 22, 7);
    ctx.restore();
    if (cs.sub === 'walk') {                            // 반짝임
      const a = 0.5 + 0.5 * Math.sin(state.time / 160);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = P.uiLight;
      S.poly(ctx, [[x, base - 26], [x + 3, base - 19], [x, base - 12], [x - 3, base - 19]]);
      ctx.restore();
    }
  }

  // ---------- 감정 이펙트 ----------
  function emoteAnchor(L, state, target) {
    if (target === 'player') {
      if (isLying(state)) { const b = bedPoint(L); return { x: b.x - 30, y: b.base - 74 }; }
      const p = state.player;
      const g = gesture(G.emotes.of(state, 'player'), p.facing);
      return { x: L.toScreenX(p.x) + 12 + g.dx, y: L.floorBase(p.floor) - 88 + g.dy };
    }
    const n = state.npcs[target];
    const h = G.building.houses[target];
    return { x: L.toScreenX(n.x) + 10, y: L.floorBase(h.floor) - 100 };
  }

  function emotes(ctx, L, state) {
    state.emotes.forEach(function (e) {
      if (e.target === 'player' && state.player.inElevator) return;
      const a = emoteAnchor(L, state, e.target);
      drawEmote(ctx, a.x, a.y, e);
    });
  }

  function drawEmote(ctx, x, y, e) {
    const t = e.t;
    const pop = t < 140 ? 1.25 * (t / 140) : t < 260 ? 1.25 - 0.25 * ((t - 140) / 120) : 1;
    const fade = Math.min(1, (e.ms - t) / 250);
    ctx.save();
    ctx.translate(x, y - 8 * (t / e.ms));
    ctx.scale(pop, pop);
    ctx.globalAlpha = Math.max(0, fade);
    SHAPES[e.type](ctx);
    ctx.restore();
  }

  function angerMark(ctx, cx, cy, s) {
    ctx.strokeStyle = P.accent;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      ctx.beginPath();
      ctx.moveTo(cx + q[0] * s * 0.3, cy + q[1] * s);
      ctx.lineTo(cx + q[0] * s * 0.3, cy + q[1] * s * 0.3);
      ctx.lineTo(cx + q[0] * s, cy + q[1] * s * 0.3);
      ctx.stroke();
    });
  }

  const SHAPES = {
    anger: function (ctx) { angerMark(ctx, 0, 0, 10); },
    anger2: function (ctx) { angerMark(ctx, -9, 4, 8); angerMark(ctx, 10, -8, 11); },
    sweat: function (ctx) {
      ctx.fillStyle = P.uiLight;
      S.circle(ctx, 0, 4, 5.5);
      S.poly(ctx, [[-5, 2], [5, 2], [0, -9]]);
    },
    surprise: function (ctx) {
      ctx.fillStyle = P.accent;
      ctx.fillRect(-3, -14, 6, 16);
      S.circle(ctx, 0, 8, 3.5);
    },
  };

  G.renderFX = {
    nightAmount: nightAmount, blackout: blackout, isLying: isLying, shakeOffset: shakeOffset,
    nightOverlay: nightOverlay, blackoutLayer: blackoutLayer, lyingPlayer: lyingPlayer, emotes: emotes,
    gesture: gesture, note: note,
  };
})(window.Game = window.Game || {});
