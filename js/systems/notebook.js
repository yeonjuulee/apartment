// notebook.js — 증언 수첩: 자동 기록, 토스트, 열기/닫기, 보기 전환, 용의자 제외 표시
//
// 기록되는 것: 이웃 증언 요약(대화를 끝까지 들었을 때), 밤 소음(텍스트가 끝났을 때)
// 기록되지 않는 것: 거절, 무응답, 증언이 없는 날의 기본 대사
(function (G) {
  'use strict';

  // 이웃별 보기 그리드 (3층 → 1층, 왼쪽 → 오른쪽). 201은 '나'라서 고를 수 없다.
  const GRID = [['301', '302'], ['201', '202'], ['101', '102']];

  function record(state, entry) {
    const dup = state.log.some(function (e) {
      return e.day === entry.day && e.type === entry.type && e.houseId === entry.houseId && e.text === entry.text;
    });
    if (dup) return false;
    state.log.push(entry);
    state.notebook.unread = true;
    state.toast = { text: '수첩에 기록됨', t: 0 };
    return true;
  }

  function canOpen(state) { return state.scene === 'explore' || state.scene === 'endDay' || state.scene === 'accuse'; }

  function open(state) {
    const nb = state.notebook;
    nb.prevScene = state.scene;
    nb.day = state.day;
    nb.unread = false;
    state.hints.seen.notebook = true;
    state.scene = 'notebook';
    state.player.walking = false;
  }

  function close(state) {
    state.scene = state.notebook.prevScene || 'explore';
    state.notebook.prevScene = null;
  }

  function findCell(id) {
    for (let r = 0; r < GRID.length; r++) {
      for (let c = 0; c < GRID[r].length; c++) if (GRID[r][c] === id) return { r: r, c: c };
    }
    return { r: 0, c: 0 };
  }

  // 그리드에서 한 칸 이동. 201(나)은 건너뛴다.
  function moveCell(id, dr, dc) {
    let pos = findCell(id);
    for (let i = 0; i < 2; i++) {
      const r = pos.r + dr, c = pos.c + dc;
      if (r < 0 || r >= GRID.length || c < 0 || c >= GRID[0].length) return id;
      pos = { r: r, c: c };
      if (GRID[r][c] !== G.building.playerHome) return GRID[r][c];
    }
    return id;
  }

  function update(state, input) {
    const nb = state.notebook;
    if (input.consumePressed('notebook') || input.consumePressed('close')) { close(state); return; }
    if (input.consumePressed('tabPrev') || input.consumePressed('tabNext')) {
      nb.mode = nb.mode === 'daily' ? 'neighbor' : 'daily';
      return;
    }
    if (nb.mode === 'daily') {
      if (input.consumePressed('left')) nb.day = Math.max(1, nb.day - 1);
      if (input.consumePressed('right')) nb.day = Math.min(state.day, nb.day + 1);
    } else {
      if (input.consumePressed('up')) nb.cell = moveCell(nb.cell, -1, 0);
      if (input.consumePressed('down')) nb.cell = moveCell(nb.cell, 1, 0);
      if (input.consumePressed('left')) nb.cell = moveCell(nb.cell, 0, -1);
      if (input.consumePressed('right')) nb.cell = moveCell(nb.cell, 0, 1);
      if (input.consumePressed('action')) nb.excluded[nb.cell] = !nb.excluded[nb.cell];
    }
  }

  function updateToast(state, dt) {
    if (!state.toast) return;
    state.toast.t += dt;
    if (state.toast.t >= G.config.TOAST_MS) state.toast = null;
  }

  // 화면용 조회
  function entriesForDay(state, day) {
    return state.log.filter(function (e) { return e.day === day; })
      .sort(function (a, b) { return (a.type === 'noise' ? 0 : 1) - (b.type === 'noise' ? 0 : 1); });
  }
  function entriesForHouse(state, id) {
    return state.log.filter(function (e) { return e.type === 'testimony' && e.houseId === id; });
  }

  // 수첩 아이콘을 클릭했는가
  function hitIcon(pt) {
    const I = G.config.NOTEBOOK_ICON;
    return pt && Math.hypot(pt.x - I.x, pt.y - I.y) <= I.r + 4;
  }

  G.notebook = {
    GRID: GRID, record: record, canOpen: canOpen, open: open, close: close, update: update,
    updateToast: updateToast, entriesForDay: entriesForDay, entriesForHouse: entriesForHouse,
    moveCell: moveCell, hitIcon: hitIcon,
  };
})(window.Game = window.Game || {});
