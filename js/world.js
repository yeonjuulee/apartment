// world.js — 건물 구조 해석과 위치 판정 (순수 함수, 화면과 무관)
// 좌표계: x는 "층 내부" 기준 px (0 = 왼쪽 외벽 안쪽 면), floor는 1 ~ floors.
// 플레이어는 복도 + (내 집 층이면) 내 집 안을 자유롭게 걷는다. 남의 집에는 들어갈 수 없다.
(function (G) {
  'use strict';

  let cachedSegments = null;

  function segments() {
    if (cachedSegments) return cachedSegments;
    let x = 0;
    cachedSegments = G.building.segments.map(function (s) {
      const w = s.width * G.config.UNIT;
      const seg = { slot: s.slot, type: s.type, x0: x, x1: x + w, width: w };
      x += w;
      return seg;
    });
    return cachedSegments;
  }

  function innerWidth() {
    const segs = segments();
    return segs[segs.length - 1].x1;
  }

  function segmentBySlot(slot) {
    return segments().find(function (s) { return s.slot === slot; }) || null;
  }

  function hallway() { return segments().find(function (s) { return s.type === 'hallway'; }); }

  function houseIdAt(floor, slot) {
    const H = G.building.houses;
    for (const id in H) if (H[id].floor === floor && H[id].slot === slot) return id;
    return null;
  }

  function houseSegment(id) { return segmentBySlot(G.building.houses[id].slot); }

  function homeHouse() { return G.building.houses[G.building.playerHome]; }

  // 집과 복도의 경계 x
  function boundaryX(id) {
    const hall = hallway();
    return G.building.houses[id].slot === 'left' ? hall.x0 : hall.x1;
  }

  // 노크하면 이웃이 나와서 서는 자리 (경계 바로 안쪽)
  function meetSpot(id) {
    const off = 24;
    return G.building.houses[id].slot === 'left' ? boundaryX(id) - off : boundaryX(id) + off;
  }

  // 집 안의 비율 위치 → x (0 = 바깥 외벽 쪽, 1 = 복도 쪽)
  function housePoint(id, ratio) {
    const seg = houseSegment(id);
    return G.building.houses[id].slot === 'left'
      ? seg.x0 + seg.width * ratio
      : seg.x1 - seg.width * ratio;
  }

  function elevatorX() {
    const hall = hallway();
    return (hall.x0 + hall.x1) / 2;
  }

  // 그 층에서 플레이어가 걸을 수 있는 x 범위
  function walkBounds(floor) {
    const half = G.config.PLAYER_W / 2;
    const hall = hallway();
    const b = { min: hall.x0 + half, max: hall.x1 - half };
    const home = homeHouse();
    if (floor === home.floor) {
      const seg = houseSegment(G.building.playerHome);
      if (home.slot === 'left') b.min = seg.x0 + half;
      else b.max = seg.x1 - half;
    }
    return b;
  }

  // x 위치가 복도인지 내 집인지
  function areaAt(floor, x) {
    const hall = hallway();
    return x >= hall.x0 && x <= hall.x1 ? 'hallway' : 'home';
  }

  // 지금 위치에서 Space로 할 수 있는 일. 없으면 null.
  //   { type: 'knock', houseId } | { type: 'elevator' }
  function interactionAt(state) {
    const p = state.player;
    const C = G.config;
    if (p.area !== 'hallway') return null;

    if (Math.abs(p.x - elevatorX()) <= C.ELEV_REACH) return { type: 'elevator' };

    const slots = ['left', 'right'];
    for (let i = 0; i < slots.length; i++) {
      const id = houseIdAt(p.floor, slots[i]);
      if (!id || id === G.building.playerHome) continue;
      if (Math.abs(p.x - boundaryX(id)) <= C.KNOCK_REACH) return { type: 'knock', houseId: id };
    }
    return null;
  }

  // 노크할 때 플레이어가 서는 자리 (경계 바로 앞)
  function knockSpot(id) {
    const b = walkBounds(G.building.houses[id].floor);
    return G.building.houses[id].slot === 'left' ? b.min : b.max;
  }

  // 내 집 침대 중심 x (아이템 'bed'가 그려지는 자리)
  function bedX() { return housePoint(G.building.playerHome, 0.27); }

  // 플레이어가 침대 앞에 있는가
  function atBed(state) {
    const p = state.player;
    return p.area === 'home' && p.floor === homeHouse().floor && Math.abs(p.x - bedX()) <= G.config.BED_REACH;
  }

  function locationLabel(state) {
    const p = state.player;
    if (p.inElevator) return '엘리베이터';
    if (p.area === 'home') return p.floor + 'F · ' + G.building.playerHome + '호 · 내 집';
    return p.floor + 'F · 복도';
  }

  G.world = {
    segments: segments,
    innerWidth: innerWidth,
    segmentBySlot: segmentBySlot,
    hallway: hallway,
    houseIdAt: houseIdAt,
    houseSegment: houseSegment,
    boundaryX: boundaryX,
    meetSpot: meetSpot,
    knockSpot: knockSpot,
    housePoint: housePoint,
    elevatorX: elevatorX,
    walkBounds: walkBounds,
    areaAt: areaAt,
    interactionAt: interactionAt,
    bedX: bedX,
    atBed: atBed,
    locationLabel: locationLabel,
  };
})(window.Game = window.Game || {});
