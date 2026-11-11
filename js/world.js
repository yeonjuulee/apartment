// world.js — 건물 구조 해석과 위치 판정 (순수 함수, 화면과 무관)
// 좌표계: x는 "층 내부" 기준 px (0 = 왼쪽 외벽 안쪽 면), floor는 1 ~ floors.
// 플레이어의 area: 'hallway'(복도) | 'home'(내 집 안)
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

  // 집 문이 있는 x (집과 복도 경계)
  function doorX(id) {
    const hall = hallway();
    return G.building.houses[id].slot === 'left' ? hall.x0 : hall.x1;
  }

  // 집 안에서 문 바로 앞 (이웃이 문을 열 때 서는 자리)
  function doorSpotInside(id) {
    const off = G.config.PARTITION / 2 + 22;
    return G.building.houses[id].slot === 'left' ? doorX(id) - off : doorX(id) + off;
  }

  // 집 안의 비율 위치 → x (0 = 바깥 외벽 쪽, 1 = 문 쪽)
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

  // 플레이어가 현재 영역에서 움직일 수 있는 x 범위
  function areaBounds(area) {
    const half = G.config.PLAYER_W / 2;
    const wall = G.config.PARTITION / 2;
    if (area === 'home') {
      const seg = houseSegment(G.building.playerHome);
      const left = G.building.houses[G.building.playerHome].slot === 'left';
      return left
        ? { min: seg.x0 + half, max: seg.x1 - wall - half }
        : { min: seg.x0 + wall + half, max: seg.x1 - half };
    }
    const hall = hallway();
    return { min: hall.x0 + wall + half, max: hall.x1 - wall - half };
  }

  // 지금 위치에서 Space로 할 수 있는 일. 없으면 null.
  //   { type: 'knock', houseId } | { type: 'enterHome' } | { type: 'exitHome' } | { type: 'elevator' }
  function interactionAt(state) {
    const p = state.player;
    const C = G.config;
    const home = G.building.playerHome;

    if (p.area === 'home') {
      return Math.abs(p.x - doorX(home)) <= C.DOOR_REACH ? { type: 'exitHome' } : null;
    }

    if (Math.abs(p.x - elevatorX()) <= C.ELEV_REACH) return { type: 'elevator' };

    const ids = ['left', 'right'].map(function (s) { return houseIdAt(p.floor, s); });
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id && Math.abs(p.x - doorX(id)) <= C.DOOR_REACH) {
        return id === home ? { type: 'enterHome' } : { type: 'knock', houseId: id };
      }
    }
    return null;
  }

  // 화면 표시용: 플레이어가 있는 곳 이름
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
    doorX: doorX,
    doorSpotInside: doorSpotInside,
    housePoint: housePoint,
    elevatorX: elevatorX,
    areaBounds: areaBounds,
    interactionAt: interactionAt,
    locationLabel: locationLabel,
  };
})(window.Game = window.Game || {});
