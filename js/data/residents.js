// residents.js — 집마다 사는 사람, 유사 소음 아이템, 대사 (로직 없음)
// figure / item.shape는 silhouettes.js의 그리기 함수 이름.
// homeRatio: 집 안 평소 위치 (0 = 바깥 외벽 쪽, 1 = 복도 쪽)
//
// testimony[day]: 그날 노크하면 플레이어 앞까지 나와서 하는 증언
//   lines: 대화창에 한 줄씩 나오는 대사 (Space로 넘김)
//   note : 수첩에 자동으로 기록되는 한 줄 요약
//   ※ 302호(범인)는 거짓말을 한다.
// idle  : 그날 증언이 아직 없을 때 하는 말 (수첩에 기록되지 않음)
// refuse: 같은 날 다시 찾아왔을 때 나오지 않고 집 안에서 하는 말
(function (G) {
  'use strict';

  G.residents = {
    '301': {
      name: '301호 할아버지', figure: 'elder', homeRatio: 0.62,
      item: { name: '안마의자', shape: 'massageChair' },
      testimony: {
        1: {
          lines: ['허허, 이 아침에 무슨 일인가?',
                  '시끄러운 소리? 글쎄… 나는 밤마다 안마의자에 좀 앉아 있지.',
                  '나이 들면 허리가 영 시원찮아서 말이야.'],
          note: '밤마다 안마의자를 씀.',
        },
      },
      idle: '오늘은 별일 없구먼.',
      refuse: '젊은이, 나 귀찮게 하지 말게.',
    },
    '302': {
      name: '302호 직장인', figure: 'worker', homeRatio: 0.6,
      item: { name: '러닝머신', shape: 'treadmill' },
      testimony: {
        1: {
          lines: ['…네? 무슨 일이세요?',
                  '어젯밤이요? 저 야근하고 새벽 1시에 들어왔어요.',
                  '11시엔 집에 없었어요. 저도 피곤해서요.'],
          note: '어젯밤 새벽 1시 귀가. 11시엔 집에 없었다고 함.',   // 거짓말
        },
      },
      idle: '출근 준비 중이라서요.',
      refuse: '저 피곤해서요. 다음에 얘기해요.',
    },
    '201': {
      name: '나', figure: null,
      item: { name: '침대', shape: 'bed' },
    },
    '202': {
      name: '202호 가족', figure: 'motherKid', homeRatio: 0.55,
      item: { name: '아이 공', shape: 'ball' },
      testimony: {
        1: {
          lines: ['어머, 옆집이시구나.',
                  '혹시 우리 애들 때문에 오셨어요? 우리 애들은 밤 9시 전에 재워요.',
                  '공놀이도 낮에만 하게 해요. 밤엔 절대 안 해요.'],
          note: '아이들은 밤 9시 전에 잠. 공놀이는 낮에만.',
        },
      },
      idle: '애들 밥 먹이는 중이라 정신이 없네요.',
      refuse: '애들 재우는 중이에요. 조용히 해 주세요.',
    },
    '101': {
      name: '101호 대학생', figure: 'student', homeRatio: 0.62,
      item: { name: '전자드럼', shape: 'drum' },
      testimony: {
        1: {
          lines: ['…아, 201호 분이시죠? 마침 잘 오셨네요.',
                  '어젯밤 11시쯤 천장에서 쿵쿵 소리가 계속 났어요.',
                  '201호가 바로 위잖아요. 혹시… 그쪽 집 아니에요?'],
          note: '어젯밤 11시쯤 천장에서 쿵쿵. 나(201호)를 의심함.',
        },
      },
      idle: '과제 중이라 바빠요.',
      refuse: '아까 다 말했잖아요. 계속 저 의심하는 거예요?',
    },
    '102': {
      name: '102호 부부', figure: 'couple', homeRatio: 0.58,
      item: { name: '드럼 세탁기', shape: 'washer' },
      testimony: {
        1: {
          lines: ['네~ 2층 분이시죠?',
                  '어젯밤이요? 아, 저희 세탁기 돌렸어요.',
                  '탈수할 때 좀 시끄럽죠? 죄송해요~'],
          note: '어젯밤 세탁기를 돌림. 탈수할 때 시끄러움.',
        },
      },
      idle: '오늘은 들을 얘기가 없네요~',
      refuse: '저희 지금 바빠서요. 나중에 오세요.',
    },
  };
})(window.Game = window.Game || {});
