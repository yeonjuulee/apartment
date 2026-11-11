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
  function atDoorOf(s, id) {
    const h = G.building.houses[id];
    const b = W.areaBounds('hallway');
    inHallway(s, h.floor, h.slot === 'left' ? b.min : b.max);
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
  test('내 집 안에서 걸어서는 복도로 나갈 수 없다 (문으로만)', function () {
    const s = G.createState();
    run(s, 'right', 5000);
    assert(s.player.area === 'home', 'area ' + s.player.area);
    assert(s.player.x < W.doorX('201'), '칸막이 통과: x=' + s.player.x);
  });

  test('내 집 왼쪽 외벽을 통과할 수 없다', function () {
    const s = G.createState();
    run(s, 'left', 5000);
    assert(s.player.x === W.areaBounds('home').min, 'x=' + s.player.x);
  });

  test('복도에서 걸어서 남의 집(오른쪽)이나 내 집(왼쪽)으로 들어갈 수 없다', function () {
    const s = G.createState();
    atElevator(s, 2);
    run(s, 'right', 5000);
    assert(s.player.x === W.areaBounds('hallway').max && s.player.x < W.doorX('202'), '오른쪽 x=' + s.player.x);
    run(s, 'left', 5000);
    assert(s.player.x === W.areaBounds('hallway').min && s.player.x > W.doorX('201'), '왼쪽 x=' + s.player.x);
    assert(s.player.area === 'hallway', 'area 바뀜');
  });

  test('문·엘리베이터 근처가 아니면 Space를 눌러도 아무 일도 없다', function () {
    const s = G.createState();
    s.player.x = W.areaBounds('home').min;   // 집 안 바깥쪽 끝
    press(s, 'action');
    assert(s.scene === 'explore' && s.player.area === 'home', s.scene);
  });

  // ================= 내 집 출입 =================
  test('내 집 문 앞에서 Space → 복도로 나가고, 다시 Space → 들어온다', function () {
    const s = G.createState();
    run(s, 'right', 3000);
    assert(W.interactionAt(s).type === 'exitHome', '나가기 안내 없음');
    press(s, 'action');
    waitUntil(s, function () { return s.scene === 'explore'; });
    assert(s.player.area === 'hallway' && s.player.x > W.doorX('201'), '나가기 실패 ' + JSON.stringify(s.player));
    assert(W.interactionAt(s).type === 'enterHome', '들어가기 안내 없음');
    press(s, 'action');
    waitUntil(s, function () { return s.scene === 'explore'; });
    assert(s.player.area === 'home' && s.player.x < W.doorX('201'), '들어가기 실패');
  });

  test('출입 중에는 좌우로 움직이지 않는다 (자동으로만 이동)', function () {
    const s = G.createState();
    run(s, 'right', 3000);
    press(s, 'action');
    const x0 = s.player.x;
    for (let i = 0; i < 5; i++) step(s, 'left');   // 문 열리는 동안
    assert(s.player.x === x0, 'x 바뀜');
  });

  // ================= 노크 =================
  test('남의 집 문 앞에서는 노크 안내가 뜬다', function () {
    const s = G.createState();
    atDoorOf(s, '202');
    const it = W.interactionAt(s);
    assert(it && it.type === 'knock' && it.houseId === '202', JSON.stringify(it));
  });

  test('첫 노크: 이웃이 문으로 걸어와 → 문이 열리고 → 대화', function () {
    const s = G.createState();
    atDoorOf(s, '202');
    const home = s.npcs['202'].homeX;
    press(s, 'action');
    assert(s.scene === 'visit' && s.visit.phase === 'knock', '노크 시작 안 됨');
    assert(G.visit.openAmount(s, '202') === 0, '노크 중에 문이 열림');
    waitUntil(s, function () { return s.visit.phase === 'approach'; });
    run(s, null, 200);
    assert(s.npcs['202'].x !== home && s.npcs['202'].walking, '이웃이 걸어오지 않음');
    waitUntil(s, function () { return s.visit.phase === 'talk'; });
    assert(s.npcs['202'].x === W.doorSpotInside('202'), '이웃이 문 앞에 없음');
    assert(G.visit.openAmount(s, '202') === 1, '문이 열리지 않음');
    assert(s.dialog && !s.dialog.through && s.dialog.text === G.residents['202'].greet, '대화 없음');
  });

  test('대화를 마치면 → 문이 닫히고 → 이웃이 제자리로, 오늘 대화 기록', function () {
    const s = G.createState();
    knockAndFinish(s, '202');
    assert(s.scene === 'explore' && !s.dialog, '장면 복귀 안 됨');
    assert(G.visit.openAmount(s, '202') === 0, '문이 열려 있음');
    assert(s.talkedToday['202'] === true, 'talkedToday');
    assert(s.log.length === 1 && s.log[0].houseId === '202' && s.log[0].day === 1, 'log');
    waitUntil(s, function () { return !s.npcs['202'].walking; });
    assert(s.npcs['202'].x === s.npcs['202'].homeX, '제자리로 안 돌아감');
  });

  test('방문 중에는 플레이어가 움직이지 않는다', function () {
    const s = G.createState();
    atDoorOf(s, '202');
    const x0 = s.player.x;
    press(s, 'action');
    run(s, 'left', 1500);
    assert(s.player.x === x0, 'x 바뀜');
  });

  test('같은 날 두 번째 노크: 이웃은 오지만 문은 열리지 않고 문 너머로 거절', function () {
    const s = G.createState();
    knockAndFinish(s, '101');
    waitUntil(s, function () { return !s.npcs['101'].walking; });
    atDoorOf(s, '101');
    press(s, 'action');
    let everOpened = false;
    waitUntil(s, function () {
      if (G.visit.openAmount(s, '101') > 0) everOpened = true;
      return s.visit && s.visit.phase === 'refuseTalk';
    });
    assert(!everOpened, '문이 열렸음');
    assert(s.dialog.through && s.dialog.text === G.residents['101'].refuse, '거절 대사 아님');
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
    const s = G.createState();          // 승강기는 1층에서 시작
    atElevator(s, 3);
    press(s, 'action');
    assert(s.elevator.phase === 'summon', s.elevator.phase);
    assert(G.elevator.doorOpen(s, 3) === 0, '도착 전 문이 열림');
    waitUntil(s, function () { return s.elevator.phase === 'select'; });
    assert(s.elevator.floor === 3 && s.player.inElevator, '도착/탑승 실패');
  });

  test('2층 → 3층: 탑승 → 선택 → 이동 → 하차', function () {
    const s = G.createState();
    s.elevator.floor = 2; s.elevator.pos = 2;
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

  test('내 집 안에서는 엘리베이터를 부를 수 없다', function () {
    const s = G.createState();
    s.player.x = W.elevatorX();          // 좌표만 맞춰도
    s.player.area = 'home';
    const it = W.interactionAt(s);
    assert(!it || it.type !== 'elevator', '집 안에서 호출됨');
  });

  // ================= 통합 =================
  test('1층부터 5집을 모두 방문하고 내 집으로 돌아올 수 있다', function () {
    const s = G.createState();
    s.player.area = 'hallway';
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
    const b = W.areaBounds('hallway');
    s.player.x = b.min;
    press(s, 'action');
    waitUntil(s, function () { return s.scene === 'explore'; });
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
