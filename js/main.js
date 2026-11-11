// main.js — 시작점: 캔버스 준비 + 게임 루프
(function (G) {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const L = G.computeLayout();
  canvas.width = L.width;
  canvas.height = L.height;

  const state = G.createState();
  const input = G.createInput(window);

  G.state = state;   // 개발용: 콘솔에서 Game.state 로 확인

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(now - last, G.config.MAX_DT);
    last = now;
    G.update(state, input, dt);   // 1) 규칙: 상태 변경
    input.endFrame();
    G.render(ctx, state, L);      // 2) 그리기: 상태 읽기
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})(window.Game = window.Game || {});
