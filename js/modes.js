// 특수 모드: 무한 책상(로그라이크), 친구 대결(핫시트), 고스트 대결
import { G, acts, screens, $, esc, modal, confirmBox, toast, go, save, renderTop, getInst } from './state.js';
import { ERASERS, RARITY, PASSIVES } from './data.js';
import { computeStats, skillsFor, newEraser, makeRogueStage, getStage, addExp, grantEraser } from './rpg.js';
import { startBattle, partyFromSave, leave } from './fight.js';
import { sfx } from './audio.js';
import { mulberry32 } from './physics.js';

// ================= 무한 책상 =================
const UPG = { hp: ['체력 단련', '시작 HP +4%/Lv', 4], atk: ['공격 단련', '공격 +4%/Lv', 4], coin: ['짠돌이', '코인 +8%/Lv', 8] };
const upCost = (lv) => 6 + lv * 6;
let run = null;

screens.rogue = (root) => {
  const s = G.save, m = s.meta;
  root.innerHTML = `<div class="rogue"><button class="back" data-go="home">◀ 홈</button><h2>♾️ 무한 책상</h2>
    <p class="mut">한 번 쓰러지면 끝! 방을 하나씩 돌파하며 강화 카드를 모으세요. 10번째 방마다 보스가 나타나요.</p>
    <div class="card"><div class="statlist"><div><span>최고 기록</span><b>${s.stats.rogueBest}방</b></div><div><span>🎓 졸업 점수</span><b>${m.grad}</b></div></div></div>
    ${run ? `<button class="btn big pri" data-act="rogueResume">▶ 진행 중인 런 이어하기 (${run.room}번째 방)</button>` : ''}
    <section class="card"><h3>새 도전</h3><p class="mut small">참가할 지우개 한 마리를 고르세요.</p>
      <div class="egrid">${s.erasers.map((e) => { const b = ERASERS[e.baseId]; return `<button class="ecard r-${b.rar}" data-act="rogueStart" data-uid="${e.uid}"><div class="eface" style="--c:${b.color};width:58px;height:44px;font-size:32px">${b.emoji}</div><b>${esc(e.nick || b.name)}</b><small>Lv.${e.level}</small></button>`; }).join('')}</div></section>
    <section class="card"><h3>🎓 졸업 점수 강화</h3>${Object.entries(UPG).map(([k, [n, d]]) => { const lv = m.gradUp[k] || 0; return `<div class="mission"><div><b>${n} Lv.${lv}/10</b><br><small class="mut">${d}</small></div><button class="btn sm ${m.grad >= upCost(lv) && lv < 10 ? 'pri' : ''}" data-act="gradUp" data-k="${k}">${lv >= 10 ? 'MAX' : '🎓 ' + upCost(lv)}</button></div>`; }).join('')}</section></div>`;
};
acts.gradUp = (d) => {
  const m = G.save.meta, lv = m.gradUp[d.k] || 0;
  if (lv >= 10) return;
  if (m.grad < upCost(lv)) return toast('졸업 점수가 부족해요');
  m.grad -= upCost(lv); m.gradUp[d.k] = lv + 1; save(); sfx.coin(); go('rogue');
};
acts.rogueStart = (d) => {
  run = { uid: d.uid, room: 1, hp: null, bonus: { hp: 0, atk: 0, def: 0, crit: 0, spd: 0 }, relics: [], seed: (Math.random() * 1e6) | 0, coin: 0 };
  rogueRoom();
};
acts.rogueResume = () => rogueRoom();

function metaBonus() {
  const u = G.save.meta.gradUp;
  return { hp: (u.hp || 0) * 0.04, atk: (u.atk || 0) * 0.04 };
}
function rogueRoom() {
  const s = G.save;
  const party = partyFromSave([run.uid]);
  const mb = metaBonus();
  const bonus = { hp: run.bonus.hp + mb.hp, atk: run.bonus.atk + mb.atk, def: run.bonus.def, crit: run.bonus.crit, spd: run.bonus.spd };
  const stage = makeRogueStage(run.room, run.seed);
  if (run.hp != null) party[0].hp = run.hp;
  const diff = s.settings.diff || 'normal';
  startBattle({
    mode: 'rogue', stage, party, bonus, diff, after: 'rogue',
    restart: () => rogueRoom(),
    onEnd: async (res, out, battle) => {
      const me = battle.world.bodies.find((b) => b.team === 0);
      if (res === 'win') {
        const mult = 1 + (s.meta.gradUp.coin || 0) * 0.08;
        const c = Math.round(stage.reward.coin * mult); s.coin += c - stage.reward.coin;
        run.coin += c;
        run.hp = Math.max(1, me.hp);
        if (run.relics.includes('snack')) run.hp = Math.min(me.maxhp, run.hp + Math.round(me.maxhp * 0.06));
        s.stats.rogueBest = Math.max(s.stats.rogueBest, run.room);
        save(); renderTop();
        if (run.room % 5 === 0) { run.hp = Math.min(me.maxhp, run.hp + Math.round(me.maxhp * 0.4)); toast('☕ 휴식! HP 40% 회복'); }
        await pickCard(me.maxhp);
        run.room++;
        leave('rogue'); // 뷰 정리
        const cont = await modal(`<h3>🎉 ${run.room - 1}번째 방 돌파!</h3><p>코인 🪙+${c} · 누적 ${run.coin}</p><p class="mut small">다음 방: ${run.room % 10 === 0 ? '👑 보스 방' : '일반 방'}</p>`, [{ label: '여기서 정산', val: 'end' }, { label: '다음 방 ▶', val: 'go', cls: 'pri' }]);
        if (cont === 'go') rogueRoom(); else rogueEnd(false);
      } else {
        leave('rogue');
        rogueEnd(true);
      }
    },
  });
}
async function pickCard(maxhp) {
  const pool = [
    { id: 'hp', t: '💖 체력 강화', d: '최대 HP +15% 그리고 20% 회복', f: () => { run.bonus.hp += 0.15; run.hp = Math.min(Math.round(maxhp * 1.15), run.hp + Math.round(maxhp * 0.2)); } },
    { id: 'atk', t: '⚔️ 공격 강화', d: '공격력 +12%', f: () => { run.bonus.atk += 0.12; } },
    { id: 'def', t: '🛡️ 방어 강화', d: '방어력 +3', f: () => { run.bonus.def += 3; } },
    { id: 'crit', t: '✨ 날카로운 모서리', d: '치명타 확률 +8%', f: () => { run.bonus.crit += 8; } },
    { id: 'spd', t: '💨 날쌘 손', d: '민첩 +3 (추가 턴 확률↑)', f: () => { run.bonus.spd += 3; } },
    { id: 'heal', t: '🍙 몰래 가져온 간식', d: 'HP 40% 즉시 회복', f: () => { run.hp = Math.min(maxhp, run.hp + Math.round(maxhp * 0.4)); } },
    { id: 'snack', t: '🍬 쉬는 시간 간식', d: '방 클리어마다 HP 6% 회복 (유물)', f: () => { run.relics.push('snack'); }, once: true },
  ].filter((c) => !(c.once && run.relics.includes(c.id)));
  const rng = mulberry32(run.seed + run.room * 13);
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const r = await modal(`<h3>🎁 보상 카드를 고르세요</h3><div class="cards">${picks.map((c, i) => `<button class="rcard" data-pick="${i}"><b>${c.t}</b><small>${c.d}</small></button>`).join('')}</div>`, [], {
    onOpen: (w) => w.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => { sfx.coin(); w.closeWith(+b.dataset.pick); }),
  });
  picks[r].f();
}
async function rogueEnd(died) {
  const s = G.save;
  const rooms = died ? run.room - 1 : run.room - 1;
  const grad = Math.round(rooms * 2.5 + (rooms >= 10 ? 10 : 0));
  s.meta.grad += grad; save();
  const html = `<h3>${died ? '😵 쓰러졌어요...' : '🏁 정산'}</h3><p><b>${rooms}번째 방</b>까지 도달!</p><p>🎓 졸업 점수 +${grad}<br>🪙 누적 코인 ${run.coin}</p>${rooms > 0 && rooms === s.stats.rogueBest ? '<p class="drop">🏆 최고 기록 갱신!</p>' : ''}`;
  run = null;
  await modal(html);
  go('rogue');
}

// ================= 친구 대결 / 고스트 =================
let duel = { p1: null, p2: null, pure: true };
function pureBuild(baseId, lv = 20) {
  const inst = newEraser(baseId, 'pure_' + baseId);
  inst.level = lv;
  const stats = computeStats(inst, null);
  return { inst, stats, skills: skillsFor(inst), name: ERASERS[baseId].name, baseId };
}
function realBuild(uid) {
  const inst = getInst(uid);
  return { inst, stats: computeStats(inst, G.save), skills: skillsFor(inst), name: inst.nick || ERASERS[inst.baseId].name, baseId: inst.baseId };
}
function duelStage(seed) {
  const st = makeRogueStage(2, seed);
  st.enemies = []; st.title = '친구 대결'; st.reward = { exp: 0, coin: 0, chalk: 0 }; st.hints = null; st.boss = false;
  return st;
}

screens.duel = (root) => {
  const s = G.save;
  if (!duel.p1 || !getInst(duel.p1)) duel.p1 = s.party[0];
  if (!duel.p2 || !getInst(duel.p2)) duel.p2 = s.erasers[s.erasers.length - 1].uid;
  const opts = (sel) => s.erasers.map((e) => `<option value="${e.uid}" ${e.uid === sel ? 'selected' : ''}>${ERASERS[e.baseId].emoji} ${esc(e.nick || ERASERS[e.baseId].name)} Lv.${e.level}</option>`).join('');
  root.innerHTML = `<div class="duel"><button class="back" data-go="home">◀ 홈</button><h2>🤝 친구 대결</h2>
    <p class="mut">한 화면에서 번갈아 튕기는 진짜 "지우개 따먹기"! 친구와 쉬는 시간에 한 판 어때요?</p>
    <section class="card"><div class="vs"><div><b>🔵 1P</b><select id="d1" class="inp">${opts(duel.p1)}</select></div><span>VS</span><div><b>🔴 2P</b><select id="d2" class="inp">${opts(duel.p2)}</select></div></div>
      <label class="sw"><span>순수 규칙 (둘 다 Lv.20 · 장비 없음)</span><input type="checkbox" id="dpure" ${duel.pure ? 'checked' : ''}><i></i></label>
      <button class="btn big pri" data-act="duelGo">⚔️ 대결 시작</button></section>
    <section class="card"><h3>👻 고스트 대결</h3><p class="mut small">내 지우개의 "고스트 코드"를 친구에게 보내면, 친구가 AI가 된 내 지우개와 싸워요.</p>
      <div class="row-btns"><button class="btn" data-act="ghostCopy">내 고스트 코드 복사</button><button class="btn" data-act="ghostPlay">코드로 대결</button></div></section></div>`;
  $('#d1').onchange = (e) => { duel.p1 = e.target.value; };
  $('#d2').onchange = (e) => { duel.p2 = e.target.value; };
  $('#dpure').onchange = (e) => { duel.pure = e.target.checked; };
};
acts.duelGo = () => {
  const mk = duel.pure ? (u) => pureBuild(getInst(u).baseId) : realBuild;
  const a = mk(duel.p1), b = mk(duel.p2);
  const seed = (Math.random() * 1e6) | 0;
  const stage = duelStage(seed);
  const run1 = () => startBattle({
    mode: 'duel', stage, party: [a], enemies: [{ x: 640, y: 225, build: { name: b.name, baseId: b.baseId, stats: b.stats, skills: b.skills } }],
    humanTeams: [0, 1], diff: 'normal', after: 'duel', restart: () => acts.duelGo(),
  });
  run1();
  if (G.battle) G.battle.settings = { ...G.save.settings, guide: G.save.settings.guide === 'hard' ? 'normal' : G.save.settings.guide };
};

function encodeGhost(inst) {
  return btoa(JSON.stringify({ b: inst.baseId, l: inst.level, s: inst.star, p: inst.pts, n: inst.nick || '' }));
}
function decodeGhost(code) {
  const o = JSON.parse(atob(code.trim()));
  if (!ERASERS[o.b]) throw new Error('알 수 없는 지우개');
  const inst = newEraser(o.b, 'ghost');
  inst.level = Math.max(1, Math.min(50, o.l | 0)); inst.star = Math.max(0, Math.min(5, o.s | 0));
  for (const k of ['hp', 'atk', 'def', 'spd']) inst.pts[k] = Math.max(0, Math.min(200, (o.p && o.p[k]) | 0));
  inst.nick = String(o.n || '').slice(0, 8);
  return inst;
}
acts.ghostCopy = async () => {
  const code = encodeGhost(getInst(duel.p1));
  try { await navigator.clipboard.writeText(code); toast('📋 고스트 코드를 복사했어요'); }
  catch (e) { await modal(`<h3>고스트 코드</h3><textarea class="inp" rows="4" readonly onclick="this.select()">${code}</textarea>`); }
};
acts.ghostPlay = () => {
  const root = $('#modal-root');
  const w = document.createElement('div'); w.className = 'modal-wrap';
  w.innerHTML = `<div class="modal"><div class="modal-body"><h3>고스트 코드 입력</h3><textarea id="gc" class="inp" rows="4" placeholder="친구에게 받은 코드를 붙여넣으세요"></textarea></div><div class="modal-btns"><button class="btn" id="g-c">취소</button><button class="btn pri" id="g-o">대결!</button></div></div>`;
  root.appendChild(w);
  w.querySelector('#g-c').onclick = () => w.remove();
  w.querySelector('#g-o').onclick = () => {
    try {
      const inst = decodeGhost(w.querySelector('#gc').value);
      w.remove();
      const stats = computeStats(inst, null), skills = skillsFor(inst);
      const party = partyFromSave([duel.p1]);
      const stage = duelStage((Math.random() * 1e6) | 0);
      startBattle({
        mode: 'ghost', stage, party, enemies: [{ x: 640, y: 225, aim: 0.85, build: { name: '👻 ' + (inst.nick || ERASERS[inst.baseId].name), baseId: inst.baseId, stats, skills } }],
        diff: G.save.settings.diff || 'normal', humanTeams: [0], after: 'duel', restart: () => acts.ghostPlay(),
      });
    } catch (e) { toast('❌ 올바르지 않은 코드예요'); }
  };
};
// URL 해시로 고스트 공유: #ghost=코드
export function ghostFromHash() {
  const m = location.hash.match(/ghost=([^&]+)/);
  if (!m) return null;
  try { return decodeGhost(decodeURIComponent(m[1])); } catch (e) { return null; }
}
