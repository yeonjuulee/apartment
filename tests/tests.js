// tests.js — 1단계 자동 테스트 (브라우저 test.html, Node run-node.js 양쪽에서 실행)
(function (G) {
  'use strict';

  // 키보드 대신 쓰는 가짜 입력
  //   held: 누르고 있는 좌우 방향 ('left' | 'right' | null)
  //   press: 이번 프레임에 한 번 눌린 동작 목록 (예: ['up'])
  function fakeInput(held, press) {
    const pressed = new Set(press || []);
    return {
      getHorizontal: function () { return held || null; },
      consumePressed: function (a) { if (pressed.has(a)) { pressed.delete(a); return true; } return false; },
      endFrame: function () { pressed.clear(); },
    };
  }

  function step(state, held, press, ms) {
    G.update(state, fakeInput(held, press), ms || 16);
  }

  function run(state, held, ms) {
    for (let t = 0; t < ms; t += 16) step(state, held, null, 16);
  }

  // 계단 이동이 끝날 때까지 진행
  function settle(state) {
    for (let i = 0; i < 200 && state.player.floorMove; i++) step(state, null, null, 16);
  }

  function stairsCenter() {
    const s = G.world.segmentBySlot('stairs');
    return (s.x0 + s.x1) / 2;
  }

  function placeAt(state, floor, x) {
    Object.assign(state.player, { floor: floor, x: x, floorMove: null });
  }

  const tests = [];
  function test(name, fn) { tests.push({ name: name, fn: fn }); }
  function assert(cond, msg) { if (!cond) throw new Error(msg); }

  // ---------- 건물 데이터 ----------
  test('집이 6개이고, 층마다 왼쪽·오른쪽 집이 하나씩 있다', function () {
    const ids = Object.keys(G.building.houses);
    assert(ids.length === 6, '집 수 ' + ids.length);
    for (let f = 1; f <= 3; f++) {
      assert(G.world.houseIdAt(f, 'left'), f + '층 왼쪽 집 없음');
      assert(G.world.houseIdAt(f, 'right'), f + '층 오른쪽 집 없음');
    }
  });

  test('구조가 [집][계단][집] 순서다', function () {
    const types = G.world.segments().map(function (s) { return s.type; }).join(',');
    assert(types === 'house,stairs,house', types);
  });

  test('집마다 거주자와 유사 소음 아이템 데이터가 있다', function () {
    Object.keys(G.building.houses).forEach(function (id) {
      const r = G.residents[id];
      assert(r, id + ' 거주자 없음');
      assert(r.item && G.silhouettes.ITEMS[r.item.shape], id + ' 아이템 실루엣 없음');
      if (r.figure) assert(G.silhouettes.FIGURES[r.figure], id + ' 인물 실루엣 없음');
    });
  });

  test('집 색과 톤이 모두 팔레트에 있다', function () {
    const H = G.building.houses;
    Object.keys(H).forEach(function (id) {
      assert(G.config.PALETTE[H[id].color], id + ' color');
      assert(G.config.PALETTE[H[id].tone], id + ' tone');
    });
  });

  // ---------- 초기 상태 ----------
  test('플레이어는 2층 201호(내 집)에서 시작한다', function () {
    const s = G.createState();
    const room = G.world.roomAt(s.player.floor, s.player.x);
    assert(s.player.floor === 2, 'floor ' + s.player.floor);
    assert(room.type === 'house' && room.id === '201', JSON.stringify(room));
  });

  test('상태에 이후 단계용 자리(day, maxDay, talkedToday, log, flags)가 있다', function () {
    const s = G.createState();
    assert(s.day === 1 && s.maxDay === 5, 'day/maxDay');
    assert(typeof s.talkedToday === 'object' && Array.isArray(s.log) && typeof s.flags === 'object', '구조');
  });

  // ---------- 좌우 이동 ----------
  test('D를 누르면 오른쪽으로, A를 누르면 왼쪽으로 이동한다', function () {
    const s = G.createState();
    const x0 = s.player.x;
    run(s, 'right', 200);
    assert(s.player.x > x0 && s.player.facing === 'right', '오른쪽 이동 실패');
    const x1 = s.player.x;
    run(s, 'left', 200);
    assert(s.player.x < x1 && s.player.facing === 'left', '왼쪽 이동 실패');
  });

  test('왼쪽 외벽을 통과하지 않는다', function () {
    const s = G.createState();
    run(s, 'left', 10000);
    assert(s.player.x === G.world.xBounds().min, 'x=' + s.player.x);
  });

  test('오른쪽 외벽을 통과하지 않는다', function () {
    const s = G.createState();
    run(s, 'right', 10000);
    assert(s.player.x === G.world.xBounds().max, 'x=' + s.player.x);
  });

  test('같은 층에서 집 → 계단 → 옆집으로 걸어갈 수 있다', function () {
    const s = G.createState();
    const seen = new Set();
    for (let t = 0; t < 10000; t += 16) {
      step(s, 'right');
      const r = G.world.roomAt(s.player.floor, s.player.x);
      seen.add(r.type === 'stairs' ? 'stairs' : r.id);
    }
    assert(seen.has('201') && seen.has('stairs') && seen.has('202'), [...seen].join(','));
    assert(s.player.floor === 2, '층이 바뀜');
  });

  // ---------- 층 이동 ----------
  test('계단이 아닌 곳에서 W/S를 눌러도 층이 바뀌지 않는다', function () {
    const s = G.createState();               // 201호 안
    step(s, null, ['up']); settle(s);
    assert(s.player.floor === 2, 'W: floor ' + s.player.floor);
    step(s, null, ['down']); settle(s);
    assert(s.player.floor === 2, 'S: floor ' + s.player.floor);
  });

  test('계단실에서 W를 누르면 한 층 올라간다', function () {
    const s = G.createState();
    placeAt(s, 2, stairsCenter());
    step(s, null, ['up']);
    assert(s.player.floorMove && s.player.floorMove.to === 3, '이동 시작 안 됨');
    settle(s);
    assert(s.player.floor === 3, 'floor ' + s.player.floor);
  });

  test('계단실에서 S를 누르면 한 층 내려간다', function () {
    const s = G.createState();
    placeAt(s, 2, stairsCenter());
    step(s, null, ['down']); settle(s);
    assert(s.player.floor === 1, 'floor ' + s.player.floor);
  });

  test('3층에서 위로, 1층에서 아래로는 이동할 수 없다', function () {
    const s = G.createState();
    placeAt(s, 3, stairsCenter());
    step(s, null, ['up']); settle(s);
    assert(s.player.floor === 3, '3층 위: ' + s.player.floor);
    placeAt(s, 1, stairsCenter());
    step(s, null, ['down']); settle(s);
    assert(s.player.floor === 1, '1층 아래: ' + s.player.floor);
  });

  test('이동 중 W를 또 눌러도 한 번에 한 층만 이동한다', function () {
    const s = G.createState();
    placeAt(s, 1, stairsCenter());
    step(s, null, ['up']);
    for (let i = 0; i < 10; i++) step(s, null, ['up']);  // 이동 중 연타
    settle(s);
    assert(s.player.floor === 2, 'floor ' + s.player.floor);
  });

  test('계단 이동 중에는 좌우로 움직이지 않는다', function () {
    const s = G.createState();
    placeAt(s, 2, stairsCenter());
    const x0 = s.player.x;
    step(s, null, ['up']);
    for (let i = 0; i < 10; i++) step(s, 'right');
    assert(s.player.x === x0, 'x가 바뀜: ' + s.player.x);
  });

  test('층을 옮긴 뒤 같은 위치의 집이 그 층 기준으로 판정된다', function () {
    const s = G.createState();
    placeAt(s, 2, stairsCenter());
    step(s, null, ['up']); settle(s);
    run(s, 'right', 3000);
    const r = G.world.roomAt(s.player.floor, s.player.x);
    assert(r.id === '302', JSON.stringify(r));
  });

  test('1층 → 3층까지 계단으로 연속 이동할 수 있다', function () {
    const s = G.createState();
    placeAt(s, 1, stairsCenter());
    step(s, null, ['up']); settle(s);
    step(s, null, ['up']); settle(s);
    assert(s.player.floor === 3, 'floor ' + s.player.floor);
  });

  // ---------- 렌더링 (브라우저 전용) ----------
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

  test('render는 상태를 바꾸지 않는다', function () {
    if (typeof document === 'undefined') return;
    const s = G.createState();
    s.debug = true;
    s.player.walking = true;
    const before = JSON.stringify(s);
    const r = recordingCtx();
    G.render(r.ctx, s, r.L);
    assert(JSON.stringify(s) === before, '렌더링 중 상태가 바뀜');
  });

  test('화면에 쓰인 모든 색이 팔레트 안에 있다', function () {
    if (typeof document === 'undefined') return;
    const allowed = new Set(Object.values(G.config.PALETTE));
    const s = G.createState();
    s.debug = true;
    placeAt(s, 2, stairsCenter());           // 계단 힌트까지 그려지게
    const r = recordingCtx();
    G.render(r.ctx, s, r.L);
    const bad = [...r.used].filter(function (c) { return !allowed.has(c); });
    assert(bad.length === 0, '팔레트 밖 색: ' + bad.join(', '));
  });

  G.runTests = function () {
    return tests.map(function (t) {
      try { t.fn(); return { name: t.name, ok: true }; }
      catch (e) { return { name: t.name, ok: false, error: e.message }; }
    });
  };
})(window.Game = window.Game || {});
