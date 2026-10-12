// 게임 로직 테스트 (브라우저 없이 Node에서 실행): npm test
import assert from 'node:assert';
import { Battle } from '../js/battle.js';
import { getStage, stageList, computeStats, skillsFor, newEraser, gachaRoll, GACHA, makeRogueStage, expNeed, addExp } from '../js/rpg.js';
import { defaultSave, exportCode, importCode, migrate } from '../js/save.js';
import { mulberry32, makeWorld, makeBody, step, launch, isSettled } from '../js/physics.js';
import { CHAPTERS, ERASERS, ENEMIES, SKILLS, GACHA_POOLS, ACHIEVEMENTS } from '../js/data.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ✔', name); };

ok('데이터 무결성: 참조 ID가 모두 존재', () => {
  for (const [id, e] of Object.entries(ERASERS)) { for (const s of e.skills) assert(SKILLS[s], `${id} → skill ${s}`); }
  for (const pool of Object.values(GACHA_POOLS)) for (const id of pool) assert(ERASERS[id]);
  for (const C of CHAPTERS) { for (const k of ['boss', 'mid']) if (C[k]) assert(ENEMIES[C[k]], C[k]); (C.pool || []).forEach((e) => assert(ENEMIES[e], e)); }
  for (const a of ACHIEVEMENTS) if (a.reward.eraser) assert(ERASERS[a.reward.eraser]);
  for (const e of Object.values(ENEMIES)) if (e.summon) assert(ENEMIES[e.summon]);
});

ok('물리: 같은 시드/입력이면 결과가 결정론적', () => {
  const run = () => {
    const w = makeWorld(); const a = makeBody({ id: 1, x: 100, y: 200 }), b = makeBody({ id: 2, team: 1, x: 300, y: 205 });
    w.bodies.push(a, b); launch(a, 1, 0, 800, 0.5);
    let i = 0; while (!isSettled(w) && i++ < 3000) step(w);
    return [a.x, a.y, b.x, b.y, i].map((v) => v.toFixed(6)).join();
  };
  assert.strictEqual(run(), run());
});

ok('물리: 책상 밖으로 나가면 낙사 이벤트', () => {
  const w = makeWorld(); const a = makeBody({ id: 1, x: 700, y: 200 }); w.bodies.push(a); launch(a, 1, 0, 900);
  let fell = false, i = 0; while (!isSettled(w) && i++ < 3000) { step(w); if (w.events.some((e) => e.type === 'fall')) fell = true; w.events.length = 0; }
  assert(fell);
});

ok('모든 스테이지가 끝까지 진행됨 (무한루프 없음)', () => {
  const mk = (id, lv) => { const i = newEraser(id, 'x' + id); i.level = lv; return { inst: i, stats: computeStats(i, null), skills: skillsFor(i) }; };
  for (const C of CHAPTERS) {
    for (const st of stageList(C.id)) {
      const party = [mk('malrangi', st.lv), mk('bignemo', st.lv)];
      const b = new Battle({ stage: st, party, enemies: st.enemies, diff: 'normal', cushion: true, seed: 7 + st.idx, headless: true, humanTeams: [] });
      let g = 0; while (!b.over && g++ < 60 * 600) b.update(1 / 60);
      assert(b.over, `stage ${st.id} did not finish`);
    }
  }
});

ok('무한 책상 방 생성 (보스 방 포함)', () => {
  for (let r = 1; r <= 40; r++) { const s = makeRogueStage(r, 9); assert(s.enemies.length >= 1); for (const e of s.enemies) assert(ENEMIES[e.id], e.id); }
});

ok('뽑기 확률이 공개 확률과 일치 (10만 회)', () => {
  const rng = mulberry32(2024), sv = defaultSave(), cnt = {};
  for (let i = 0; i < 100000; i++) { const r = gachaRoll('normal', sv, rng); cnt[r.rar] = (cnt[r.rar] || 0) + 1; }
  assert(Math.abs(cnt.N / 1000 - 70) < 1.5 && Math.abs(cnt.R / 1000 - 25) < 1.5 && Math.abs(cnt.SR / 1000 - 5) < 1);
  const c2 = {}; for (let i = 0; i < 100000; i++) { const r = gachaRoll('premium', sv, rng); c2[r.rar] = (c2[r.rar] || 0) + 1; }
  assert(c2.SSR / 1000 >= 3 && c2.SSR / 1000 < 4.5, 'SSR rate ' + c2.SSR / 1000);
});

ok('고급 뽑기 50회 천장: 50회 안에 SSR 확정', () => {
  const sv = defaultSave(), rng = mulberry32(1);
  for (let t = 0; t < 200; t++) { sv.gacha.pity_premium = 0; let got = false; for (let i = 0; i < 50; i++) if (gachaRoll('premium', sv, rng).rar === 'SSR') { got = true; break; } assert(got); }
});

ok('세이브 내보내기/가져오기 왕복, 마이그레이션', () => {
  const s = defaultSave(); s.coin = 1234; s.erasers[0].nick = '말랑★';
  const s2 = importCode(exportCode(s)); assert.strictEqual(s2.coin, 1234); assert.strictEqual(s2.erasers[0].nick, '말랑★');
  const old = { ...defaultSave(), version: 1 }; delete old.meta.grad; assert.strictEqual(migrate(old).version, 2);
  assert.throws(() => importCode('!!!'));
  assert.throws(() => importCode(btoa('{"a":1}')));
});

ok('레벨업 곡선', () => {
  const e = newEraser('malrangi'); addExp(e, expNeed(1) + expNeed(2)); assert.strictEqual(e.level, 3); assert.strictEqual(e.free, 4);
  const s1 = computeStats(newEraser('malrangi'), null); e.level = 30; assert(computeStats(e, null).hp > s1.hp * 2);
});

console.log(`\n${n}개 테스트 통과`);
