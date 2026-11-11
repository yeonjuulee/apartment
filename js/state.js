// state.js — 게임 상태 생성
// "변하는 값"은 전부 이 객체에 있다. 수정은 update.js와 systems/*.js에서만, render는 읽기만.
(function (G) {
  'use strict';

  // opts.intro: true면 타이틀 + 인트로 컷신부터, false면 Day 1 아침부터. 기본값은 config.START_WITH_INTRO.
  function createState(opts) {
    opts = opts || {};
    const intro = opts.intro !== undefined ? opts.intro : G.config.START_WITH_INTRO;
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

    const state = {
      // 'explore' | 'visit' | 'elevator' | 'notebook' | 'endDay' | 'accuse' | 'night' | 'cutscene'
      scene: 'explore',

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
      // 대화 영역에 떠 있는 대화: { speaker(이름, 없으면 내레이션), narration, lines, index }
      dialog: null,

      elevator: {
        floor: B.elevatorStartFloor,
        pos: B.elevatorStartFloor,
        phase: 'idle',
        t: 0,
        from: null, to: null,
        selection: null,
      },

      // ---- 하루 ----
      day: 1,
      maxDay: 5,
      talkedToday: {},           // { '301': true } 오늘 대화를 마친 집
      knocksToday: {},           // { '301': 2 } 오늘 노크 횟수
      bedArmed: true,            // 침대 범위 밖에 있다가 들어오면 "잠자리에 들까?" (들어온 순간 false)
      endDay: null,              // 침대 메뉴: { options: ['sleep'|'accuse'|'notYet'], index }
      accuse: null,              // 범인 지목: { index, confirm, confirmIndex }
      night: null,               // 밤 진행: { n, phase, t, chars, shake }

      // ---- 수첩 ----
      log: [],                   // [{ day, type: 'testimony'|'noise', houseId?, text }]
      notebook: {
        mode: 'daily',           // 'daily' | 'neighbor'
        day: 1,                  // 날짜별 보기에서 보고 있는 Day
        cell: '301',             // 이웃별 보기에서 고른 집
        excluded: {},            // 용의자에서 제외 표시한 집 { '202': true }
        unread: false,           // 새 기록 점
        prevScene: null,
      },
      toast: null,               // { text, t }

      emotes: [],                // 감정 이펙트 [{ target: 'player'|'301'.., type, gesture, t, ms }]

      cutscene: null,            // 인트로 등 컷신 진행: { script, i, step, t, sub, card, note }
      hints: { seen: {}, current: null },   // 첫 행동 안내

      flags: {},
      debug: false,
      time: 0,
    };

    if (intro) G.cutscene.start(state, G.intro);
    return state;
  }

  G.createState = createState;
})(window.Game = window.Game || {});
