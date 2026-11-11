// util.js — 공용 계산 함수 (상태를 직접 다루지 않음)
(function (G) {
  'use strict';

  G.util = {
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },

    // 0~1 → 0~1, 시작과 끝을 부드럽게
    ease: function (t) {
      t = Math.max(0, Math.min(1, t));
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },

    // 진행 중인 단계의 진행률 (0~1)
    progress: function (t, ms) { return ms <= 0 ? 1 : Math.max(0, Math.min(1, t / ms)); },

    // 자동 이동 { fromX, toX, t, ms } 한 프레임 진행. 끝나면 true.
    stepTween: function (obj, tw, dt) {
      tw.t += dt;
      const k = G.util.ease(tw.t / tw.ms);
      obj.x = tw.fromX + (tw.toX - tw.fromX) * k;
      if (tw.t >= tw.ms) { obj.x = tw.toX; return true; }
      return false;
    },
  };
})(window.Game = window.Game || {});
