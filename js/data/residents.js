// residents.js — 집마다 사는 사람과 유사 소음 아이템 (로직 없음)
// figure / item.shape는 render.js의 실루엣 그리기 함수 이름.
// 이후 단계에서 여기에 증언(testimony), 소음 특징(noise), 범인 여부 등을 추가한다.
(function (G) {
  'use strict';

  G.residents = {
    '301': { name: '301호 할아버지', figure: 'elder', item: { name: '안마의자', shape: 'massageChair' } },
    '302': { name: '302호 직장인', figure: 'worker', item: { name: '러닝머신', shape: 'treadmill' } },
    '201': { name: '나', figure: null, item: { name: '침대', shape: 'bed' } },
    '202': { name: '202호 가족', figure: 'motherKid', item: { name: '아이 공', shape: 'ball' } },
    '101': { name: '101호 대학생', figure: 'student', item: { name: '전자드럼', shape: 'drum' } },
    '102': { name: '102호 부부', figure: 'couple', item: { name: '드럼 세탁기', shape: 'washer' } },
  };
})(window.Game = window.Game || {});
