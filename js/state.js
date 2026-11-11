// state.js — 게임 상태 생성
// "변하는 값"은 전부 이 객체에 있다. 수정은 update.js에서만, render.js는 읽기만.
(function (G) {
  'use strict';

  function createState() {
    const B = G.building;
    const home = B.houses[B.playerHome];
    const seg = G.world.segmentBySlot(home.slot);

    return {
      scene: 'explore',          // 이후: 'dialog' | 'notebook' | 'night' | 'accuse' | 'ending'

      player: {
        floor: home.floor,
        x: seg.x0 + seg.width * B.playerStartRatio,
        facing: 'left',          // 'left' | 'right'
        walking: false,
        floorMove: null,         // 계단 이동 중: { from, to, t(0~1) }
      },

      // ---- 이후 단계에서 사용할 자리 ----
      day: 1,
      maxDay: 5,                 // 마지노선
      talkedToday: {},           // { '301': true, ... } 하루 1회 대화 제한
      log: [],                   // 증언 수첩: [{ day, houseId, text }]
      flags: {},                 // 이벤트 진행 상황

      debug: false,
      time: 0,
    };
  }

  G.createState = createState;
})(window.Game = window.Game || {});
