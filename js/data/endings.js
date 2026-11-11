// endings.js — 엔딩 컷신 대본 (cutscene.js 형식)
// 지목한 집에 따라 대본을 만든다. 정답은 G.culprit(302호).
//
//   goto   : 플레이어를 그 집 경계 앞으로, 이웃을 플레이어 앞으로
//   say    : who: 'me' | 'narration' | 집 호수
//   night  : 엔딩용 밤 (record: false → 수첩에 기록하지 않음)
//   ending : 엔딩 카드
//   restart: 타이틀로
(function (G) {
  'use strict';

  function caught(state) {
    const n = state.log.filter(function (e) { return e.type === 'testimony'; }).length;
    return [
      { type: 'goto', houseId: '302' },
      { type: 'say', who: 'me', lines: ['302호, 밤마다 쿵쿵대는 거… 러닝머신이죠?'],
        emote: { target: 'player', type: 'anger', gesture: 'tremble', ms: 1600 } },
      { type: 'say', who: '302', lines: ['…네? 아, 아니 그게…'],
        emote: { target: '302', type: 'surprise', gesture: 'jump', ms: 1400 } },
      { type: 'say', who: 'me', lines: [
        '매일 새벽에 들어온다면서요. 그런데 밤 11시에 운동복 입은 모습을 본 분이 있어요.',
        '분리수거장 러닝머신 박스 송장에도 302호라고 적혀 있었고요.'] },
      { type: 'say', who: '302', lines: [
        '…죄송합니다.',
        '야근하고 오면 그 시간밖에 운동할 시간이 없어서…',
        '대각선 집까지 울릴 줄은 몰랐어요. 오늘 바로 매트 깔고, 밤에는 안 뛸게요.'],
        emote: { target: '302', type: 'sweat', gesture: 'slump', ms: 2400 } },
      { type: 'say', who: 'me', lines: ['…네. 부탁드릴게요.'] },
      { type: 'night', n: 'quiet', record: false },
      { type: 'say', who: 'narration', lines: ['그날 밤, 처음으로 아무 소리도 들리지 않았다.'] },
      { type: 'morning' },
      { type: 'say', who: 'me', lines: ['…오랜만에 푹 잤다.'] },
      { type: 'ending', good: true, title: '해결 — 조용한 밤',
        body: ['DAY ' + state.day + '에 소음의 주인을 찾아냈다.', '모은 증언 ' + n + '개',
               '이웃들과도 다시 인사를 나누게 되었다.'] },
      { type: 'restart' },
    ];
  }

  function wrong(state, id) {
    return [
      { type: 'goto', houseId: id },
      { type: 'say', who: 'me', lines: [id + '호, 밤마다 쿵쿵대는 거 그쪽이죠?'],
        emote: { target: 'player', type: 'anger', gesture: 'tremble', ms: 1600 } },
      { type: 'say', who: id, lines: G.residents[id].accused,
        emote: { target: id, type: 'anger2', gesture: 'tremble', ms: 3000 } },
      { type: 'say', who: 'me', lines: ['…어? 아니, 그게…'],
        emote: { target: 'player', type: 'sweat', gesture: 'slump', ms: 2000 } },
      { type: 'night', n: 'wrong', record: false },
      { type: 'say', who: 'narration', lines: ['소음은 그날 밤도 계속되었다.', '이웃들은 더 이상 201호와 말을 섞지 않았다.'] },
      { type: 'ending', good: false, title: '오해 — 소음은 계속된다',
        body: [id + '호는 범인이 아니었다.', '진짜 소음의 주인은 끝내 밝혀지지 않았다.', '수첩을 다시 떠올려 보자.'] },
      { type: 'restart' },
    ];
  }

  G.endings = {
    build: function (state, id) { return id === G.culprit ? caught(state) : wrong(state, id); },
  };
})(window.Game = window.Game || {});
