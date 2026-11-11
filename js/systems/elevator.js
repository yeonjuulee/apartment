// elevator.js — 엘리베이터
//
// 호출:  (승강기가 다른 층이면) summon → opening → boarding → select
// 이동:  select → closing → moving → arriving → exiting → closingAfter → idle
// 취소:  select에서 A/D → exiting (같은 층에서 내림)
//
// 승강기는 장면과 상관없이 매 프레임 진행된다. 입력은 select 단계에서만 읽는다.
(function (G) {
  'use strict';

  const C = G.config;
  const U = G.util;

  function setPhase(e, phase) { e.phase = phase; e.t = 0; }

  // 복도에서 Space로 호출. 성공하면 true.
  function call(state) {
    const e = state.elevator;
    const p = state.player;

    if (e.phase === 'closingAfter' && e.floor === p.floor) {
      // 닫히는 중이면 다시 연다 (닫힌 만큼부터)
      const k = U.progress(e.t, C.ELEV_DOOR_MS);
      e.phase = 'opening';
      e.t = (1 - k) * C.ELEV_DOOR_MS;
    } else if (e.phase !== 'idle') {
      return false;
    } else if (e.floor === p.floor) {
      setPhase(e, 'opening');
    } else {
      e.from = e.floor; e.to = p.floor;
      setPhase(e, 'summon');
    }
    state.scene = 'elevator';
    p.walking = false;
    return true;
  }

  // 현재 층을 건너뛰고 다음 선택지
  function nextSelection(cur, dir, here) {
    let s = cur + dir;
    if (s === here) s += dir;
    if (s < 1 || s > G.building.floors) return cur;
    return s;
  }

  function defaultSelection(here) {
    return here < G.building.floors ? here + 1 : here - 1;
  }

  function travelMs(e) { return Math.abs(e.to - e.from) * C.ELEV_FLOOR_MS; }

  function update(state, input, dt) {
    const e = state.elevator;
    const p = state.player;
    if (e.phase === 'idle') return;
    e.t += dt;

    switch (e.phase) {
      case 'summon':
      case 'moving': {
        const ms = travelMs(e);
        e.pos = e.from + (e.to - e.from) * U.ease(e.t / ms);
        if (e.t >= ms) {
          e.floor = e.to; e.pos = e.to;
          if (e.phase === 'moving') p.floor = e.to;
          setPhase(e, e.phase === 'moving' ? 'arriving' : 'opening');
        }
        break;
      }

      case 'opening':
        if (e.t >= C.ELEV_DOOR_MS) {
          p.inElevator = true;
          p.tween = { fromX: p.x, toX: G.world.elevatorX(), t: 0, ms: C.ELEV_BOARD_MS };
          setPhase(e, 'boarding');
        }
        break;

      case 'boarding':
        p.walking = true;
        if (U.stepTween(p, p.tween, dt)) {
          p.tween = null;
          p.walking = false;
          e.selection = defaultSelection(p.floor);
          setPhase(e, 'select');
        }
        break;

      case 'select':
        if (!input) break;
        if (input.consumePressed('up')) e.selection = nextSelection(e.selection, 1, p.floor);
        if (input.consumePressed('down')) e.selection = nextSelection(e.selection, -1, p.floor);
        if (input.consumePressed('left') || input.consumePressed('right')) {
          setPhase(e, 'exiting');        // 취소: 같은 층에서 내림
        } else if (input.consumePressed('action')) {
          setPhase(e, 'closing');
        }
        break;

      case 'closing':
        if (e.t >= C.ELEV_DOOR_MS) {
          e.from = e.floor; e.to = e.selection;
          setPhase(e, 'moving');
        }
        break;

      case 'arriving':
        if (e.t >= C.ELEV_DOOR_MS) setPhase(e, 'exiting');
        break;

      case 'exiting':
        if (e.t >= C.ELEV_BOARD_MS) {
          p.inElevator = false;
          e.selection = null;
          state.scene = 'explore';
          setPhase(e, 'closingAfter');
        }
        break;

      case 'closingAfter':
        if (e.t >= C.ELEV_DOOR_MS) setPhase(e, 'idle');
        break;
    }
  }

  // 층 f의 엘리베이터 문이 얼마나 열렸는지 (0~1)
  function doorOpen(state, f) {
    const e = state.elevator;
    if (f !== e.floor) return 0;
    const k = U.progress(e.t, C.ELEV_DOOR_MS);
    switch (e.phase) {
      case 'opening': case 'arriving': return k;
      case 'boarding': case 'select': case 'exiting': return 1;
      case 'closing': case 'closingAfter': return 1 - k;
      default: return 0;
    }
  }

  G.elevator = { call: call, update: update, doorOpen: doorOpen, nextSelection: nextSelection };
})(window.Game = window.Game || {});
