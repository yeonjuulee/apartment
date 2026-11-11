// run-node.js — 터미널에서 테스트 실행: node tests/run-node.js
// 브라우저 없이 로직 파일(설정·데이터·월드·상태·업데이트)만 불러와 검사한다.
// 렌더링 관련 테스트는 브라우저(test.html)에서만 실행된다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
  'js/config.js',
  'js/data/building.js',
  'js/data/residents.js',
  'js/util.js',
  'js/world.js',
  'js/state.js',
  'js/systems/npcs.js',
  'js/systems/doorway.js',
  'js/systems/visit.js',
  'js/systems/elevator.js',
  'js/update.js',
  'js/layout.js',
  'js/silhouettes.js',
  'tests/tests.js',
];

const context = { console: console };
context.window = context;
vm.createContext(context);
files.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), context, { filename: f });
});

const results = context.Game.runTests();
let failed = 0;
results.forEach(function (r) {
  console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.error));
  if (!r.ok) failed++;
});
console.log('\n' + (results.length - failed) + ' / ' + results.length + ' 통과 (렌더링 테스트 2개는 브라우저에서만 검사)');
process.exit(failed ? 1 : 0);
