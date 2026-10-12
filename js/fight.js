// 전투 시작/HUD/결과 처리
import { G, $, esc, modal, toast, save, go, bump, addReward, rewardText, getInst, confirmBox } from './state.js';
import { Battle } from './battle.js';
import { BattleView } from './render.js';
import { SKILLS, ENEMIES, ERASERS, RARITY, CHAPTERS, ACHIEVEMENTS, TIPS } from './data.js';
import { computeStats, skillsFor, addExp, expNeed, rollEquipment, getStage, MAX_LV, newEraser, grantEraser } from './rpg.js';
import { sfx, startBgm, stopBgm, vibrate } from './audio.js';
import { mulberry32 } from './physics.js';

let hud = null;

export function partyFromSave(uids) {
  return uids.map((u) => G.save.erasers.find((e) => e.uid === u)).filter(Boolean).map((inst) => ({
    inst, stats: computeStats(inst, G.save), skills: skillsFor(inst),
  }));
}

/**
 * opts: { stage, party, enemies?, mode:'story'|'rogue'|'duel'|'ghost', diff, humanTeams, bonus, onEnd(res) }
 */
export function startBattle(opts) {
  const s = G.save;
  const stage = opts.stage;
  const cfg = {
    stage, party: opts.party, enemies: opts.enemies || stage.enemies, diff: opts.diff || 'normal',
    seed: (Math.random() * 1e9) | 0, humanTeams: opts.humanTeams || [0], settings: s.settings,
    cushion: (opts.mode === 'story' || opts.mode === 'rogue') && ['easy', 'normal'].includes(opts.diff || 'normal'),
    bonus: opts.bonus, afterQuit: opts.after, speedFirst: opts.mode === 'story' && stage.ch > 0, dda: s.settings.dda && opts.mode === 'story' ? (G.lossStreak >= 3 ? -1 : 0) : 0,
    onKill: (b) => {
      if (b.enemyId) s.dex.enemies[b.enemyId] = (s.dex.enemies[b.enemyId] || 0) + 1;
    },
  };
  const battle = new Battle(cfg);
  G.battle = battle;
  $('#main-ui').hidden = true; $('#battle').hidden = false;
  buildHud(battle, opts);
  const cv = $('#cv');
  G.view = new BattleView(cv, battle, { onTick: updateHud });
  stopBgm();
  startBgm();
  // 튜토리얼 힌트
  if (stage.hints) showHint(stage.hints[0]);
  let hintN = 0;
  battle.on((e) => {
    if (e.type === 'turn' && stage.hints && e.team === 0 && !e.first) { hintN++; if (stage.hints[hintN]) showHint(stage.hints[hintN]); }
    if (e.type === 'end') setTimeout(() => finish(battle, opts), e.result === 'win' ? 900 : 1100);
  });
}

function showHint(text) {
  const h = $('#hint');
  if (!h) return;
  h.textContent = '💡 ' + text; h.classList.add('show');
  clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove('show'), 6000);
}

function buildHud(battle, opts) {
  const el = $('#hud');
  const st = battle.stage;
  el.innerHTML = `
    <div class="hud-top">
      <button class="icon-btn" data-act="pause" aria-label="일시정지">⏸</button>
      <div class="hud-title"><b>${esc(st.title)}</b><small id="h-turn"></small></div>
      <div class="hud-who" id="h-who"></div>
    </div>
    <div class="timer"><i id="h-timer"></i></div>
    <div id="hint" class="hint"></div>
    <div class="hud-bot">
      <div class="focus"><span>집중력</span><div class="fbar"><i id="h-focus"></i></div><b id="h-focus-n">0</b></div>
      <div class="skills" id="h-skills"></div>
    </div>`;
  hud = { turn: $('#h-turn'), who: $('#h-who'), timer: $('#h-timer'), focus: $('#h-focus'), focusN: $('#h-focus-n'), skills: $('#h-skills'), key: '', opts };
}

function updateHud(b) {
  if (!hud) return;
  hud.turn.textContent = `  ${b.turnNo}턴`;
  const human = b.isHuman(b.turnTeam);
  hud.who.textContent = b.phase === 'over' ? '' : human ? (b.humanTeams.length > 1 ? (b.turnTeam === 0 ? '🔵 1P' : '🔴 2P') : '🔵 내 차례') : '🔴 상대 차례';
  const tl = b.settings.timer === false || !human || b.phase !== 'aim' ? 1 : Math.max(0, b.timeLeft / 15);
  hud.timer.style.width = (tl * 100).toFixed(1) + '%';
  hud.timer.style.background = tl < 0.3 ? '#ff6b6b' : '#7bc96f';
  const team = b.humanTeams.length > 1 ? b.turnTeam : 0;
  const f = b.focus[team];
  hud.focus.style.width = f + '%'; hud.focusN.textContent = Math.floor(f);
  const sel = b.body(b.selId);
  const sk = sel && sel.team === team ? sel.skills : [];
  const act = b.mods.skillId || '';
  const key = [b.selId, sk.join(), act, Math.floor(f / 5), b.phase, b.turnTeam].join('|');
  if (key !== hud.key) {
    hud.key = key;
    hud.skills.innerHTML = sk.map((id) => {
      const s = SKILLS[id], can = b.canUse(id, b.selId) && human;
      return `<button class="skill ${can ? '' : 'off'} ${act === id ? 'on' : ''}" data-act="useSkill" data-id="${id}" title="${esc(s.desc)}"><span class="si">${s.icon}</span><span class="sn">${s.name}</span><small>${s.cost}</small></button>`;
    }).join('') || '<div class="noskill">—</div>';
  }
}

export function registerFightActs(acts) {
  acts.useSkill = (d) => {
    const b = G.battle; if (!b || !b.isHuman(b.turnTeam)) return;
    if (b.mods.skillId === d.id) { toast('이미 준비된 스킬이에요'); return; }
    if (!b.useSkill(d.id)) toast('집중력이 부족해요!');
    else toast(SKILLS[d.id].icon + ' ' + SKILLS[d.id].name + ' 준비!');
    if (hud) hud.key = '';
  };
  acts.pause = async () => {
    const v = G.view; if (!v) return;
    v.paused = true;
    const r = await modal(`<h3>일시정지</h3><p class="mut">${esc(G.battle.stage.title)}</p>`, [
      { label: '포기하고 나가기', val: 'quit' }, { label: '계속하기', val: 'go', cls: 'pri' }]);
    v.paused = false;
    if (r === 'quit') {
      const ok = await confirmBox('정말 나갈까요? 이번 전투의 보상은 받을 수 없어요.', '나가기', '취소');
      if (ok) leave(G.battle.cfg.afterQuit || 'home'); else v.paused = false;
    }
  };
}

export function leave(screen = 'home') {
  if (G.view) { G.view.destroy(); G.view = null; }
  G.battle = null; hud = null;
  stopBgm();
  go(screen);
}

// ===== 결과 처리 =====
async function finish(battle, opts) {
  if (!G.battle || G.battle !== battle) return;
  const s = G.save;
  const res = battle.over;
  const st = battle.stage;
  const stat = battle.stat;
  const mode = opts.mode;
  if (G.view) G.view.paused = true;

  // 공통 통계
  if (mode !== 'duel' && mode !== 'ghost') {
    s.stats.shots += stat.shots; s.stats.falls += stat.falls; s.stats.pins += stat.pins; s.stats.edges += stat.edges; s.stats.crits += stat.crits;
    s.stats.bestCombo = Math.max(s.stats.bestCombo, stat.bestCombo);
    s.stats.combo2 += stat.combo2;
    bump(s, 'shots', stat.shots); bump(s, 'falls', stat.falls); bump(s, 'pins', stat.pins); bump(s, 'crits', stat.crits); bump(s, 'combo2', stat.combo2);
  }
  let out = { res, stars: 0, rewards: null, ups: [], drop: null, newStar: 0, first: false };

  if (res === 'win' && mode !== 'duel' && mode !== 'ghost') {
    s.stats.wins++; bump(s, 'wins');
    G.lossStreak = 0;
    sfx.win();
    if (mode === 'story') {
      const turnsOk = stat.turns <= st.turnPar;
      const hpOk = battle.hpRatio() >= 0.5;
      const stars = 1 + (turnsOk ? 1 : 0) + (hpOk ? 1 : 0);
      out.stars = stars; out.turnsOk = turnsOk; out.hpOk = hpOk;
      const prev = s.progress.stars[st.id] || 0;
      out.first = !s.progress.cleared[st.id];
      s.progress.cleared[st.id] = true;
      if (stars > prev) { s.progress.stars[st.id] = stars; out.newStar = stars - prev; }
      s.stats.stars = Object.values(s.progress.stars).reduce((a, b) => a + b, 0);
      if (st.ch === 6 && st.idx === 10) s.stats.hbClear = 1;
      const coinMul = battle.world.bodies.some((b) => b.team === 0 && b.passive === 'coin') ? 1.5 : 1;
      const r = { coin: Math.round(st.reward.coin * coinMul * (out.first ? 1 : 0.6)), chalk: out.first ? st.reward.chalk : 0, exp: Math.round(st.reward.exp * (out.first ? 1 : 0.7)) };
      if (out.newStar && !out.first) r.chalk += 0;
      addReward(r);
      out.rewards = r;
      for (const p of opts.party) { const lv0 = p.inst.level; addExp(p.inst, r.exp); if (p.inst.level > lv0) out.ups.push(`${esc(ERASERS[p.inst.baseId].name)} Lv.${p.inst.level}`); p.inst.aff += 12; }
      const rng = mulberry32((Math.random() * 1e9) | 0);
      if (st.boss || st.mid || rng() < 0.22) { out.drop = rollEquipment(rng, st.boss ? 3 : st.mid ? 1 : 0); s.items.push(out.drop); }
    } else if (mode === 'rogue') {
      out.rewards = { coin: st.reward.coin }; addReward(out.rewards);
    }
  } else if (res !== 'win') {
    if (mode !== 'duel' && mode !== 'ghost') { s.stats.losses++; G.lossStreak++; }
    sfx.lose();
  }
  checkAch();
  save();
  if (G.view) { G.view.destroy(); G.view = null; }
  stopBgm();
  await showResult(battle, opts, out);
}

export function achProgress(a) {
  const s = G.save;
  if (a.stat === 'owned') return s.erasers.length;
  if (a.stat === 'stars') return Object.values(s.progress.stars).reduce((x, y) => x + y, 0);
  return s.stats[a.stat] || 0;
}
export function checkAch() {
  // 달성 가능한 업적은 도감 화면에서 수령
}

async function showResult(battle, opts, out) {
  const s = G.save, st = battle.stage, mode = opts.mode, res = out.res;
  let html = '';
  if (mode === 'duel' || mode === 'ghost') {
    const w = res === 'win' ? (mode === 'duel' ? '🔵 1P 승리!' : '🎉 승리!') : res === 'lose' ? (mode === 'duel' ? '🔴 2P 승리!' : '😵 패배...') : '무승부';
    html = `<div class="res ${res}"><h2>${w}</h2><p class="mut">${battle.turnNo}턴 · 낙사 ${battle.stat.falls} · 최고 콤보 ${battle.stat.bestCombo}</p></div>`;
    const r = await modal(html, [{ label: '나가기', val: 'quit' }, { label: '다시 하기', val: 'retry', cls: 'pri' }]);
    if (r === 'retry' && opts.restart) { opts.restart(); return; }
    leave(opts.after || 'home'); return;
  }
  if (res === 'win') {
    const starsHtml = mode === 'story' ? `<div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= out.stars ? 'on' : ''}">★</span>`).join('')}</div>
      <ul class="starlist"><li class="on">✔ 클리어</li><li class="${out.turnsOk ? 'on' : ''}">${out.turnsOk ? '✔' : '✘'} ${st.turnPar}턴 이내 (${battle.stat.turns}턴)</li><li class="${out.hpOk ? 'on' : ''}">${out.hpOk ? '✔' : '✘'} HP 50% 이상 유지</li></ul>` : '';
    html = `<div class="res win"><h2>🎉 승리!</h2><p class="mut">${esc(st.title)}</p>${starsHtml}
      <div class="rew">${out.rewards ? `<span>🪙 +${out.rewards.coin}</span>` : ''}${out.rewards && out.rewards.chalk ? `<span>✏️ +${out.rewards.chalk}</span>` : ''}${out.rewards && out.rewards.exp ? `<span>⭐ EXP +${out.rewards.exp}</span>` : ''}</div>
      ${out.drop ? `<p class="drop">🎁 장비 획득: <b>${esc(import_name(out.drop))}</b></p>` : ''}
      ${out.ups.length ? `<p class="lvup">⬆ 레벨 업! ${out.ups.join(', ')}</p>` : ''}
      <p class="mut small">낙사 ${battle.stat.falls} · 최고 콤보 ${battle.stat.bestCombo} · 아슬아슬 ${battle.stat.edges}</p></div>`;
    if (out.ups.length) sfx.levelup();
    if (mode === 'rogue') { await opts.onEnd(res, out, battle); return; }
    const next = nextStage(st);
    const btns = [{ label: '나가기', val: 'quit' }, { label: '다시', val: 'retry' }];
    if (next) btns.push({ label: '다음 ▶', val: 'next', cls: 'pri' });
    const r = await modal(html, btns);
    if (r === 'next') { opts.nextStage(next); return; }
    if (r === 'retry') { opts.restart(); return; }
    leave('adventure');
  } else {
    if (mode === 'rogue') { await opts.onEnd(res, out, battle); return; }
    const tip = TIPS[(Math.random() * TIPS.length) | 0];
    html = `<div class="res lose"><h2>😵 괜찮아, 다시 쓰면 되지!</h2><p class="mut">${esc(st.title)}</p>
      <p>💡 ${tip}</p>${s.erasers.some((e) => e.free > 0) ? '<p class="drop">남은 스탯 포인트가 있어요! 지우개 화면에서 분배해 보세요.</p>' : '<p class="mut small">지우개 레벨업·장비 강화로 더 강해질 수 있어요.</p>'}</div>`;
    const r = await modal(html, [{ label: '나가기', val: 'quit' }, { label: '강해지기', val: 'up' }, { label: '재도전', val: 'retry', cls: 'pri' }]);
    if (r === 'retry') { opts.restart(); return; }
    if (r === 'up') { leave('erasers'); return; }
    leave('adventure');
  }
}
import { EQUIP_TPL } from './data.js';
function import_name(it) { return `${EQUIP_TPL[it.tpl].icon} ${EQUIP_TPL[it.tpl].name} (${it.rar})`; }

export function nextStage(st) {
  if (st.ch === undefined || st.id.startsWith('r')) return null;
  const C = CHAPTERS[st.ch];
  if (st.idx < C.count) return getStage(st.ch, st.idx + 1);
  if (st.ch < CHAPTERS.length - 1) return getStage(st.ch + 1, 1);
  return null;
}
