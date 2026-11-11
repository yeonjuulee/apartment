// intro.js — 인트로 컷신 대본 (로직 없음)
// cutscene.js가 위에서부터 한 단계씩 실행한다. 엔딩도 같은 형식으로 만들 수 있다.
//
//   title   : 타이틀 화면 (Space 시작 / Esc 인트로 건너뛰기)
//   night   : 밤 소음 연출 (dayflow의 밤을 그대로 사용). 텍스트가 끝나면 Space로 다음
//   say     : 대화 영역에 대사. who: 'me'(나) | 'narration'(이름 없음)
//             emote: 대사가 시작될 때 띄울 감정 이펙트 { target, type, gesture, ms }
//   morning : 아침으로 밝아짐 (Day 1 시작 위치로)
//   note    : 바닥에 쪽지 → 플레이어가 쪽지 앞으로 걸어감 → 쪽지 클로즈업
//   goal    : 목표 안내 카드
(function (G) {
  'use strict';

  G.intro = [
    { type: 'title' },

    { type: 'night', n: 1 },
    { type: 'say', who: 'narration', lines: ['며칠째 같은 소리가 반복되고 있다.'] },
    { type: 'say', who: 'me', lines: ['잠도 못 자고…'],
      emote: { target: 'player', type: 'sweat', gesture: 'slump', ms: 1800 } },
    { type: 'say', who: 'me', lines: ['아 진짜… 누구야!'],
      emote: { target: 'player', type: 'anger2', gesture: 'tremble', ms: 2600 } },

    { type: 'morning' },
    { type: 'note', from: '101',
      lines: ['밤마다 쿵쿵대는 거, 201호 맞죠?',
              '며칠째 잠을 한숨도 못 자고 있어요.',
              '조심 좀 해 주세요.'] },
    { type: 'say', who: 'me', lines: ['…뭐? 나 아닌데?!'],
      emote: { target: 'player', type: 'surprise', gesture: 'jump', ms: 1400 } },
    { type: 'say', who: 'me', lines: ['나도 며칠째 못 자고 있다고…', '좋아. 진짜 범인, 내가 찾는다.'],
      emote: { target: 'player', type: 'anger', gesture: 'tremble', ms: 1800 } },

    { type: 'goal',
      title: '5일 안에, 소음이 나는 진짜 집을 찾아라',
      rules: ['이웃은 하루에 한 번만 이야기해 준다',
              '범인은 거짓말을 한다',
              '들은 이야기는 수첩에 남는다 (Tab)',
              '침대로 가면 하루가 끝난다',
              'Day 5 밤까지 범인을 지목해야 한다. 틀리면 그대로 끝'] },
  ];
})(window.Game = window.Game || {});
