// world.js — 건물 구조 해석과 이동 규칙 판정 (순수 함수, 화면과 무관)
// 좌표계: x는 "층 내부" 기준 px (0 = 왼쪽 외벽 안쪽 면), floor는 1 ~ floors.
(function (G) {
  'use strict';

  let cachedSegments = null;

  // segments에 x0, x1(px)을 붙여서 돌려준다.
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

  function segmentAt(x) {
    const segs = segments();
    for (let i = 0; i < segs.length; i++) {
      if (x >= segs[i].x0 && x < segs[i].x1) return segs[i];
    }
    return x < 0 ? segs[0] : segs[segs.length - 1];
  }

  function houseIdAt(floor, slot) {
    const H = G.building.houses;
    for (const id in H) {
      if (H[id].floor === floor && H[id].slot === slot) return id;
    }
    return null;
  }

  // 현재 위치의 공간: { type: 'house', id: '201' } 또는 { type: 'stairs', floor }
  function roomAt(floor, x) {
    const seg = segmentAt(x);
    if (seg.type === 'stairs') return { type: 'stairs', floor: floor };
    return { type: 'house', id: houseIdAt(floor, seg.slot), floor: floor };
  }

  // 플레이어가 갈 수 있는 x 범위 (외벽 안쪽)
  function xBounds() {
    const half = G.config.PLAYER_W / 2;
    return { min: half, max: innerWidth() - half };
  }

  // 플레이어 중심이 계단실 안에 있는가
  function isInStairs(x) {
    return segmentAt(x).type === 'stairs';
  }

  // dir: +1(위) / -1(아래). 이동 가능하면 목표 층, 아니면 null.
  function floorTarget(state, dir) {
    const p = state.player;
    if (p.floorMove) return null;
    if (!isInStairs(p.x)) return null;
    const to = p.floor + dir;
    if (to < 1 || to > G.building.floors) return null;
    return to;
  }

  G.world = {
    segments: segments,
    innerWidth: innerWidth,
    segmentBySlot: segmentBySlot,
    segmentAt: segmentAt,
    houseIdAt: houseIdAt,
    roomAt: roomAt,
    xBounds: xBounds,
    isInStairs: isInStairs,
    floorTarget: floorTarget,
  };
})(window.Game = window.Game || {});
