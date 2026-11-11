// dayflow.js — 하루의 흐름: 침대 메뉴 → 밤(소음) → 다음 날 아침
//
//  낮(explore) ──내 집 침대 앞으로 걸어감──▶ 침대 메뉴 (대화 영역)
//      ▲                                     │ "아직 아니야"     → 다시 낮 (침대에서 벗어났다 돌아오면 또 뜸)
//      │                                     │ "범인을 지목한다" → accuse.js → 엔딩
//      │                                     │ "잠자리에 든다"   (마지막 날에는 없음)
//      │                                     ▼
//  아침(startDay) ◀── dawn ◀── fadeOut ◀── toss ◀── hold ◀── typing ◀── fadeIn  (night)
//
// Night N을 지나면 Day N 아침이 된다. 인트로의 Night 1 → Day 1.
// 컷신(인트로·엔딩)에서는 밤을 scripted로 열어, hold 이후 진행을 컷신이 맡는다.
(function (G) {
  'use strict';

  const C = G.config;

  // ---------- 침대: 잠자리에 들까? ----------
  // 매 프레임 호출. 침대 범위에 "새로 들어온" 순간에만 선택창을 띄운다.
  function checkBed(state) {
    if (!G.world.atBed(state)) { state.bedArmed = true; return; }
    if (!state.bedArmed) return;
    state.bedArmed = false;
    openBedMenu(state);
    state.hints.seen.bed = true;
    if (state.day >= state.maxDay) state.hints.seen.lastDay = true;
  }

  // 마지막 날에는 "잠자리에 든다"가 없다 → 반드시 지목해야 함
  function bedOptions(state) {
    return state.day >= state.maxDay ? ['accuse', 'notYet'] : ['sleep', 'accuse', 'notYet'];
  }

  function openBedMenu(state) {
    state.endDay = { options: bedOptions(state), index: 0 };
    state.scene = 'endDay';
    state.player.walking = false;
  }

  function updateEndDay(state, input) {
    const e = state.endDay;
    const n = e.options.length;
    if (input.consumePressed('up')) e.index = (e.index + n - 1) % n;
    if (input.consumePressed('down')) e.index = (e.index + 1) % n;
    if (input.consumePressed('close')) { e.index = e.options.indexOf('notYet'); confirm(state); return; }
    if (input.consumePressed('action')) confirm(state);
  }

  function confirm(state) {
    const choice = state.endDay.options[state.endDay.index];
    state.endDay = null;
    if (choice === 'notYet') { state.scene = 'explore'; return; }
    if (choice === 'accuse') { G.accuse.start(state); return; }
    startNight(state, state.day + 1);
  }

  // ---------- 밤 ----------
  // opts.scripted: 컷신이 진행을 맡음 / opts.record: false면 수첩에 기록 안 함 / opts.dayAfter: 아침이 될 Day
  function startNight(state, n, opts) {
    opts = opts || {};
    const scripted = !!opts.scripted;
    if (!scripted) state.scene = 'night';
    state.night = {
      n: n, phase: 'fadeIn', t: 0, chars: 0, charT: 0, shake: 0, scripted: scripted, hideText: false,
      record: opts.record !== false, dayAfter: opts.dayAfter !== undefined ? opts.dayAfter : n,
    };
    state.visit = null;
    state.dialog = null;
    state.endDay = null;
    const p = state.player;
    p.walking = false;
    p.tween = null;
  }

  function nightText(n) { return G.nights[n] || ''; }

  function setPhase(nt, phase) { nt.phase = phase; nt.t = 0; }

  function finishTyping(state) {
    const nt = state.night;
    nt.chars = nightText(nt.n).length;
    if (nt.record) G.notebook.record(state, { day: nt.n, type: 'noise', text: nightText(nt.n) });
    setPhase(nt, 'hold');
  }

  // 밤 → 아침으로 넘기기 (컷신에서도 사용)
  function toMorning(state) {
    if (state.night) setPhase(state.night, 'fadeOut');
  }

  function updateNight(state, input, dt) {
    const nt = state.night;
    if (!nt) return;
    nt.t += dt;
    nt.shake = Math.max(0, nt.shake - dt);
    const text = nightText(nt.n);

    switch (nt.phase) {
      case 'fadeIn':
        if (nt.t >= C.NIGHT_FADE_MS) setPhase(nt, 'typing');
        break;

      case 'typing':
        if (input && input.consumePressed('action')) { finishTyping(state); break; }  // 건너뛰기
        nt.charT += dt;
        while (nt.charT >= C.NIGHT_CHAR_MS && nt.chars < text.length) {
          nt.charT -= C.NIGHT_CHAR_MS;
          nt.chars++;
          if (text[nt.chars - 1] === '쿵') {          // "쿵"마다 흔들림 + 💢 + 부들부들
            nt.shake = C.SHAKE_MS;
            G.emotes.show(state, 'player', 'anger', 700, 'tremble');
          }
        }
        if (nt.chars >= text.length) finishTyping(state);
        break;

      case 'hold':
        if (nt.scripted) break;                       // 인트로: 컷신이 다음을 정함
        if ((input && input.consumePressed('action')) || nt.t >= C.NIGHT_HOLD_MS) {
          G.emotes.show(state, 'player', 'anger2', C.NIGHT_TOSS_MS, 'tremble');
          setPhase(nt, 'toss');
        }
        break;

      case 'toss':
        if (nt.t >= C.NIGHT_TOSS_MS) setPhase(nt, 'fadeOut');
        break;

      case 'fadeOut':
        if (nt.t >= C.NIGHT_FADE_MS) {
          startDay(state, nt.dayAfter);
          setPhase(nt, 'dawn');
        }
        break;

      case 'dawn':                                     // 아침으로 밝아짐 (화면만)
        if (nt.t >= C.NIGHT_FADE_MS) {
          const scripted = nt.scripted;
          state.night = null;
          if (!scripted) state.scene = 'explore';
        }
        break;
    }
  }

  // ---------- 아침 ----------
  function startDay(state, n) {
    const B = G.building;
    const home = B.houses[B.playerHome];
    state.day = n;
    state.talkedToday = {};
    state.knocksToday = {};
    state.notebook.day = n;
    state.flags.wentOut = false;
    Object.assign(state.player, {
      floor: home.floor, area: 'home', facing: 'right', walking: false, inElevator: false, tween: null,
      x: G.world.housePoint(B.playerHome, B.playerStartRatio),
    });
    Object.assign(state.elevator, {
      floor: B.elevatorStartFloor, pos: B.elevatorStartFloor, phase: 'idle', t: 0, from: null, to: null, selection: null,
    });
    state.bedArmed = !G.world.atBed(state);
    G.npcs.resetAll(state);
    state.emotes = [];
  }

  // ---------- 처음부터 (엔딩 뒤) ----------
  function restart(state) {
    const fresh = G.createState();
    Object.keys(state).forEach(function (k) { delete state[k]; });
    Object.assign(state, fresh);
  }

  // 화면용: 지금 보여줄 소음 텍스트
  function visibleNightText(state) {
    const nt = state.night;
    return nt ? nightText(nt.n).slice(0, nt.chars) : '';
  }

  G.dayflow = {
    checkBed: checkBed, openBedMenu: openBedMenu, bedOptions: bedOptions, updateEndDay: updateEndDay,
    startNight: startNight, updateNight: updateNight, toMorning: toMorning, finishTyping: finishTyping,
    startDay: startDay, restart: restart,
    nightText: nightText, visibleNightText: visibleNightText,
  };
})(window.Game = window.Game || {});
