// config.js — 숫자, 색, 키 설정
// 화면에 쓰는 색은 반드시 PALETTE에서만 가져온다. (DO NOT LOSE: 실루엣 + 팔레트)
(function (G) {
  'use strict';

  G.config = {
    // 크기 (px)
    UNIT: 40,            // 구역 너비 단위 (building.js의 width × UNIT)
    FLOOR_H: 160,        // 한 층(방)의 높이
    SLAB: 14,            // 층 사이 바닥/천장 두께
    WALL: 40,            // 건물 외벽(벽돌) 두께
    TOP_UI: 64,          // 상단 UI 영역
    ROOF_H: 64,          // 옥상 실루엣 영역
    GROUND: 44,          // 하단 땅/안내 영역

    // 플레이어
    PLAYER_W: 26,        // 충돌 판정용 너비
    PLAYER_SPEED: 200,   // 좌우 이동 속도 (px/초)
    FLOOR_MOVE_MS: 380,  // 계단으로 한 층 이동하는 시간
    MAX_DT: 50,

    FONT: '"Trebuchet MS", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',

    KEYS: {
      KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      KeyG: 'debug',
    },

    PALETTE: {
      // 공통
      bg: '#0e0b0f',
      sky: '#2a1d24',
      silhouette: '#0b0a0c',
      brick: '#3a2026',
      brickLine: '#26141a',
      stairs: '#2a1f25',
      stairsStep: '#4a3640',   // 계단은 인물(검정)과 구분되도록 한 톤 밝게
      uiLight: '#f1d9cf',
      uiDim: '#7a6670',
      accent: '#e2584f',

      // 집마다 단색 + 같은 계열 어두운 톤(배경 가구용)
      roomPink: '#d8607e',    roomPinkDark: '#b5455f',
      roomRed: '#cf4f4b',     roomRedDark: '#a63a37',
      roomTeal: '#6ea4a6',    roomTealDark: '#4f8285',
      roomMagenta: '#b9476a', roomMagentaDark: '#943651',
      roomOrange: '#e09a3a',  roomOrangeDark: '#b67a23',
      roomBlue: '#4a72b0',    roomBlueDark: '#36578a',

      // 디버그
      debugZone: 'rgba(120,255,160,0.25)',
      debugLine: 'rgba(255,255,255,0.5)',
      debugBg: 'rgba(0,0,0,0.75)',
    },
  };
})(window.Game = window.Game || {});
