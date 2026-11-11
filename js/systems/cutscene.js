// cutscene.js — 컷신 실행기: data/intro.js, data/endings.js 대본을 한 단계씩 실행한다
// 컷신 중에는 플레이어 조작, 노크, 엘리베이터, 수첩이 모두 막힌다.
// Esc: 인트로만 건너뛸 수 있다 (Night 1 소음 기록은 남기고 Day 1 아침으로). 엔딩은 건너뛸 수 없다.
(function (G) {
  'use strict';

  const C = G.config;
  const U = G.util;

  function start(state, script) {
    state.scene = 'cutscene';
    state.cutscene = {
      script: script, i: -1, step: null, t: 0, sub: null, card: null, note: false,
      skippable: script === G.intro,
    };
    next(state);
  }

  function next(state) {
    const cs = state.cutscene;
    cs.i++;
    cs.t = 0;
    cs.sub = null;
    state.dialog = null;
    if (cs.i >= cs.script.length) { end(state); return; }
    const step = cs.step = cs.script[cs.i];

    switch (step.type) {
      case 'night':
        G.dayflow.startNight(state, step.n, {
          scripted: true, record: step.record,
          dayAfter: typeof step.n === 'number' ? step.n : state.day,
        });
        break;
      case 'say':
        if (state.night) state.night.hideText = true;
        state.dialog = {
          speaker: step.who === 'me' ? '나' : step.who === 'narration' ? null : G.residents[step.who].name,
          narration: step.who === 'narration',
          lines: step.lines, index: 0,
        };
        if (step.emote) G.emotes.show(state, step.emote.target, step.emote.type, step.emote.ms, step.emote.gesture);
        break;
      case 'morning':
        G.dayflow.toMorning(state);
        break;
      case 'note':
        cs.note = true;                                 // 바닥에 쪽지가 보임
        cs.sub = 'walk';
        state.player.tween = { fromX: state.player.x, toX: noteX() + 26, t: 0, ms: 900 };
        state.player.facing = 'left';
        break;
      case 'goal':
        cs.card = { type: 'goal', title: step.title, rules: step.rules };
        break;
      case 'goto':
        gotoHouse(state, step.houseId);
        break;
      case 'ending':
        cs.card = { type: 'ending', good: step.good, title: step.title, body: step.body };
        break;
    }
  }

  // 엔딩: 플레이어를 그 집 경계 앞으로, 이웃을 플레이어 앞으로
  function gotoHouse(state, id) {
    const h = G.building.houses[id];
    const p = state.player;
    Object.assign(p, {
      floor: h.floor, area: 'hallway', x: G.world.knockSpot(id), inElevator: false, tween: null, walking: false,
      facing: h.slot === 'left' ? 'left' : 'right',
    });
    const n = state.npcs[id];
    n.x = n.targetX = G.world.meetSpot(id);
    n.walking = false;
    n.facing = h.slot === 'left' ? 'right' : 'left';
    state.visit = null;
  }

  // 쪽지가 놓인 자리: 내 집 안, 복도 쪽 경계 근처
  function noteX() {
    const id = G.building.playerHome;
    return G.building.houses[id].slot === 'left' ? G.world.boundaryX(id) - 40 : G.world.boundaryX(id) + 40;
  }

  function update(state, input, dt) {
    const cs = state.cutscene;
    if (!cs) return;
    if (cs.skippable && input && input.consumePressed('close')) { skip(state); return; }
    cs.t += dt;
    const step = cs.step;
    const space = function () { return input && input.consumePressed('action'); };

    switch (step.type) {
      case 'title':
        if (space()) next(state);
        break;

      case 'night':
        G.dayflow.updateNight(state, input, dt);       // Space로 타이핑 건너뛰기 가능
        if (state.night.phase === 'hold' && (space() || state.night.t >= C.NIGHT_HOLD_MS)) next(state);
        break;

      case 'say':
        if (state.night) G.dayflow.updateNight(state, null, dt);
        if (space()) {
          state.dialog.index++;
          if (state.dialog.index >= state.dialog.lines.length) next(state);
        }
        break;

      case 'morning':
        G.dayflow.updateNight(state, null, dt);
        if (!state.night) next(state);
        break;

      case 'note': {
        const p = state.player;
        if (cs.sub === 'walk') {
          p.walking = true;
          if (U.stepTween(p, p.tween, dt)) {
            p.tween = null;
            p.walking = false;
            cs.sub = 'read';
            cs.card = { type: 'note', from: step.from, lines: step.lines };
          }
        } else if (cs.sub === 'read' && space()) {
          cs.card = null;
          cs.note = false;                              // 쪽지를 집어 듦
          next(state);
        }
        break;
      }

      case 'goal':
      case 'ending':
        if (space()) { cs.card = null; next(state); }
        break;

      case 'goto':
        if (cs.t >= 500) next(state);                   // 잠깐 마주 본 뒤 대사로
        break;

      case 'restart':
        G.dayflow.restart(state);                       // 타이틀로
        break;
    }
  }

  function end(state) {
    state.cutscene = null;
    state.dialog = null;
    state.scene = 'explore';
    state.player.walking = false;
    state.bedArmed = !G.world.atBed(state);
  }

  // Esc: 인트로 건너뛰기
  function skip(state) {
    G.notebook.record(state, { day: 1, type: 'noise', text: G.dayflow.nightText(1) });
    state.night = null;
    state.toast = null;
    G.dayflow.startDay(state, 1);
    end(state);
  }

  // 화면용
  function isTitle(state) { return !!state.cutscene && !!state.cutscene.step && state.cutscene.step.type === 'title'; }

  G.cutscene = { start: start, update: update, skip: skip, noteX: noteX, isTitle: isTitle };
})(window.Game = window.Game || {});
