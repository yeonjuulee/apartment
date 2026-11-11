// tests.js — 자동 테스트 (브라우저 test.html, Node run-node.js 양쪽에서 실행)
(function (G) {
  'use strict';

  const C = G.config;
  const W = G.world;

  // ---------- 시뮬레이션 도우미 ----------
  // 가짜 입력: held = 누르고 있는 좌우 방향, press = 이번 프레임에 한 번 눌린 동작들
  function fakeInput(held, press) {
    const pressed = new Set(press || []);
    return {
      getHorizontal: function () { return held || null; },
      consumePressed: function (a) { if (pressed.has(a)) { pressed.delete(a); return true; } return false; },
      endFrame: function () { pressed.clear(); },
    };
  }
  function step(s, held, press, ms) { G.update(s, fakeInput(held, press), ms || 16); }
  function run(s, held, ms) { for (let t = 0; t < ms; t += 16) step(s, held); }
  function press(s, action) { step(s, null, [action]); }
  function waitUntil(s, cond, maxMs) {
    for (let t = 0; t < (maxMs || 10000); t += 16) { if (cond()) return true; step(s); }
    return cond();
  }

  function inHallway(s, floor, x) {
    Object.assign(s.player, { floor: floor, area: 'hallway', x: x, tween: null, inElevator: false });
  }
  function atDoorOf(s, id) {           // 그 집 경계 근처 복도 (노크 가능 범위 안쪽 끝)
    const h = G.building.houses[id];
    const bx = W.boundaryX(id);
    inHallway(s, h.floor, h.slot === 'left' ? bx + C.KNOCK_REACH - 4 : bx - C.KNOCK_REACH + 4);
  }
  function atElevator(s, floor) { inHallway(s, floor, W.elevatorX()); }

  // 노크 한 번을 끝까지 진행 (대화가 뜨면 Space로 닫음)
  function knockAndFinish(s, id) {
    atDoorOf(s, id);
    press(s, 'action');
    waitUntil(s, function () { return s.dialog || !s.visit; });
    if (s.dialog) press(s, 'action');
    waitUntil(s, function () { return !s.visit; });
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

  test('이웃 5명 모두 실루엣·아이템·문 앞 대사(greet, refuse)가 있다', function () {
    Object.keys(G.residents).forEach(function (id) {
      const r = G.residents[id];
      assert(r.item && G.silhouettes.ITEMS[r.item.shape], id + ' 아이템');
      if (id === G.building.playerHome) return;
      assert(G.silhouettes.FIGURES[r.figure], id + ' 인물');
      assert(r.greet && r.refuse, id + ' 대사');
    });
  });

  test('플레이어는 2층 201호 안에서 시작한다', function () {
    const s = G.createState();
    assert(s.player.floor === 2 && s.player.area === 'home', JSON.stringify(s.player));
  });

  // ================= 이동 제한 =================
  test('게임 시작 시 승강기는 플레이어와 같은 2층에 서 있다', function () {
    const s = G.createState();
    assert(s.elevator.floor === 2 && s.elevator.pos === 2 && s.elevator.phase === 'idle', JSON.stringify(s.elevator));
    run(s, null, 2000);
    assert(s.elevator.floor === 2 && s.elevator.phase === 'idle', '혼자 움직임');
  });

  test('내 집과 복도는 문 없이 걸어서 오갈 수 있다', function () {
    const s = G.createState();
    run(s, 'right', 1200);
    assert(s.player.area === 'hallway', '복도로 못 나감: ' + JSON.stringify(s.player));
    run(s, 'left', 1200);
    assert(s.player.area === 'home', '집으로 못 들어옴');
  });

  test('내 집 왼쪽 외벽을 통과할 수 없다', function () {
    const s = G.createState();
    run(s, 'left', 5000);
    assert(s.player.x === W.walkBounds(2).min, 'x=' + s.player.x);
  });

  test('2층 복도에서 오른쪽 202호로 걸어 들어갈 수 없다', function () {
    const s = G.createState();
    run(s, 'right', 6000);
    assert(s.player.x === W.walkBounds(2).max && s.player.x < W.boundaryX('202'), 'x=' + s.player.x);
  });

  test('다른 층에서는 양쪽 집 모두 들어갈 수 없다', function () {
    const s = G.createState();
    inHallway(s, 1, W.elevatorX());
    run(s, 'left', 5000);
    assert(s.player.x > W.boundaryX('101') && s.player.area === 'hallway', '101 진입: x=' + s.player.x);
    run(s, 'right', 5000);
    assert(s.player.x < W.boundaryX('102') && s.player.area === 'hallway', '102 진입: x=' + s.player.x);
  });

  test('노크·엘리베이터 범위 밖에서는 Space를 눌러도 아무 일도 없다', function () {
    const s = G.createState();             // 집 안
    press(s, 'action');
    assert(s.scene === 'explore', s.scene);
    inHallway(s, 1, W.elevatorX() - C.ELEV_REACH - 10);
    press(s, 'action');
    assert(s.scene === 'explore', '복도 빈 곳에서 반응');
  });

  test('내 집 쪽 경계에서는 노크 안내가 뜨지 않는다', function () {
    const s = G.createState();
    inHallway(s, 2, W.boundaryX('201') + 10);
    assert(!W.interactionAt(s), JSON.stringify(W.interactionAt(s)));
  });

  // ================= 노크 =================
  test('남의 집 경계 근처에서는 노크 안내가 뜬다', function () {
    const s = G.createState();
    atDoorOf(s, '202');
    const it = W.interactionAt(s);
    assert(it && it.type === 'knock' && it.houseId === '202', JSON.stringify(it));
  });

  test('첫 노크: 경계로 다가가 두드림 → 이웃이 플레이어 앞으로 걸어옴 → 대화', function () {
    const s = G.createState();
    atDoorOf(s, '202');
    const home = s.npcs['202'].homeX;
    press(s, 'action');
    assert(s.scene === 'visit' && s.visit.phase === 'step', '노크 시작 안 됨');
    waitUntil(s, function () { return s.visit.phase === 'knock'; });
    assert(s.player.x === W.knockSpot('202'), '경계까지 다가가지 않음: ' + s.player.x);
    assert(G.visit.knocking(s) !== null, '두드리는 동작 없음');
    assert(s.npcs['202'].x === home, '두드리는 중에 이웃이 먼저 움직임');
    waitUntil(s, function () { return s.visit.phase === 'approach'; });
    run(s, null, 200);
    assert(s.npcs['202'].walking && s.npcs['202'].x !== home, '이웃이 걸어오지 않음');
    waitUntil(s, function () { return s.visit.phase === 'talk'; });
    assert(s.npcs['202'].x === W.meetSpot('202'), '이웃이 플레이어 앞에 없음');
    assert(s.dialog && !s.dialog.fromInside && s.dialog.text === G.residents['202'].greet, '대화 없음');
  });

  test('대화를 마치면 이웃이 제자리로 돌아가고, 오늘 대화가 기록된다', function () {
    const s = G.createState();
    knockAndFinish(s, '202');
    assert(s.scene === 'explore' && !s.dialog, '장면 복귀 안 됨');
    assert(s.talkedToday['202'] === true, 'talkedToday');
    assert(s.log.length === 1 && s.log[0].houseId === '202' && s.log[0].day === 1, 'log');
    waitUntil(s, function () { return !s.npcs['202'].walking; });
    assert(s.npcs['202'].x === s.npcs['202'].homeX, '제자리로 안 돌아감');
  });

  test('방문 중에는 A/D를 눌러도 움직이지 않는다 (경계까지 자동으로 한 걸음만)', function () {
    const s = G.createState();
    atDoorOf(s, '202');
    press(s, 'action');
    run(s, 'left', 1500);
    assert(s.player.x === W.knockSpot('202'), 'x=' + s.player.x);
  });

  test('같은 날 두 번째 노크: 이웃은 나오지 않고 집 안에서 대답한다', function () {
    const s = G.createState();
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
    assert(s.dialog.fromInside && s.dialog.text === G.residents['101'].refuse, '거절 대사 아님');
    press(s, 'action');
    assert(s.scene === 'explore' && s.log.length === 1, '기록이 늘어남 / 장면 복귀 안 됨');
  });

  test('같은 날 세 번째 노크부터는 아무도 나오지 않는다', function () {
    const s = G.createState();
    knockAndFinish(s, '301');
    knockAndFinish(s, '301');
    waitUntil(s, function () { return !s.npcs['301'].walking; });
    atDoorOf(s, '301');
    press(s, 'action');
    waitUntil(s, function () { return s.visit.phase === 'silence'; });
    run(s, null, 500);
    assert(s.npcs['301'].x === s.npcs['301'].homeX && !s.dialog, '이웃이 나옴');
    waitUntil(s, function () { return !s.visit; });
    assert(s.scene === 'explore', '장면 복귀 안 됨');
  });

  test('노크 횟수는 집마다 따로 센다', function () {
    const s = G.createState();
    knockAndFinish(s, '301');
    knockAndFinish(s, '301');
    assert(G.visit.decideMode(s, '302') === 'normal', '302에 영향');
  });

  // ================= 엘리베이터 =================
  test('엘리베이터 앞에서는 호출 안내가 뜬다', function () {
    const s = G.createState();
    atElevator(s, 2);
    assert(W.interactionAt(s).type === 'elevator', '안내 없음');
  });

  test('승강기가 다른 층에 있으면 먼저 내 층으로 온다', function () {
    const s = G.createState();
    s.elevator.floor = 1; s.elevator.pos = 1;
    atElevator(s, 3);
    press(s, 'action');
    assert(s.elevator.phase === 'summon', s.elevator.phase);
    assert(G.elevator.doorOpen(s, 3) === 0, '도착 전 문이 열림');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    assert(s.elevator.floor === 3 && s.player.inElevator, '도착/탑승 실패');
  });

  test('2층 → 3층: 탑승 → 선택 → 이동 → 하차', function () {
    const s = G.createState();          // 승강기는 2층에서 시작
    atElevator(s, 2);
    press(s, 'action');
    assert(s.elevator.phase === 'opening', '바로 열리지 않음: ' + s.elevator.phase);
    waitUntil(s, function () { return s.scene === 'explore' || s.elevator.phase === 'select'; });
    press(s, 'left');                   // 한 번 내렸다가 다시
    waitUntil(s, function () { return s.elevator.phase === 'idle'; });
    atElevator(s, 2);
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    assert(s.elevator.selection === 3, '기본 선택 ' + s.elevator.selection);
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'moving'; });
    assert(G.elevator.doorOpen(s, 2) === 0 && G.elevator.doorOpen(s, 3) === 0, '이동 중 문이 열림');
    waitUntil(s, function () { return s.scene === 'explore'; });
    assert(s.player.floor === 3 && !s.player.inElevator && s.player.area === 'hallway', JSON.stringify(s.player));
    waitUntil(s, function () { return s.elevator.phase === 'idle'; });
    assert(G.elevator.doorOpen(s, 3) === 0, '문이 안 닫힘');
  });

  test('1층 → 3층으로 한 번에 이동할 수 있다', function () {
    const s = G.createState();
    atElevator(s, 1);
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    press(s, 'up');                     // 기본 2층 → 3층
    assert(s.elevator.selection === 3, 'sel ' + s.elevator.selection);
    press(s, 'action');
    waitUntil(s, function () { return s.scene === 'explore'; });
    assert(s.player.floor === 3, 'floor ' + s.player.floor);
  });

  test('층 선택에서 현재 층은 건너뛰고, 범위 밖으로 나가지 않는다', function () {
    const N = G.elevator.nextSelection;
    assert(N(3, -1, 2) === 1, '3→(2 건너뜀)→1');
    assert(N(1, 1, 2) === 3, '1→(2 건너뜀)→3');
    assert(N(3, 1, 2) === 3, '3 위로 안 감');
    assert(N(1, -1, 2) === 1, '1 아래로 안 감');
  });

  test('층 선택 중 A/D를 누르면 같은 층에서 내린다', function () {
    const s = G.createState();
    atElevator(s, 1);
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    press(s, 'left');
    waitUntil(s, function () { return s.scene === 'explore'; });
    assert(s.player.floor === 1 && !s.player.inElevator, JSON.stringify(s.player));
  });

  test('엘리베이터 이동 중에는 입력이 막힌다', function () {
    const s = G.createState();
    atElevator(s, 1);
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'moving'; });
    const x0 = s.player.x;
    step(s, 'left', ['action', 'up', 'down']);
    run(s, 'right', 300);
    assert(s.player.x === x0 && s.elevator.to === 2, '입력이 먹힘');
  });

  // ================= 통합 =================
  test('1층부터 5집을 모두 방문하고 내 집으로 돌아올 수 있다', function () {
    const s = G.createState();
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
    assert(Object.keys(s.talkedToday).length === 5, '대화 ' + Object.keys(s.talkedToday).length);
    run(s, 'left', 3000);
    assert(s.player.area === 'home', '귀가 실패');
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

  // 여러 장면을 만들어 두고 렌더링 검사
  function sampleStates() {
    const list = [];
    let s = G.createState(); s.debug = true; list.push(s);
    s = G.createState(); atDoorOf(s, '202'); press(s, 'action'); list.push(s);                  // 똑똑
    s = G.createState(); atDoorOf(s, '202'); press(s, 'action');
    waitUntil(s, function () { return s.visit.phase === 'talk'; }); list.push(s);                // 대화
    s = G.createState(); atElevator(s, 1); press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; }); list.push(s);           // 층 선택
    s = G.createState(); atElevator(s, 1); press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'select'; }); press(s, 'action');
    waitUntil(s, function () { return s.elevator.phase === 'moving'; }); run(s, null, 200); list.push(s); // 이동 중
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
