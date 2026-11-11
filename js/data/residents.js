// residents.js — 집마다 사는 사람과 유사 소음 아이템, 문 앞 대사 (로직 없음)
// figure / item.shape는 silhouettes.js의 그리기 함수 이름.
// homeRatio: 집 안 평소 위치 (0 = 바깥 외벽 쪽, 1 = 복도 쪽)
//
// greet: 노크하면 플레이어 앞까지 나와서 하는 말 (지금은 임시 대사, 이후 Day별 증언으로 교체)
// refuse: 같은 날 다시 찾아왔을 때 나오지 않고 집 안에서 하는 말
(function (G) {
  'use strict';

  G.residents = {
    '301': {
      name: '301호 할아버지', figure: 'elder', homeRatio: 0.62,
      item: { name: '안마의자', shape: 'massageChair' },
      greet: '허허, 이 늦은 시간에 누군가 했네. (임시 대사)',
      refuse: '젊은이, 나 귀찮게 하지 말게.',
    },
    '302': {
      name: '302호 직장인', figure: 'worker', homeRatio: 0.6,
      item: { name: '러닝머신', shape: 'treadmill' },
      greet: '…네? 무슨 일이세요? (임시 대사)',
      refuse: '저 피곤해서요. 다음에 얘기해요.',
    },
    '201': {
      name: '나', figure: null,
      item: { name: '침대', shape: 'bed' },
    },
    '202': {
      name: '202호 가족', figure: 'motherKid', homeRatio: 0.55,
      item: { name: '아이 공', shape: 'ball' },
      greet: '어머, 옆집이시죠? 무슨 일로…? (임시 대사)',
      refuse: '애들 재우는 중이에요. 조용히 해 주세요.',
    },
    '101': {
      name: '101호 대학생', figure: 'student', homeRatio: 0.62,
      item: { name: '전자드럼', shape: 'drum' },
      greet: '…아, 윗집이시구나. (임시 대사)',
      refuse: '아까 다 말했잖아요. 계속 저 의심하는 거예요?',
    },
    '102': {
      name: '102호 부부', figure: 'couple', homeRatio: 0.58,
      item: { name: '드럼 세탁기', shape: 'washer' },
      greet: '네~ 누구세요? 아, 2층 분이시구나. (임시 대사)',
      refuse: '저희 지금 바빠서요. 나중에 오세요.',
    },
  };
})(window.Game = window.Game || {});
