// silhouettes.js — 인물·사물 실루엣 그리기 함수 모음
// 모두 (ctx, x=중심, base=바닥 y, opt) 형태. 색은 PALETTE.silhouette 하나만 쓴다.
// 새 인물/아이템은 여기에 함수 하나를 추가하고 residents.js에서 이름으로 지정하면 된다.
(function (G) {
  'use strict';

  const P = G.config.PALETTE;

  // ---------- 도형 도우미 ----------
  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function rect(ctx, x, y, w, h) { ctx.fillRect(x, y, w, h); }
  function stroke(ctx, pts, w) {
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function ink(ctx) { ctx.fillStyle = P.silhouette; ctx.strokeStyle = P.silhouette; }

  // f: 바라보는 방향 (1 = 오른쪽, -1 = 왼쪽)
  const FIGURES = {
    // 플레이어: 뾰족한 두건을 쓴 작은 인물
    player: function (ctx, x, base, opt) {
      const f = opt.facing === 'left' ? -1 : 1;
      const b = base - (opt.bob || 0);
      ink(ctx);
      rect(ctx, x - 9, b - 8, 6, 8);                     // 다리
      rect(ctx, x + 3, b - 8, 6, 8);
      poly(ctx, [[x - 14, b - 6], [x + 14, b - 6], [x + 9, b - 34], [x - 9, b - 34]]); // 몸
      circle(ctx, x, b - 44, 12);                         // 머리
      poly(ctx, [[x - 9 * f, b - 52], [x + 4 * f, b - 55], [x - 15 * f, b - 72]]); // 두건 끝
      poly(ctx, [[x + 10 * f, b - 47], [x + 17 * f, b - 43], [x + 10 * f, b - 40]]); // 코
      if (opt.knock != null) {                            // 노크: 팔을 뻗어 두드림
        const k = (opt.knock % 300) / 300;
        const reach = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
        const fx = x + (16 + 8 * reach) * f;
        const fy = b - 36 - (1 - reach) * 4;
        stroke(ctx, [[x + 5 * f, b - 28], [fx, fy]], 5);
        circle(ctx, fx, fy, 4.5);
      }
    },

    // 301 할아버지: 굽은 등 + 지팡이
    elder: function (ctx, x, base, opt) {
      const f = opt.facing === 'left' ? -1 : 1;
      ink(ctx);
      rect(ctx, x - 8, base - 22, 6, 22);                 // 다리
      rect(ctx, x + 2, base - 22, 6, 22);
      poly(ctx, [[x - 11 * f, base - 20], [x - 13 * f, base - 42], [x - 2 * f, base - 56],
                 [x + 13 * f, base - 50], [x + 11 * f, base - 20]]); // 굽은 몸
      circle(ctx, x + 13 * f, base - 56, 9);              // 앞으로 숙인 머리
      rect(ctx, x + 13 * f - 11, base - 65, 22, 4);       // 모자 챙
      rect(ctx, x + 13 * f - 7, base - 72, 14, 8);
      stroke(ctx, [[x + 16 * f, base - 36], [x + 26 * f, base]], 3); // 지팡이
    },

    // 302 직장인: 키 크고 가방
    worker: function (ctx, x, base, opt) {
      const f = opt.facing === 'left' ? -1 : 1;
      ink(ctx);
      rect(ctx, x - 8, base - 26, 6, 26);
      rect(ctx, x + 2, base - 26, 6, 26);
      poly(ctx, [[x - 13, base - 24], [x + 13, base - 24], [x + 11, base - 62], [x - 11, base - 62]]);
      circle(ctx, x, base - 74, 11);
      rect(ctx, x + 14 * f - (f < 0 ? 18 : 0), base - 34, 18, 14); // 서류가방
    },

    // 202 엄마 + 아이
    motherKid: function (ctx, x, base, opt) {
      const f = opt.facing === 'left' ? -1 : 1;
      ink(ctx);
      poly(ctx, [[x - 18, base], [x + 18, base], [x + 9, base - 46], [x - 9, base - 46]]);
      circle(ctx, x, base - 57, 11);
      circle(ctx, x - 8 * f, base - 66, 6);               // 올림머리
      const kx = x - 28 * f;                              // 아이는 엄마 뒤에
      poly(ctx, [[kx - 9, base], [kx + 9, base], [kx + 6, base - 20], [kx - 6, base - 20]]);
      circle(ctx, kx, base - 28, 8);
      stroke(ctx, [[x - 9 * f, base - 34], [kx + 5 * f, base - 16]], 4); // 잡은 손
    },

    // 101 대학생: 후드 + 헤드폰
    student: function (ctx, x, base, opt) {
      ink(ctx);
      rect(ctx, x - 9, base - 18, 7, 18);
      rect(ctx, x + 2, base - 18, 7, 18);
      poly(ctx, [[x - 15, base - 16], [x + 15, base - 16], [x + 12, base - 52], [x - 12, base - 52]]);
      circle(ctx, x, base - 63, 12);
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.arc(x, base - 64, 16, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      rect(ctx, x - 19, base - 68, 7, 12);
      rect(ctx, x + 12, base - 68, 7, 12);
    },

    // 102 부부
    couple: function (ctx, x, base) {
      ink(ctx);
      const a = x - 16, b = x + 16;
      rect(ctx, a - 8, base - 24, 6, 24);
      rect(ctx, a + 2, base - 24, 6, 24);
      poly(ctx, [[a - 12, base - 22], [a + 12, base - 22], [a + 10, base - 58], [a - 10, base - 58]]);
      circle(ctx, a, base - 69, 11);
      poly(ctx, [[b - 15, base], [b + 15, base], [b + 8, base - 48], [b - 8, base - 48]]);
      circle(ctx, b, base - 58, 10);
      poly(ctx, [[b - 10, base - 62], [b + 10, base - 62], [b + 12, base - 40], [b - 12, base - 40]]); // 긴 머리
      circle(ctx, b, base - 58, 10);
    },
  };

  const ITEMS = {
    massageChair: function (ctx, x, base) {
      ink(ctx);
      poly(ctx, [[x - 30, base - 22], [x + 10, base - 22], [x + 14, base - 34], [x - 26, base - 34]]); // 좌석
      poly(ctx, [[x + 6, base - 30], [x + 22, base - 30], [x + 34, base - 86], [x + 18, base - 90]]); // 등받이
      poly(ctx, [[x - 30, base - 30], [x - 22, base - 26], [x - 40, base - 2], [x - 48, base - 6]]);  // 발받침
      rect(ctx, x - 14, base - 22, 22, 22);              // 받침대
      rect(ctx, x - 22, base - 46, 34, 7);               // 팔걸이
    },
    treadmill: function (ctx, x, base) {
      ink(ctx);
      poly(ctx, [[x - 46, base], [x + 34, base], [x + 34, base - 16], [x - 46, base - 8]]); // 벨트
      poly(ctx, [[x + 26, base - 12], [x + 34, base - 12], [x + 30, base - 66], [x + 22, base - 66]]); // 기둥
      rect(ctx, x + 6, base - 76, 34, 12);               // 계기판
      stroke(ctx, [[x + 24, base - 60], [x - 6, base - 56]], 4); // 손잡이
    },
    bed: function (ctx, x, base) {
      ink(ctx);
      rect(ctx, x - 52, base - 24, 104, 16);
      rect(ctx, x - 52, base - 8, 6, 8);
      rect(ctx, x + 46, base - 8, 6, 8);
      rect(ctx, x - 58, base - 56, 10, 56);              // 머리판
      poly(ctx, [[x - 46, base - 24], [x - 16, base - 24], [x - 20, base - 36], [x - 44, base - 36]]); // 베개
    },
    ball: function (ctx, x, base) {
      ink(ctx);
      circle(ctx, x - 14, base - 13, 13);
      rect(ctx, x + 6, base - 30, 34, 30);               // 장난감 상자
      poly(ctx, [[x + 2, base - 30], [x + 44, base - 30], [x + 40, base - 38], [x + 6, base - 38]]);
    },
    drum: function (ctx, x, base) {
      ink(ctx);
      circle(ctx, x - 10, base - 18, 18);                // 킥
      stroke(ctx, [[x + 18, base], [x + 22, base - 50]], 3);
      stroke(ctx, [[x + 30, base], [x + 22, base - 50]], 3);
      ctx.beginPath(); ctx.ellipse(x + 22, base - 50, 16, 5, 0, 0, Math.PI * 2); ctx.fill(); // 패드
      stroke(ctx, [[x - 34, base], [x - 34, base - 70]], 3);
      ctx.beginPath(); ctx.ellipse(x - 34, base - 72, 20, 4, -0.15, 0, Math.PI * 2); ctx.fill(); // 심벌
    },
    washer: function (ctx, x, base, opt) {
      ink(ctx);
      ctx.beginPath();
      ctx.roundRect(x - 28, base - 62, 56, 62, 6);
      ctx.fill();
      ctx.fillStyle = opt.hole;                          // 둥근 문: 방 색으로 뚫어 보이게
      circle(ctx, x, base - 28, 16);
      ink(ctx);
      circle(ctx, x, base - 28, 10);
    },
  };

  G.silhouettes = { FIGURES: FIGURES, ITEMS: ITEMS, poly: poly, circle: circle, stroke: stroke };
})(window.Game = window.Game || {});
