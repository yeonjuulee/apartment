// state.js — 게임 상태 생성
// "변하는 값"은 전부 이 객체에 있다. 수정은 update.js와 systems/*.js에서만, render는 읽기만.
(function (G) {
  'use strict';

  function createState() {
    const B = G.building;
    const W = G.world;
    const home = B.houses[B.playerHome];

    // 이웃은 움직이므로 위치를 상태로 둔다
    const npcs = {};
    Object.keys(G.residents).forEach(function (id) {
      const r = G.residents[id];
      if (!r.figure) return;
      const x = W.housePoint(id, r.homeRatio);
      npcs[id] = { x: x, homeX: x, targetX: x, walking: false, facing: null };
    });

    return {
      scene: 'explore',          // 'explore' | 'visit' | 'elevator' (이후: 'notebook' | 'night' ...)

      player: {
        floor: home.floor,
        area: 'home',            // 'home' | 'hallway' (x 위치로 정해짐)
        x: W.housePoint(B.playerHome, B.playerStartRatio),
        facing: 'right',
        walking: false,
        inElevator: false,
        tween: null,             // 자동 이동 { fromX, toX, t, ms }
      },

      npcs: npcs,

      // 진행 중인 방문: { houseId, mode: 'normal'|'refuse'|'silence', phase, t }
      visit: null,
      // 화면에 떠 있는 대화: { houseId, text, fromInside(나오지 않고 집 안에서) }
      dialog: null,

      elevator: {
        floor: B.elevatorStartFloor, // 승강기가 서 있는(또는 마지막으로 선) 층
        pos: B.elevatorStartFloor,   // 화면용 실수 위치 (이동 중 2.4 등)
        phase: 'idle',               // idle | summon | opening | boarding | select | closing | moving | arriving | exiting | closingAfter
        t: 0,
        from: null, to: null,
        selection: null,
      },

      // ---- 하루 단위 기록 ----
      day: 1,
      maxDay: 5,
      talkedToday: {},           // { '301': true } 오늘 대화를 마친 집
      knocksToday: {},           // { '301': 2 } 오늘 노크 횟수
      log: [],                   // 증언 수첩: [{ day, houseId, text }]
      flags: {},

      debug: false,
      time: 0,
    };
  }

  G.createState = createState;
})(window.Game = window.Game || {});
