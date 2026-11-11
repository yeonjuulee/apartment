// tests.js — 자동 테스트 (브라우저 test.html, Node run-node.js 양쪽에서 실행)
(function (G) {
  'use strict';

  const C = G.config;
  const W = G.world;

  // ---------- 시뮬레이션 도우미 ----------
  function fakeInput(held, press, click) {
    const pressed = new Set(press || []);
    let c = click || null;
    return {
      getHorizontal: function () { return held || null; },
      consumePressed: function (a) { if (pressed.has(a)) { pressed.delete(a); return true; } return false; },
      consumeClick: function () { const r = c; c = null; return r; },
      endFrame: function () { pressed.clear(); },
    };
  }
  function step(s, held, press, ms) { G.update(s, fakeInput(held, press), ms || 16); }
  function run(s, held, ms) { for (let t = 0; t < ms; t += 16) step(s, held); }
  function press(s, action) { step(s, null, [action]); }
  function click(s, x, y) { G.update(s, fakeInput(null, null, { x: x, y: y }), 16); }
  function waitUntil(s, cond, maxMs) {
    for (let t = 0; t < (maxMs || 15000); t += 16) { if (cond()) return true; step(s); }
    return cond();
  }

  function newState() { return G.createState({ intro: false }); }   // Day 1 아침부터
  function inHallway(s, floor, x) {
    Object.assign(s.player, { floor: floor, area: 'hallway', x: x, tween: null, inElevator: false });
  }
  function atDoorOf(s, id) {
    const h = G.building.houses[id];
    const bx = W.boundaryX(id);
    inHallway(s, h.floor, h.slot === 'left' ? bx + C.KNOCK_REACH - 4 : bx - C.KNOCK_REACH + 4);
  }
  function atElevator(s, floor) { inHallway(s, floor, W.elevatorX()); }

  // 노크 한 번을 끝까지 진행 (대화가 뜨면 끝까지 Space)
  function knockAndFinish(s, id) {
    atDoorOf(s, id);
    press(s, 'action');
    waitUntil(s, function () { return s.dialog || !s.visit; });
    while (s.dialog) press(s, 'action');
    waitUntil(s, function () { return !s.visit; });
  }

  // 침대 앞으로 걸어가 "잠자리에 들까?" 선택 띄우기
  function goToBed(s) {
    for (let t = 0; t < 4000 && s.scene === 'explore'; t += 16) step(s, 'left');
  }

  // 침대 메뉴에서 항목 고르기: 'sleep' | 'accuse' | 'notYet'
  function chooseBed(s, opt) {
    const i = s.endDay.options.indexOf(opt);
    if (i === -1) throw new Error('메뉴에 없음: ' + opt);
    s.endDay.index = i;
    press(s, 'action');
  }

  // 지목: 침대에서 그 집을 골라 확정 → 엔딩 컷신 시작
  function accuseHouse(s, id) {
    if (s.scene !== 'endDay') goToBed(s);
    chooseBed(s, 'accuse');
    while (G.accuse.selected(s) !== id) press(s, 'right');
    press(s, 'action');                       // 확인 창
    press(s, 'left');                         // "다시 생각한다" → "지목한다"
    press(s, 'action');
  }

  // 엔딩 컷신을 끝까지 (타이틀로 돌아올 때까지)
  function playEnding(s) {
    let sawCard = null;
    for (let i = 0; i < 6000 && !G.cutscene.isTitle(s); i++) {
      if (s.cutscene && s.cutscene.card && s.cutscene.card.type === 'ending') sawCard = s.cutscene.card;
      step(s, null, i % 6 === 0 ? ['action'] : null);
    }
    return sawCard;
  }

  // 인트로를 처음부터 끝까지 Space로 진행
  function playIntro(s) {
    for (let i = 0; i < 4000 && s.scene === 'cutscene'; i++) step(s, null, i % 6 === 0 ? ['action'] : null);
  }

  // 밤을 끝까지 넘겨 다음 날 아침으로
  function sleepThroughNight(s) {
    waitUntil(s, function () { return s.night && s.night.phase === 'typing'; });
    press(s, 'action');                       // 텍스트 건너뛰기
    press(s, 'action');                       // hold 넘기기
    waitUntil(s, function () { return s.scene === 'explore'; });
  }

  const tests = [];
  function test(name, fn) { tests.push({ name: name, fn: fn }); }
  function assert(cond, msg) { if (!cond) throw new Error(msg); }

  // ================= 건물 / 데이터 =================
  test('구조가 [집][복도][집] 순서이고 집이 6개다', function () {
    const types = W.segments().map(function (x) { return x.type; }).join(',');
    assert(types === 'house,hallway,house', types);
    assert(Object.keys(G.building.houses).length === 6, '집 수');
  });

  test('이웃 5명 모두 실루엣·아이템·Day 1 증언(여러 줄 + 수첩 요약)·기본/거절 대사가 있다', function () {
    Object.keys(G.residents).forEach(function (id) {
      const r = G.residents[id];
      assert(r.item && G.silhouettes.ITEMS[r.item.shape], id + ' 아이템');
      if (id === G.building.playerHome) return;
      assert(G.silhouettes.FIGURES[r.figure], id + ' 인물');
      const t = r.testimony[1];
      assert(t && t.lines.length >= 2 && t.note, id + ' Day1 증언');
      assert(r.idle && r.refuse, id + ' 기본/거절 대사');
    });
  });

  test('이웃 5명 모두 Day 1~5 증언이 있고, 오해 반응(302 제외)도 있다', function () {
    Object.keys(G.residents).forEach(function (id) {
      if (id === G.building.playerHome) return;
      const r = G.residents[id];
      for (let d = 1; d <= 5; d++) assert(r.testimony[d] && r.testimony[d].lines.length && r.testimony[d].note, id + ' Day ' + d);
      if (id !== G.culprit) assert(r.accused && r.accused.length, id + ' accused');
    });
  });

  test('추리 단서: 302호의 거짓말을 뒤집는 증언이 있다', function () {
    const R = G.residents;
    assert(/새벽/.test(R['302'].testimony[2].note), '302 Day2: 늘 새벽 귀가 주장');
    assert(/11시/.test(R['102'].testimony[3].note) && /302/.test(R['102'].testimony[3].note), '102 Day3: 밤 11시 302 목격');
    assert(/없다/.test(R['302'].testimony[4].note), '302 Day4: 러닝머신 없다고 함');
    assert(/러닝머신/.test(R['202'].testimony[4].note) && /302/.test(R['202'].testimony[4].note), '202 Day4: 러닝머신 박스 송장');
    assert(/대각선/.test(R['101'].testimony[3].note), '101 Day3: 대각선 전달');
  });

  test('밤 소음 텍스트가 Night 1~5 모두 있고 "쿵"이 들어 있다', function () {
    for (let n = 1; n <= 5; n++) assert(G.nights[n] && G.nights[n].indexOf('쿵') !== -1, 'Night ' + n);
  });

  // ================= 인트로 =================
  test('게임은 타이틀로 시작하고, Space로 인트로의 첫날 밤이 시작된다', function () {
    const s = G.createState();
    assert(s.scene === 'cutscene' && G.cutscene.isTitle(s), '타이틀 아님');
    run(s, null, 2000);
    assert(G.cutscene.isTitle(s), '타이틀이 저절로 넘어감');
    press(s, 'action');
    assert(s.cutscene.step.type === 'night' && s.night && s.night.n === 1 && s.night.scripted, '밤 시작 안 됨');
  });

  test('인트로 순서: 밤 소음 → 독백 3개 → 아침 → 쪽지 → 반응 → 목표 카드 → Day 1', function () {
    const s = G.createState();
    press(s, 'action');                                         // 타이틀
    waitUntil(s, function () { return s.night.phase === 'hold'; });
    assert(s.log.some(function (e) { return e.type === 'noise' && e.day === 1; }), 'Night 1 기록 없음');
    press(s, 'action');
    assert(s.dialog && s.dialog.narration && s.dialog.lines[0] === G.intro[2].lines[0], '내레이션');
    assert(s.night && s.night.hideText, '밤 텍스트가 안 가려짐');
    press(s, 'action');
    assert(s.dialog.speaker === '나' && s.dialog.lines[0] === '잠도 못 자고…', '독백 1');
    press(s, 'action');
    assert(s.dialog.lines[0] === '아 진짜… 누구야!', '독백 2');
    const e = G.emotes.of(s, 'player');
    assert(e && e.type === 'anger2' && e.gesture === 'tremble', '부들부들 💢💢 없음');
    press(s, 'action');
    assert(s.cutscene.step.type === 'morning', '아침 아님');
    waitUntil(s, function () { return s.cutscene.step.type === 'note' && s.cutscene.card; });
    assert(s.day === 1 && !s.night, '아침이 안 됨');
    assert(Math.abs(s.player.x - (G.cutscene.noteX() + 26)) < 0.01, '쪽지 앞으로 안 감');
    assert(s.cutscene.card.type === 'note' && s.cutscene.card.from === '101', '쪽지 카드');
    press(s, 'action');
    assert(!s.cutscene.note && s.dialog.lines[0] === '…뭐? 나 아닌데?!', '반응');
    assert(G.emotes.of(s, 'player').gesture === 'jump', '깜짝 뜀 없음');
    press(s, 'action');
    press(s, 'action'); press(s, 'action');
    assert(s.cutscene.card && s.cutscene.card.type === 'goal', '목표 카드');
    press(s, 'action');
    assert(s.scene === 'explore' && s.day === 1 && !s.cutscene && !s.dialog, 'Day 1 시작 안 됨');
  });

  test('인트로 중에는 이동·수첩·노크가 안 된다', function () {
    const s = G.createState();
    press(s, 'action');
    const x0 = s.player.x;
    run(s, 'right', 500);
    press(s, 'notebook');
    assert(s.player.x === x0 && s.scene === 'cutscene', '조작됨');
  });

  test('Esc로 언제든 인트로를 건너뛰면 Night 1 기록을 남기고 Day 1 아침이 된다', function () {
    let s = G.createState();
    press(s, 'close');                                          // 타이틀에서
    assert(s.scene === 'explore' && s.day === 1 && !s.night, '타이틀 건너뛰기');
    assert(s.log.filter(function (e) { return e.type === 'noise'; }).length === 1, '기록');
    s = G.createState();
    press(s, 'action');
    waitUntil(s, function () { return s.night.phase === 'hold'; });
    press(s, 'close');                                          // 밤 소음 뒤에서
    assert(s.scene === 'explore' && s.log.filter(function (e) { return e.type === 'noise'; }).length === 1, '중복 기록');
    assert(s.player.area === 'home' && s.player.floor === 2, '위치');
  });

  test('아침에는 2층 201호 안에서 시작하고 승강기도 2층에 있다', function () {
    const s = newState();
    assert(s.player.floor === 2 && s.player.area === 'home', JSON.stringify(s.player));
    assert(s.elevator.floor === 2 && s.elevator.phase === 'idle', JSON.stringify(s.elevator));
  });

  // ================= 이동 제한 =================
  test('내 집과 복도는 걸어서 오갈 수 있다', function () {
    const s = newState();
    run(s, 'right', 1200);
    assert(s.player.area === 'hallway', '복도로 못 나감');
  });

  test('내 집 왼쪽 외벽 / 2층 오른쪽 202호 경계를 통과할 수 없다', function () {
    const s = newState();
    goToBed(s);                                   // 가는 길에 침대가 있으므로 "아직 아니야"로 닫고 계속
    chooseBed(s, 'notYet');
    run(s, 'left', 4000);
    assert(s.player.x === W.walkBounds(2).min, '왼쪽 x=' + s.player.x);
    inHallway(s, 2, W.elevatorX());
    run(s, 'right', 6000);
    assert(s.player.x === W.walkBounds(2).max && s.player.x < W.boundaryX('202'), '오른쪽 x=' + s.player.x);
  });

  test('다른 층에서는 양쪽 집 모두 들어갈 수 없다', function () {
    const s = newState();
    inHallway(s, 1, W.elevatorX());
    run(s, 'left', 5000);
    assert(s.player.x > W.boundaryX('101'), '101 진입');
    run(s, 'right', 5000);
    assert(s.player.x < W.boundaryX('102'), '102 진입');
  });

  test('내 집 쪽 경계나 빈 복도에서는 노크·엘리베이터 안내가 없다', function () {
    const s = newState();
    inHallway(s, 2, W.boundaryX('201') + 10);
    assert(!W.interactionAt(s), '201 쪽 안내');
    inHallway(s, 1, W.elevatorX() - C.ELEV_REACH - 10);
    press(s, 'action');
    assert(s.scene === 'explore', '빈 곳 반응');
  });

  // ================= 노크 + 증언 =================
  test('노크: 경계로 다가가 두드림 → 이웃이 다가옴 → Day 1 증언이 한 줄씩', function () {
    const s = newState();
    atDoorOf(s, '202');
    press(s, 'action');
    waitUntil(s, function () { return s.visit.phase === 'knock'; });
    assert(s.player.x === W.knockSpot('202') && G.visit.knocking(s) !== null, '두드리기');
    waitUntil(s, function () { return s.visit.phase === 'talk'; });
    assert(s.npcs['202'].x === W.meetSpot('202'), '이웃 위치');
    const lines = G.residents['202'].testimony[1].lines;
    for (let i = 0; i < lines.length; i++) {
      assert(s.dialog && s.dialog.lines[s.dialog.index] === lines[i], (i + 1) + '번째 줄');
      assert(s.log.filter(function (e) { return e.type === 'testimony'; }).length === 0, '끝나기 전에 기록됨');
      press(s, 'action');
    }
    assert(!s.dialog && s.scene === 'explore', '대화가 안 끝남');
  });

  test('첫 방문 대화에는 감정 이펙트가 없다', function () {
    const s = newState();
    atDoorOf(s, '301');
    press(s, 'action');
    let any = false;
    waitUntil(s, function () { if (s.emotes.length) any = true; return s.dialog; });
    while (s.dialog) { if (s.emotes.length) any = true; press(s, 'action'); }
    assert(!any, '이펙트가 떴음');
  });

  test('증언을 끝까지 들으면 수첩에 요약이 기록되고 토스트·새 기록 점이 뜬다', function () {
    const s = newState();
    knockAndFinish(s, '302');
    const e = s.log.find(function (x) { return x.type === 'testimony'; });
    assert(e && e.houseId === '302' && e.day === 1 && e.text === G.residents['302'].testimony[1].note, JSON.stringify(e));
    assert(s.toast && s.notebook.unread, '토스트/점');
    assert(s.talkedToday['302'], 'talkedToday');
    run(s, null, C.TOAST_MS + 50);
    assert(!s.toast, '토스트가 안 사라짐');
  });

  test('두 번째 노크: 이웃은 나오지 않고 집 안에서 대답 + 이웃 💢 발 구르기, 플레이어 💧 축 처짐, 기록 없음', function () {
    const s = newState();
    knockAndFinish(s, '101');
    waitUntil(s, function () { return !s.npcs['101'].walking; });
    atDoorOf(s, '101');
    press(s, 'action');
    let moved = false;
    waitUntil(s, function () {
      if (s.npcs['101'].x !== s.npcs['101'].homeX) moved = true;
      return s.visit && s.visit.phase === 'refuseTalk';
    });
    assert(!moved, '이웃이 나옴');
    assert(s.dialog.speaker.indexOf('(집 안에서)') !== -1 && s.dialog.lines[0] === G.residents['101'].refuse, '거절 대사');
    assert(G.emotes.of(s, '101').type === 'anger' && G.emotes.of(s, 'player').type === 'sweat', '이펙트');
    assert(G.emotes.of(s, '101').gesture === 'stomp' && G.emotes.of(s, 'player').gesture === 'slump', '몸짓');
    press(s, 'action');
    assert(s.log.filter(function (e) { return e.type === 'testimony'; }).length === 1, '기록이 늘어남');
  });

  test('세 번째 노크: 대답 없음 + 이웃이 등을 돌리고 💢💢 부들부들, 플레이어 💧', function () {
    const s = newState();
    knockAndFinish(s, '301');
    knockAndFinish(s, '301');
    waitUntil(s, function () { return !s.npcs['301'].walking; });
    atDoorOf(s, '301');
    press(s, 'action');
    waitUntil(s, function () { return s.visit.phase === 'silence'; });
    assert(s.npcs['301'].facing === 'left', '등을 안 돌림: ' + s.npcs['301'].facing);   // 301은 왼쪽 집 → 복도 반대쪽
    assert(G.emotes.of(s, '301').type === 'anger2' && G.emotes.of(s, 'player').type === 'sweat', '이펙트');
    assert(G.emotes.of(s, '301').gesture === 'tremble', '부들부들 없음');
    assert(!s.dialog, '대답이 있음');
    waitUntil(s, function () { return !s.visit; });
    assert(s.npcs['301'].facing === null, '방향 복구 안 됨');
  });

  test('감정 이펙트는 시간이 지나면 사라지고, 같은 대상에 겹치면 새 것으로 바뀐다', function () {
    const s = newState();
    G.emotes.show(s, 'player', 'anger', 300);
    G.emotes.show(s, 'player', 'sweat', 300);
    assert(s.emotes.length === 1 && s.emotes[0].type === 'sweat', '겹침');
    run(s, null, 400);
    assert(s.emotes.length === 0, '안 사라짐');
  });

  // ================= 엘리베이터 =================
  test('엘리베이터: 다른 층의 승강기 호출 → 탑승 → 선택 → 이동 → 하차', function () {
    const s = newState();
    s.elevator.floor = 1; s.elevator.pos = 1;
    atElevator(s, 3);
    press(s, 'action');
    assert(s.elevator.phase === 'summon', s.elevator.phase);
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    press(s, 'down');                 // 기본 2층 → 1층
    press(s, 'action');
    waitUntil(s, function () { return s.scene === 'explore'; });
    assert(s.player.floor === 1 && !s.player.inElevator, JSON.stringify(s.player));
  });

  test('엘리베이터: 현재 층은 선택 불가, A/D로 취소, 이동 중 입력 무시', function () {
    const N = G.elevator.nextSelection;
    assert(N(3, -1, 2) === 1 && N(1, 1, 2) === 3 && N(3, 1, 2) === 3, '선택 규칙');
    const s = newState();
    atElevator(s, 2);
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    press(s, 'left');
    waitUntil(s, function () { return s.scene === 'explore'; });
    assert(s.player.floor === 2, '취소 실패');
    waitUntil(s, function () { return s.elevator.phase === 'idle'; });
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'moving'; });
    const x0 = s.player.x;
    step(s, 'left', ['action', 'up', 'notebook']);
    assert(s.player.x === x0 && s.elevator.to === 3 && s.scene === 'elevator', '입력이 먹힘');
  });

  // ================= 수첩 =================
  test('Tab으로 수첩을 열고 닫으며, 열려 있는 동안 게임이 멈춘다', function () {
    const s = newState();
    s.notebook.unread = true;
    press(s, 'notebook');
    assert(s.scene === 'notebook' && !s.notebook.unread, '열기');
    const x0 = s.player.x;
    run(s, 'right', 500);
    assert(s.player.x === x0, '멈추지 않음');
    press(s, 'notebook');
    assert(s.scene === 'explore', '닫기');
  });

  test('상단 수첩 아이콘을 클릭해도 열고 닫힌다', function () {
    const s = newState();
    const I = C.NOTEBOOK_ICON;
    click(s, I.x, I.y);
    assert(s.scene === 'notebook', '클릭 열기');
    click(s, I.x, I.y);
    assert(s.scene === 'explore', '클릭 닫기');
    click(s, I.x + 200, I.y);
    assert(s.scene === 'explore', '빈 곳 클릭에 열림');
  });

  test('노크·엘리베이터·밤 중에는 수첩이 열리지 않는다', function () {
    const s = newState();
    atDoorOf(s, '202');
    press(s, 'action');
    press(s, 'notebook');
    assert(s.scene === 'visit', '방문 중 열림');
    const n = newState();
    G.dayflow.startNight(n, 2);
    press(n, 'notebook');
    assert(n.scene === 'night', '밤에 열림');
  });

  test('수첩 날짜별: 그날 기록만 보이고, 소음이 먼저, 아직 오지 않은 Day로는 못 간다', function () {
    const s = G.createState();
    press(s, 'close');                                          // 인트로 건너뛰기 (Night 1 기록은 남음)
    knockAndFinish(s, '202');
    const list = G.notebook.entriesForDay(s, 1);
    assert(list.length === 2 && list[0].type === 'noise' && list[1].houseId === '202', JSON.stringify(list));
    press(s, 'notebook');
    press(s, 'right');
    assert(s.notebook.day === 1, '미래 Day로 이동함');
  });

  test('수첩 이웃별: Q/E로 전환, 201(나)은 건너뛰고, Space로 용의자 제외 표시', function () {
    const s = newState();
    press(s, 'notebook');
    press(s, 'tabNext');
    assert(s.notebook.mode === 'neighbor', '전환');
    assert(s.notebook.cell === '301', '시작 칸');
    press(s, 'down');
    assert(s.notebook.cell === '101', '201 건너뛰기: ' + s.notebook.cell);
    press(s, 'right');
    assert(s.notebook.cell === '102', s.notebook.cell);
    press(s, 'action');
    assert(s.notebook.excluded['102'] === true, '제외');
    press(s, 'action');
    assert(!s.notebook.excluded['102'], '제외 취소');
    press(s, 'tabPrev');
    assert(s.notebook.mode === 'daily', '되돌리기');
  });

  test('같은 기록은 두 번 들어가지 않는다', function () {
    const s = newState();
    const e = { day: 1, type: 'testimony', houseId: '202', text: 'x' };
    assert(G.notebook.record(s, Object.assign({}, e)) && !G.notebook.record(s, Object.assign({}, e)), '중복');
  });

  // ================= 하루 마치기 + 밤 =================
  test('아침 시작 위치에서는 선택이 뜨지 않고, 침대 앞으로 걸어가면 뜬다', function () {
    const s = newState();
    run(s, null, 500);
    assert(s.scene === 'explore', '저절로 뜸');
    goToBed(s);
    assert(s.scene === 'endDay' && W.atBed(s) && s.endDay.index === 0, s.scene);
  });

  test('복도에 나갔다 집에 들어오기만 해서는 뜨지 않는다 (침대까지 가야)', function () {
    const s = newState();
    run(s, 'right', 1200);
    run(s, 'left', 800);
    assert(s.player.area === 'home' && !W.atBed(s), '위치: ' + s.player.area + ' x=' + s.player.x);
    assert(s.scene === 'explore', s.scene);
  });

  test('이웃을 한 명도 안 만나도 침대로 가면 하루를 마칠 수 있다', function () {
    const s = newState();
    goToBed(s);
    press(s, 'action');
    assert(s.scene === 'night' && s.night.n === 2, s.scene);
  });

  test('"아직 아니야" → 닫히고, 침대 앞에 머물면 다시 안 뜨고, 벗어났다 돌아오면 또 뜬다', function () {
    const s = newState();
    goToBed(s);
    chooseBed(s, 'notYet');
    assert(s.scene === 'explore', '안 닫힘');
    run(s, null, 500);
    assert(s.scene === 'explore', '머물렀는데 다시 뜸');
    run(s, 'right', 500);
    goToBed(s);
    assert(s.scene === 'endDay', '다시 안 뜸');
  });

  test('선택창에서도 Tab으로 수첩을 볼 수 있고, 닫으면 선택창으로 돌아온다', function () {
    const s = newState();
    goToBed(s);
    press(s, 'notebook');
    assert(s.scene === 'notebook', '열기');
    press(s, 'notebook');
    assert(s.scene === 'endDay', '복귀: ' + s.scene);
  });

  test('"잠자리에 든다" → 밤: 소음이 한 글자씩, "쿵"마다 흔들림 + 💢 부들부들', function () {
    const s = newState();
    goToBed(s);
    press(s, 'action');
    assert(s.scene === 'night' && s.night.n === 2, '밤 시작');
    waitUntil(s, function () { return s.night.phase === 'typing'; });
    let sawShake = false, sawAnger = false, prev = 0, grows = true;
    waitUntil(s, function () {
      if (s.night.shake > 0) sawShake = true;
      const e = G.emotes.of(s, 'player');
      if (e && e.type === 'anger' && e.gesture === 'tremble') sawAnger = true;
      if (s.night.chars < prev) grows = false;
      prev = s.night.chars;
      return s.night.phase !== 'typing';
    });
    assert(sawShake && sawAnger && grows, '흔들림 ' + sawShake + ' 💢 ' + sawAnger + ' 증가 ' + grows);
    assert(G.dayflow.visibleNightText(s) === G.nights[2], '텍스트가 다 안 나옴');
    assert(s.log.some(function (e) { return e.type === 'noise' && e.day === 2; }), '소음 기록 없음');
  });

  test('밤 텍스트는 Space로 건너뛸 수 있고, 끝나면 💢💢로 뒤척인다', function () {
    const s = newState();
    G.dayflow.startNight(s, 3);
    waitUntil(s, function () { return s.night.phase === 'typing'; });
    press(s, 'action');
    assert(s.night.phase === 'hold' && G.dayflow.visibleNightText(s) === G.nights[3], '건너뛰기');
    press(s, 'action');
    assert(s.night.phase === 'toss' && G.emotes.of(s, 'player').type === 'anger2', '뒤척임');
  });

  test('다음 날 아침: Day+1, 오늘 기록 초기화, 플레이어·승강기·이웃 제자리', function () {
    const s = newState();
    knockAndFinish(s, '202');
    knockAndFinish(s, '202');
    atElevator(s, 2);
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    press(s, 'down');
    press(s, 'action');
    waitUntil(s, function () { return s.scene === 'explore'; });   // 1층
    G.dayflow.startNight(s, 2);
    sleepThroughNight(s);
    assert(s.day === 2, 'day ' + s.day);
    assert(!Object.keys(s.talkedToday).length && !Object.keys(s.knocksToday).length, '초기화 안 됨');
    assert(s.player.floor === 2 && s.player.area === 'home', '플레이어 위치');
    assert(s.elevator.floor === 2 && s.elevator.phase === 'idle', '승강기');
    assert(Object.keys(s.npcs).every(function (id) { return s.npcs[id].x === s.npcs[id].homeX; }), '이웃 위치');
    assert(s.log.length >= 2, '수첩 기록이 지워짐');
    assert(G.visit.decideMode(s, '202') === 'normal', '다음 날에도 거절');
  });

  test('Day 2에는 Day 2 증언이 나오고 수첩에 Day 2로 기록된다', function () {
    const s = newState();
    G.dayflow.startDay(s, 2);
    knockAndFinish(s, '102');
    assert(s.log.length === 1 && s.log[0].day === 2 && s.log[0].text === G.residents['102'].testimony[2].note, JSON.stringify(s.log));
  });

  test('증언이 정의되지 않은 날에는 기본 대사가 나오고 기록되지 않는다', function () {
    const t = G.visit.testimonyFor('102', 9);
    assert(t.lines[0] === G.residents['102'].idle && t.note === null, JSON.stringify(t));
  });

  // ================= 범인 지목 + 엔딩 =================
  test('침대 메뉴: 평소엔 [잠자리 / 지목 / 아직], Day 5에는 잠자리가 없다', function () {
    const s = newState();
    goToBed(s);
    assert(s.endDay.options.join() === 'sleep,accuse,notYet', s.endDay.options.join());
    const t = newState();
    G.dayflow.startDay(t, 5);
    goToBed(t);
    assert(t.endDay.options.join() === 'accuse,notYet', t.endDay.options.join());
  });

  test('지목: 5집을 고를 수 있고, 확인 창의 기본값은 "다시 생각한다"', function () {
    const s = newState();
    goToBed(s);
    chooseBed(s, 'accuse');
    assert(s.scene === 'accuse' && G.accuse.selected(s) === '301', '시작');
    const seen = [];
    for (let i = 0; i < 5; i++) { seen.push(G.accuse.selected(s)); press(s, 'right'); }
    assert(seen.join() === '301,302,202,101,102' && G.accuse.selected(s) === '301', '순환: ' + seen.join());
    press(s, 'action');
    assert(s.accuse.confirm && s.accuse.confirmIndex === 1, '확인 창');
    press(s, 'action');                                  // 다시 생각한다
    assert(s.scene === 'accuse' && !s.accuse.confirm, '취소 안 됨');
  });

  test('지목 중 Esc → 침대 메뉴로, Tab → 수첩을 보고 돌아온다', function () {
    const s = newState();
    goToBed(s);
    chooseBed(s, 'accuse');
    press(s, 'notebook');
    assert(s.scene === 'notebook', '수첩 안 열림');
    press(s, 'notebook');
    assert(s.scene === 'accuse', '복귀: ' + s.scene);
    press(s, 'close');
    assert(s.scene === 'endDay', 'Esc: ' + s.scene);
  });

  test('302호 지목 → 대면(302 ❗ 깜짝, 💧 축 처짐) → 조용한 밤 → 해결 엔딩 → 타이틀', function () {
    const s = newState();
    G.dayflow.startDay(s, 3);
    accuseHouse(s, '302');
    assert(s.scene === 'cutscene' && !s.cutscene.skippable, '엔딩 시작');
    waitUntil(s, function () { return s.dialog; });
    assert(s.player.floor === 3 && s.player.x === W.knockSpot('302') && s.npcs['302'].x === W.meetSpot('302'), '대면 위치');
    press(s, 'action');
    assert(s.dialog.speaker === G.residents['302'].name && G.emotes.of(s, '302').type === 'surprise', '302 반응');
    press(s, 'close');
    assert(s.scene === 'cutscene', 'Esc로 엔딩이 건너뛰어짐');
    const card = playEnding(s);
    assert(card && card.good, '해결 엔딩 카드 없음');
    assert(G.cutscene.isTitle(s) && s.day === 1 && !s.log.length, '타이틀로 안 돌아감');
  });

  test('다른 집 지목 → 억울한 이웃 💢💢 부들부들 → 소음은 계속 → 오해 엔딩 → 타이틀', function () {
    ['301', '202', '101', '102'].forEach(function (id) {
      const s = newState();
      accuseHouse(s, id);
      waitUntil(s, function () { return s.dialog; });
      press(s, 'action');
      assert(s.dialog.speaker === G.residents[id].name && s.dialog.lines[0] === G.residents[id].accused[0], id + ' 반응');
      assert(G.emotes.of(s, id).type === 'anger2' && G.emotes.of(s, id).gesture === 'tremble', id + ' 이펙트');
      const card = playEnding(s);
      assert(card && !card.good && card.body[0].indexOf(id) === 0, id + ' 오해 엔딩');
      assert(G.cutscene.isTitle(s), id + ' 타이틀');
    });
  });

  test('엔딩용 밤은 수첩에 기록되지 않는다', function () {
    const s = newState();
    accuseHouse(s, '101');
    waitUntil(s, function () { return s.night && s.night.phase === 'hold'; });
    assert(!s.log.some(function (e) { return e.type === 'noise'; }), '기록됨');
  });

  // ================= 통합 =================
  test('타이틀 → 인트로 → Day 1에 5집 방문 → 침대 → Night 2 → Day 2 까지 막힘 없이 진행', function () {
    const s = G.createState();
    playIntro(s);
    assert(s.scene === 'explore' && s.day === 1, '인트로가 안 끝남');
    run(s, 'right', 1200);
    function rideTo(f) {
      atElevator(s, s.player.floor);
      press(s, 'action');
      waitUntil(s, function () { return s.elevator.phase === 'select'; });
      while (s.elevator.selection !== f) press(s, s.elevator.selection < f ? 'up' : 'down');
      press(s, 'action');
      waitUntil(s, function () { return s.scene === 'explore'; });
      assert(s.player.floor === f, f + '층 도착 실패');
    }
    rideTo(1); knockAndFinish(s, '101'); knockAndFinish(s, '102');
    rideTo(3); knockAndFinish(s, '301'); knockAndFinish(s, '302');
    rideTo(2); knockAndFinish(s, '202');
    assert(Object.keys(s.talkedToday).length === 5, '대화 수');
    assert(s.log.filter(function (e) { return e.type === 'testimony'; }).length === 5, '증언 기록 수');
    goToBed(s);
    assert(s.scene === 'endDay', '선택창 안 뜸');
    press(s, 'action');
    sleepThroughNight(s);
    assert(s.day === 2 && s.scene === 'explore', 'Day 2 실패');
  });

  function visitAll(s) {
    function rideTo(f) {
      if (s.player.floor === f) return;
      if (s.player.area === 'home') run(s, 'right', 1200);
      atElevator(s, s.player.floor);
      press(s, 'action');
      waitUntil(s, function () { return s.elevator.phase === 'select'; });
      while (s.elevator.selection !== f) press(s, s.elevator.selection < f ? 'up' : 'down');
      press(s, 'action');
      waitUntil(s, function () { return s.scene === 'explore'; });
    }
    if (s.player.area === 'home') run(s, 'right', 1200);
    rideTo(1); knockAndFinish(s, '101'); knockAndFinish(s, '102');
    rideTo(3); knockAndFinish(s, '301'); knockAndFinish(s, '302');
    rideTo(2); knockAndFinish(s, '202');
    run(s, 'left', 1600);
  }

  test('전체 플레이 (Day 3 해결): 인트로 → 매일 5집 방문 → Day 3에 302 지목 → 해결 엔딩', function () {
    const s = G.createState();
    playIntro(s);
    for (let d = 1; d <= 3; d++) {
      assert(s.day === d && s.scene === 'explore', 'Day ' + d + ' 시작 실패');
      visitAll(s);
      if (d < 3) { goToBed(s); chooseBed(s, 'sleep'); sleepThroughNight(s); }
    }
    assert(s.log.filter(function (e) { return e.type === 'testimony'; }).length === 15, '증언 15개');
    assert(s.log.filter(function (e) { return e.type === 'noise'; }).length === 3, '소음 3개');
    accuseHouse(s, '302');
    const card = playEnding(s);
    assert(card && card.good && card.body[0].indexOf('DAY 3') === 0, '해결 엔딩');
  });

  test('전체 플레이 (Day 5 해결): 아무도 안 만나고 Day 5까지 → 잠자리 불가 → 302 지목', function () {
    const s = G.createState();
    press(s, 'close');
    for (let d = 1; d < 5; d++) { goToBed(s); chooseBed(s, 'sleep'); sleepThroughNight(s); }
    assert(s.day === 5, 'day ' + s.day);
    goToBed(s);
    assert(s.endDay.options.indexOf('sleep') === -1, '잠자리 가능');
    accuseHouse(s, '302');
    assert(playEnding(s).good, '해결 엔딩');
  });

  // ================= 첫 행동 안내 =================
  test('안내: 이동 → (복도에서) 노크 → (기록 후) 수첩 → (외출 후 귀가) 침대, 각각 한 번씩', function () {
    const s = newState();
    step(s);
    assert(s.hints.current === 'move', '이동 안내 ' + s.hints.current);
    run(s, 'right', 1200);
    assert(s.hints.seen.move && s.hints.current === 'knock', '노크 안내 ' + s.hints.current);
    knockAndFinish(s, '202');
    step(s);
    assert(s.hints.seen.knock && s.hints.current === 'notebook', '수첩 안내 ' + s.hints.current);
    press(s, 'notebook'); press(s, 'notebook');
    run(s, 'left', 1300);
    assert(s.hints.seen.notebook && s.player.area === 'home' && s.hints.current === 'bed', '침대 안내 ' + s.hints.current);
    goToBed(s);
    chooseBed(s, 'notYet');
    step(s);
    assert(s.hints.seen.bed && s.hints.current === null, '안내가 남음 ' + s.hints.current);
  });

  test('마지막 날에는 "침대에서 지목" 안내가 뜨고, 침대 메뉴를 열면 사라진다', function () {
    const s = newState();
    s.hints.seen = { move: true, knock: true, notebook: true, bed: true };
    G.dayflow.startDay(s, 5);
    step(s);
    assert(s.hints.current === 'lastDay', s.hints.current);
    goToBed(s);
    chooseBed(s, 'notYet');
    step(s);
    assert(s.hints.current === null, s.hints.current);
  });

  // ================= 레이아웃 =================
  test('대화 영역은 게임 화면(건물) 아래에 따로 있다', function () {
    const L = G.computeLayout();
    assert(L.dialogTop >= L.buildingBottom + C.SLAB, '건물과 겹침');
    assert(L.height >= L.dialogTop + C.DIALOG_H, '캔버스 밖');
  });

  // ================= 렌더링 (브라우저 전용) =================
  function recordingCtx() {
    const c = document.createElement('canvas');
    const L = G.computeLayout();
    c.width = L.width; c.height = L.height;
    const real = c.getContext('2d');
    const used = new Set();
    const ctx = new Proxy(real, {
      get: function (t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
      set: function (t, k, v) { if (k === 'fillStyle' || k === 'strokeStyle') used.add(v); t[k] = v; return true; },
    });
    return { ctx: ctx, used: used, L: L };
  }

  function playIntroUntil(s, type) {
    for (let i = 0; i < 4000 && !(s.cutscene && s.cutscene.step.type === type); i++) step(s, null, i % 6 === 0 ? ['action'] : null);
  }

  function sampleStates() {
    const list = [];
    let s = newState(); s.debug = true; list.push(s);
    s = newState(); atDoorOf(s, '202'); press(s, 'action'); waitUntil(s, function () { return s.visit.phase === 'knock'; }); list.push(s);
    s = newState(); atDoorOf(s, '202'); press(s, 'action'); waitUntil(s, function () { return s.dialog; }); list.push(s);
    s = newState(); knockAndFinish(s, '301'); knockAndFinish(s, '301'); list.push(s);                 // 거절 + 토스트
    s = newState(); atElevator(s, 2); press(s, 'action'); waitUntil(s, function () { return s.elevator.phase === 'select'; }); list.push(s);
    s = newState(); knockAndFinish(s, '202'); press(s, 'notebook'); list.push(s);                    // 수첩 날짜별
    s = newState(); knockAndFinish(s, '202'); press(s, 'notebook'); press(s, 'tabNext'); press(s, 'action'); list.push(s);
    s = newState(); goToBed(s); list.push(s);                                                     // 선택창
    s = newState(); G.dayflow.startNight(s, 2); waitUntil(s, function () { return s.night.chars > 8; }); list.push(s); // 밤 + 💢
    s = newState(); G.dayflow.startNight(s, 2); waitUntil(s, function () { return s.night.phase === 'fadeOut'; }, 30000); run(s, null, 200); list.push(s);
    s = newState(); goToBed(s); chooseBed(s, 'accuse'); list.push(s);                                 // 지목 선택
    s = newState(); goToBed(s); chooseBed(s, 'accuse'); press(s, 'action'); list.push(s);             // 지목 확인
    s = newState(); G.dayflow.startDay(s, 5); goToBed(s); list.push(s);                                // Day 5 메뉴
    s = newState(); accuseHouse(s, '302'); waitUntil(s, function () { return s.dialog; }); press(s, 'action'); list.push(s); // 대면
    s = newState(); accuseHouse(s, '302');
    for (let i = 0; i < 6000 && !(s.cutscene && s.cutscene.card); i++) step(s, null, i % 6 === 0 ? ['action'] : null);
    list.push(s);                                                                                      // 해결 엔딩 카드
    s = newState(); accuseHouse(s, '202');
    for (let i = 0; i < 6000 && !(s.cutscene && s.cutscene.card); i++) step(s, null, i % 6 === 0 ? ['action'] : null);
    list.push(s);                                                                                      // 오해 엔딩 카드
    s = G.createState(); list.push(s);                                                                 // 타이틀
    s = G.createState(); press(s, 'action'); waitUntil(s, function () { return s.night.phase === 'hold'; }); press(s, 'action'); press(s, 'action'); press(s, 'action'); list.push(s); // 밤 독백 + 부들부들
    s = G.createState(); playIntroUntil(s, 'note'); waitUntil(s, function () { return s.cutscene.card; }); list.push(s);   // 쪽지 카드
    s = G.createState(); playIntroUntil(s, 'goal'); list.push(s);                                     // 목표 카드
    s = newState(); step(s); list.push(s);                                                             // TIP
    s = newState(); knockAndFinish(s, '202'); knockAndFinish(s, '202'); list.push(s);                  // 발 구르기 / 축 처짐
    return list;
  }

  test('render는 상태를 바꾸지 않는다 (여러 장면)', function () {
    if (typeof document === 'undefined') return;
    sampleStates().forEach(function (s, i) {
      const before = JSON.stringify(s);
      const r = recordingCtx();
      G.render(r.ctx, s, r.L);
      assert(JSON.stringify(s) === before, '장면 ' + i + ' 렌더링 중 상태가 바뀜');
    });
  });

  test('화면에 쓰인 모든 색이 팔레트 안에 있다 (여러 장면)', function () {
    if (typeof document === 'undefined') return;
    const allowed = new Set(Object.values(C.PALETTE));
    sampleStates().forEach(function (s, i) {
      const r = recordingCtx();
      G.render(r.ctx, s, r.L);
      const bad = [...r.used].filter(function (c) { return !allowed.has(c); });
      assert(bad.length === 0, '장면 ' + i + ' 팔레트 밖 색: ' + bad.join(', '));
    });
  });

  G.runTests = function () {
    return tests.map(function (t) {
      try { t.fn(); return { name: t.name, ok: true }; }
      catch (e) { return { name: t.name, ok: false, error: e.message }; }
    });
  };
})(window.Game = window.Game || {});
