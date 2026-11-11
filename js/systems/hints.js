// hints.js — 첫 행동 안내 (한 번 보여준 안내는 다시 뜨지 않음)
// 안내는 대화 영역에 대화가 없을 때만 표시된다.
(function (G) {
  'use strict';

  const TEXT = {
    move: 'A D 로 걸어 다닐 수 있어요.',
    knock: '이웃 집 경계 앞에서 Space 로 노크해 보세요. 엘리베이터는 복도 가운데에 있어요.',
    notebook: '들은 이야기는 수첩에 남아요. Tab 으로 열어 보세요.',
    bed: '하루를 마치려면 침대로 가세요.',
    lastDay: '오늘이 마지막 날이에요. 침대에서 범인을 지목해야 해요. (Tab 으로 수첩 확인)',
  };

  function update(state) {
    const h = state.hints;
    const p = state.player;
    h.current = null;
    if (state.scene !== 'explore') return;

    if (!h.seen.move) {
      if (p.walking) h.seen.move = true;
      else { h.current = 'move'; return; }
    }
    if (!h.seen.knock && p.area === 'hallway') { h.current = 'knock'; return; }
    if (!h.seen.notebook && state.log.some(function (e) { return e.type === 'testimony'; })) { h.current = 'notebook'; return; }
    if (!h.seen.bed && state.flags.wentOut && p.area === 'home') { h.current = 'bed'; return; }
    if (state.day >= state.maxDay && !h.seen.lastDay) { h.current = 'lastDay'; return; }
  }

  function text(state) { return state.hints.current ? TEXT[state.hints.current] : null; }

  G.hints = { update: update, text: text, TEXT: TEXT };
})(window.Game = window.Game || {});
