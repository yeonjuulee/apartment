// input.js — 키보드·마우스 입력 수집
// 로직은 getHorizontal() / consumePressed() / consumeClick() / endFrame()만 쓰므로
// 테스트에서는 같은 모양의 가짜 입력으로 바꿔 끼울 수 있다.
(function (G) {
  'use strict';

  function createInput(target, canvas) {
    const KEYS = G.config.KEYS;
    const heldH = [];           // 누르고 있는 좌우 방향 (나중에 누른 것이 뒤)
    const pressed = new Set();  // 이번 프레임에 새로 눌린 동작
    let click = null;           // 이번 프레임의 클릭 (캔버스 좌표)

    function onDown(e) {
      const action = KEYS[e.code];
      if (!action) return;
      e.preventDefault();
      if (e.repeat) return;     // 꾹 눌러도 반복 입력되지 않게
      if (action === 'left' || action === 'right') {
        const i = heldH.indexOf(action);
        if (i !== -1) heldH.splice(i, 1);
        heldH.push(action);
      }
      pressed.add(action);
    }

    function onUp(e) {
      const action = KEYS[e.code];
      const i = heldH.indexOf(action);
      if (i !== -1) heldH.splice(i, 1);
    }

    function onBlur() { heldH.length = 0; pressed.clear(); }

    function onClick(e) {
      const r = canvas.getBoundingClientRect();
      click = {
        x: (e.clientX - r.left) * canvas.width / r.width,
        y: (e.clientY - r.top) * canvas.height / r.height,
      };
    }

    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    target.addEventListener('blur', onBlur);
    if (canvas) canvas.addEventListener('click', onClick);

    return {
      getHorizontal: function () { return heldH.length ? heldH[heldH.length - 1] : null; },
      consumePressed: function (action) {
        if (pressed.has(action)) { pressed.delete(action); return true; }
        return false;
      },
      consumeClick: function () { const c = click; click = null; return c; },
      endFrame: function () { pressed.clear(); click = null; },
    };
  }

  G.createInput = createInput;
})(window.Game = window.Game || {});
