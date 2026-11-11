// building.js — 건물 구조 데이터 (로직 없음)
//
//   3F  [ 301 ] [계단] [ 302 ]
//   2F  [ 201 ] [계단] [ 202 ]   ← 201호: 플레이어 집
//   1F  [ 101 ] [계단] [ 102 ]
(function (G) {
  'use strict';

  G.building = {
    floors: 3,

    // 한 층의 가로 구성 (왼쪽 → 오른쪽). width는 config.UNIT 배수.
    segments: [
      { slot: 'left', type: 'house', width: 7 },
      { slot: 'stairs', type: 'stairs', width: 3 },
      { slot: 'right', type: 'house', width: 7 },
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
    playerStartRatio: 0.7,   // 집 안에서 시작 위치 (0 = 왼쪽 끝, 1 = 오른쪽 끝)
  };
})(window.Game = window.Game || {});
