// config.js — 숫자, 시간, 색, 키 설정
// 화면에 쓰는 색은 반드시 PALETTE에서만 가져온다. (DO NOT LOSE: 실루엣 + 팔레트)
(function (G) {
  'use strict';

  G.config = {
    // ---- 크기 (px) ----
    UNIT: 40,            // 구역 너비 단위 (building.js의 width × UNIT)
    FLOOR_H: 160,        // 한 층(방)의 높이
    SLAB: 14,            // 층 사이 바닥/천장 두께
    WALL: 40,            // 건물 외벽 두께
    TOP_UI: 64,
    ROOF_H: 0,           // 옥상 영역 (사용 안 함)
    GROUND: 44,
    DIALOG_H: 132,       // 게임 화면 아래 대화 영역 높이

    PILLAR_W: 6,         // 집과 복도 경계 표시(천장 기둥) 두께
    PILLAR_H: 26,
    KNOCK_REACH: 44,     // 경계에서 이 거리 안이면 노크 가능
    ELEV_W: 64,
    ELEV_H: 104,
    ELEV_REACH: 30,      // 엘리베이터 중심에서 이 거리 안이면 호출 가능
    BED_REACH: 36,       // 침대 중심에서 이 거리 안에 들어오면 "잠자리에 들까?"

    NOTEBOOK_ICON: { x: 34, y: 32, r: 18 },   // 상단 왼쪽 수첩 아이콘 (클릭 영역)

    // ---- 이동 ----
    PLAYER_W: 26,
    PLAYER_SPEED: 200,   // px/초
    NPC_SPEED: 95,       // px/초
    MAX_DT: 50,

    // ---- 연출 시간 (ms) ----
    KNOCK_STEP_MS: 160,  // 노크하러 경계까지 다가가는 시간
    KNOCK_MS: 900,       // "똑똑" 두드리는 동작
    SILENCE_MS: 1600,    // 인기척 없음
    ELEV_DOOR_MS: 340,
    ELEV_BOARD_MS: 300,
    ELEV_FLOOR_MS: 650,
    TOAST_MS: 1600,      // "수첩에 기록됨"
    EMOTE_MS: 1300,      // 감정 이펙트 기본 지속 시간

    NIGHT_FADE_MS: 700,  // 밤으로 어두워지기 / 아침으로 밝아지기
    NIGHT_CHAR_MS: 75,   // 소음 텍스트 한 글자
    NIGHT_HOLD_MS: 2600, // 텍스트를 다 보여준 뒤 기다리는 시간 (Space로 넘김 가능)
    NIGHT_TOSS_MS: 1100, // 이불 속에서 뒤척임
    SHAKE_MS: 260,
    SHAKE_PX: 5,

    KNOCK_LIMIT: 3,      // 하루에 같은 집을 이 횟수 이상 두드리면 아무도 나오지 않음
    START_WITH_INTRO: true, // 게임을 타이틀 + 인트로로 시작

    FONT: '"Trebuchet MS", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',

    KEYS: {
      KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      Space: 'action', Enter: 'action',
      Tab: 'notebook', Escape: 'close',
      KeyQ: 'tabPrev', KeyE: 'tabNext',
      KeyG: 'debug',
    },

    PALETTE: {
      // 공통
      bg: '#0e0b0f',
      silhouette: '#0b0a0c',
      wall: '#3a2026',       // 건물 외벽 (단색)
      uiLight: '#f1d9cf',
      uiDim: '#7a6670',
      accent: '#e2584f',

      // 복도 / 엘리베이터
      hallway: '#3b2c34',
      hallwayTone: '#4d3a44',
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

      // 밤
      nightHeavy: 'rgba(8,6,12,0.86)',  // 불 꺼진 집
      nightLight: 'rgba(8,6,12,0.5)',   // 내 집 (플레이어가 보이도록 덜 어둡게)
      lightOff: '#2a2228',              // 수첩: 용의자 제외한 집 창문

      // 디버그
      debugZone: 'rgba(120,255,160,0.25)',
      debugLine: 'rgba(255,255,255,0.5)',
      debugBg: 'rgba(0,0,0,0.75)',
    },
  };
})(window.Game = window.Game || {});
