// building.js — 건물 구조 데이터 (로직 없음)
//
//   3F  [ 301 ]|[ 복도 🛗 복도 ]|[ 302 ]
//   2F  [ 201 ] [ 복도 🛗 복도 ]|[ 202 ]   ← 201호: 플레이어 집 (복도와 자유롭게 오감)
//   1F  [ 101 ]|[ 복도 🛗 복도 ]|[ 102 ]
//
// 플레이어는 복도와 내 집 안에서만 움직인다. 남의 집은 경계(|)에서 노크.
(function (G) {
  'use strict';

  G.building = {
    floors: 3,

    // 한 층의 가로 구성 (왼쪽 → 오른쪽). width는 config.UNIT 배수.
    // 엘리베이터는 복도 한가운데.
    segments: [
      { slot: 'left', type: 'house', width: 6 },
      { slot: 'hall', type: 'hallway', width: 6 },
      { slot: 'right', type: 'house', width: 6 },
    ],

    // color/tone은 PALETTE 키. deco는 방 배경에 어두운 톤으로 그려지는 장식.
    houses: {
      '301': { floor: 3, slot: 'left', color: 'roomPink', tone: 'roomPinkDark', deco: ['window', 'lamp'] },
      '302': { floor: 3, slot: 'right', color: 'roomRed', tone: 'roomRedDark', deco: ['frame', 'window'] },
      '201': { floor: 2, slot: 'left', color: 'roomTeal', tone: 'roomTealDark', deco: ['window', 'clock'] },
      '202': { floor: 2, slot: 'right', color: 'roomMagenta', tone: 'roomMagentaDark', deco: ['lamp', 'frame'] },
      '101': { floor: 1, slot: 'left', color: 'roomOrange', tone: 'roomOrangeDark', deco: ['frame', 'lamp'] },
      '102': { floor: 1, slot: 'right', color: 'roomBlue', tone: 'roomBlueDark', deco: ['window', 'clock'] },
    },

    playerHome: '201',
    playerStartRatio: 0.55,  // 집 안에서 시작 위치 (0 = 바깥 외벽 쪽, 1 = 복도 쪽)
    elevatorStartFloor: 2,   // 승강기가 처음 서 있는 층 (플레이어와 같은 층)
  };
})(window.Game = window.Game || {});
