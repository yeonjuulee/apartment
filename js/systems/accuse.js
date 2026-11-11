// accuse.js — 범인 지목
//   침대 메뉴에서 "범인을 지목한다" → 5집 중 선택(A/D·W/S) → "정말?" 확인 → 엔딩 컷신
//   Esc: 침대 메뉴로 돌아감 / Tab: 수첩 보기
(function (G) {
  'use strict';

  const ORDER = ['301', '302', '202', '101', '102'];

  function start(state) {
    state.scene = 'accuse';
    state.accuse = { index: 0, confirm: false, confirmIndex: 1 };   // 확인은 "다시 생각한다"가 기본
    state.endDay = null;
  }

  function selected(state) { return ORDER[state.accuse.index]; }

  function update(state, input) {
    const a = state.accuse;
    if (!a.confirm) {
      if (input.consumePressed('left') || input.consumePressed('up')) a.index = (a.index + ORDER.length - 1) % ORDER.length;
      if (input.consumePressed('right') || input.consumePressed('down')) a.index = (a.index + 1) % ORDER.length;
      if (input.consumePressed('close')) { back(state); return; }
      if (input.consumePressed('action')) { a.confirm = true; a.confirmIndex = 1; }
      return;
    }
    if (input.consumePressed('up') || input.consumePressed('down') ||
        input.consumePressed('left') || input.consumePressed('right')) a.confirmIndex = 1 - a.confirmIndex;
    if (input.consumePressed('close')) { a.confirm = false; return; }
    if (input.consumePressed('action')) {
      if (a.confirmIndex === 1) { a.confirm = false; return; }
      const id = selected(state);
      state.accuse = null;
      G.cutscene.start(state, G.endings.build(state, id));
    }
  }

  function back(state) {
    state.accuse = null;
    G.dayflow.openBedMenu(state);
  }

  G.accuse = { ORDER: ORDER, start: start, update: update, selected: selected };
})(window.Game = window.Game || {});
