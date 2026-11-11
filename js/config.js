// config.js — 숫자, 시간, 색, 키 설정
// 화면에 쓰는 색은 반드시 PALETTE에서만 가져온다. (DO NOT LOSE: 실루엣 + 팔레트)
(function (G) {
  'use strict';

  G.config = {
    // ---- 크기 (px) ----
    UNIT: 40,            // 구역 너비 단위 (building.js의 width × UNIT)
    FLOOR_H: 160,        // 한 층(방)의 높이
    SLAB: 14,            // 층 사이 바닥/천장 두께
    WALL: 40,            // 건물 외벽(벽돌) 두께
    TOP_UI: 64,
    ROOF_H: 64,
    GROUND: 44,

    PARTITION: 8,        // 집과 복도 사이 칸막이 벽 두께
    DOOR_W: 30,
    DOOR_H: 92,
    DOOR_REACH: 44,      // 문에서 이 거리 안이면 노크/출입 가능
    ELEV_W: 64,
    ELEV_H: 104,
    ELEV_REACH: 30,      // 엘리베이터 중심에서 이 거리 안이면 호출 가능

    // ---- 이동 ----
    PLAYER_W: 26,
    PLAYER_SPEED: 200,   // px/초
    NPC_SPEED: 95,       // px/초
    MAX_DT: 50,

    // ---- 연출 시간 (ms) ----
    KNOCK_MS: 650,       // "똑똑"
    DOOR_MS: 260,        // 집 문 열림/닫힘
    SILENCE_MS: 1400,    // 인기척 없음
    DOORWAY_MS: 420,     // 내 집 문 드나들기
    ELEV_DOOR_MS: 340,   // 엘리베이터 문 열림/닫힘
    ELEV_BOARD_MS: 300,  // 타고 내리기
    ELEV_FLOOR_MS: 650,  // 한 층 이동

    KNOCK_LIMIT: 3,      // 하루에 같은 집을 이 횟수 이상 두드리면 아무도 나오지 않음

    FONT: '"Trebuchet MS", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',

    KEYS: {
      KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      Space: 'action', Enter: 'action',
      KeyG: 'debug',
    },

    PALETTE: {
      // 공통
      bg: '#0e0b0f',
      sky: '#2a1d24',
      silhouette: '#0b0a0c',
      brick: '#3a2026',
      brickLine: '#26141a',
      uiLight: '#f1d9cf',
      uiDim: '#7a6670',
      accent: '#e2584f',

      // 복도 / 문 / 엘리베이터
      hallway: '#3b2c34',
      hallwayTone: '#4d3a44',
      door: '#5b3a30',
      doorKnob: '#d9a441',
      shaft: '#1b1418',
      elevCar: '#6e5864',
      elevDoor: '#8f7d87',
      elevFrame: '#241a1f',

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
