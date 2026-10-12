// 밸런스 봇: 레벨 곡선에 맞춘 지우개(AI 조작, 조준 오차 포함)로 스테이지를 자동 플레이
import { Battle } from '../js/battle.js';
import { getStage, computeStats, skillsFor, newEraser } from '../js/rpg.js';
import { defaultSave } from '../js/save.js';
const N = +process.argv[2] || 6, AIM = +process.argv[3] || 0.7;
function run(stage, lv, seed, id = 'malrangi') {
    const mk = (bid) => { const i = newEraser(bid, 'x' + bid); i.level = lv; i.pts.hp = Math.floor((lv - 1) * 0.6); i.pts.atk = Math.floor((lv - 1) * 0.8); return { inst: i, stats: computeStats(i, null), skills: skillsFor(i) }; };
  const party = [mk(id)];
  if (stage.ch >= 2) party.push(mk('bignemo'));
  if (stage.ch >= 3) party.push(mk('half'));
  const b = new Battle({ stage, party, enemies: stage.enemies, diff: 'normal', cushion: true, seed, headless: true, humanTeams: [] });
  b.world.bodies.filter((x) => x.team === 0).forEach((x) => { x.aim = AIM; });
  let g = 0; while (!b.over && g++ < 60 * 400) b.update(1 / 60);
  return { win: b.over === 'win', turns: b.turnNo };
}
const lvFor = (st) => st.ch === 0 ? 1 : Math.max(1, Math.round(st.lv * 0.95));
for (let ch = 1; ch <= 6; ch++) {
  const row = [];
  for (const i of [1, 4, 8, 9, 10]) {
    const st = getStage(ch, i); let w = 0, t = 0;
    for (let k = 0; k < N; k++) { const r = run(st, lvFor(st), 100 + k * 7 + i); if (r.win) w++; t += r.turns; }
    row.push(`${i}:${Math.round((w / N) * 100)}%/${(t / N).toFixed(0)}t`);
  }
  console.log('CH' + ch, row.join('  '));
}
