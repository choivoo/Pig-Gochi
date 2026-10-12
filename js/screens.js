// 메뉴 화면들: 타이틀, 홈, 모험, 지우개, 가방, 상점/뽑기, 도감, 설정
import { G, acts, screens, $, $$, esc, modal, confirmBox, toast, go, refresh, save, renderTop, bump, today, addReward, rewardText, partySlots, getInst } from './state.js';
import { ERASERS, RARITY, SKILLS, PASSIVES, ENEMIES, EQUIP_TPL, SLOTS, CHAPTERS, ACHIEVEMENTS, MISSION_POOL, ATTENDANCE, STAR_COST, SURFACES, ZONE_TYPES, EQ_RAR } from './data.js';
import { computeStats, skillsFor, expNeed, MAX_LV, equipStats, enhanceCost, sellPrice, MAX_PLUS, GACHA, gachaRoll, grantEraser, canAwaken, getStage, stageList, rollEquipment, newEraser } from './rpg.js';
import { startBattle, partyFromSave, achProgress } from './fight.js';
import { sfx, initAudio, startBgm, stopBgm, setVolumes } from './audio.js';
import { exportCode, importCode, defaultSave, persist } from './save.js';
import { mulberry32 } from './physics.js';

export const VERSION_TXT = 'v1.0.0';
const ST = { hp: 'HP', atk: '공격', def: '방어', spd: '민첩', crit: '치명%', luck: '행운' };
const DIFFS = { easy: '쉬움', normal: '보통', hard: '어려움', hell: '지옥' };

export const statStr = (st) => Object.entries(st).map(([k, v]) => `${ST[k]}+${v}`).join(' ');
export const eqName = (it) => `${EQUIP_TPL[it.tpl].icon} ${EQUIP_TPL[it.tpl].name}${it.plus ? ' +' + it.plus : ''}`;
const rarBadge = (r) => `<span class="rar r-${r}">${r}</span>`;
export function power(inst) { const s = computeStats(inst, G.save); return Math.round(s.hp * 0.3 + s.atk * 6 + s.def * 5 + s.spd * 2); }

function eraserFace(inst, size = 56) {
  const b = ERASERS[inst.baseId];
  return `<div class="eface" style="--c:${b.color};width:${size}px;height:${size * 0.75}px;font-size:${size * 0.55}px">${b.emoji}</div>`;
}
function ecard(inst, extra = '') {
  const b = ERASERS[inst.baseId];
  const inParty = G.save.party.includes(inst.uid);
  return `<button class="ecard r-${b.rar}" data-act="openEraser" data-uid="${inst.uid}">
    ${inParty ? '<span class="pbadge">편성</span>' : ''}${eraserFace(inst, 58)}
    <b>${esc(inst.nick || b.name)}</b><small>Lv.${inst.level} ${'★'.repeat(inst.star)}</small>${rarBadge(b.rar)}${extra}</button>`;
}

// ================= 타이틀 =================
screens.title = (root) => {
  root.innerHTML = `<div class="title" data-act="start">
    <div class="logo-wrap"><div class="logo-eraser erz" style="--c:#ffe3e3"><i></i></div><h1>지우개 <em>RPG</em></h1><p class="sub">책상 위의 전쟁 · 따먹기 대전기</p></div>
    <div class="tap">화면을 터치해서 시작</div>
    <div class="ver">${VERSION_TXT} · 설치 없이 바로 플레이</div></div>`;
};
acts.start = async () => {
  initAudio();
  const s = G.save;
  setVolumes(s.settings.sound, s.settings.bgm);
  if (!Object.keys(s.progress.cleared).length && !s.tutorialDone) {
    s.tutorialDone = true; save();
    await modal(`<h3>🌙 프롤로그: 지워지지 않는 밤</h3>
      <p>시험이 끝난 날 밤, 텅 빈 교실. 달빛이 책상을 비추자 낡은 지우개 <b>말랑이</b>의 몸에 작은 얼굴이 떠올랐어요.</p>
      <p>필통 속 연필들이 눈을 떴어요. <b>연필 제국</b>의 황제 HB 대제가 선언합니다.<br>"세상은 이제 내가 쓴 대로 확정된다! 지우개는 필요 없다!"</p>
      <p>말랑이가 당신을 올려다봅니다. "손가락 지휘관! 나를 튕겨줘, 지우~!"</p>`, [{ label: '튕기러 가자!', val: 1, cls: 'pri' }]);
    stageStart(getStage(0, 1), 'easy', true);
    return;
  }
  go('home');
  startBgmIfOn();
  attendance();
};
export function startBgmIfOn() { if (G.save.settings.bgm > 0) startBgm(); }

// ================= 홈 =================
const LINES = ['틀린 건 지우면 돼, 지우~!', '오늘도 한 판 할까지우?', '책상 끝은 위험해!', '선생님 오시기 전에 빨리!', '간식 먹고 싶다지우...', '나 좀 닦아줄래? 헤헤'];
screens.home = (root) => {
  const s = G.save;
  const lead = getInst(s.party[0]) || s.erasers[0];
  const b = ERASERS[lead.baseId];
  const next = findNext();
  const ms = s.daily.missions.map((id) => MISSION_POOL.find((m) => m.id === id));
  root.innerHTML = `<div class="home">
    <section class="hero card"><div class="bubble" id="bubble">${LINES[0]}</div>
      <div class="hero-eraser erz" data-act="petHero" style="--c:${b.color}"><i></i><span class="badge">${b.emoji}</span></div>
      <div class="hero-name">${esc(lead.nick || b.name)} <small>Lv.${lead.level}</small></div></section>
    <button class="btn big pri" data-act="continue">▶ ${next ? `${esc(next.title)} (${next.id})` : '모험 계속하기'}</button>
    <div class="menu-grid">
      <button class="menu" data-go="adventure"><i>🗺️</i>모험</button>
      <button class="menu" data-go="rogue"><i>♾️</i>무한 책상</button>
      <button class="menu" data-go="duel"><i>🤝</i>친구 대결</button>
      <button class="menu" data-go="erasers"><i>🩷</i>지우개</button>
      <button class="menu" data-go="bag"><i>🎒</i>가방</button>
      <button class="menu" data-go="shop"><i>🏪</i>문방구</button>
      <button class="menu" data-go="dex"><i>📖</i>도감·업적</button>
      <button class="menu" data-act="goSettings"><i>⚙️</i>설정</button>
    </div>
    <section class="card"><h3>📝 오늘의 미션</h3>${ms.map((m) => {
      const c = Math.min(m.goal, s.daily.counters[m.stat] || 0), done = c >= m.goal, cl = s.daily.claimed[m.id];
      return `<div class="mission"><div><b>${m.name}</b><div class="bar"><i style="width:${c / m.goal * 100}%"></i></div><small>${c}/${m.goal} · ${rewardText(m.reward)}</small></div>
        ${cl ? '<span class="done">완료</span>' : done ? `<button class="btn sm pri" data-act="claimMission" data-id="${m.id}">받기</button>` : '<span class="mut small">진행 중</span>'}</div>`;
    }).join('')}</section>
    <p class="foot-note">💾 기록은 이 브라우저에만 저장돼요. 가끔 설정에서 백업 코드를 복사해 두세요!</p></div>`;
};
acts.petHero = () => {
  const s = G.save, lead = getInst(s.party[0]) || s.erasers[0];
  lead.aff += 3; save();
  $('#bubble').textContent = LINES[(Math.random() * LINES.length) | 0];
  sfx.click();
};
acts.continue = () => {
  const n = findNext();
  if (n) stageStart(n, G.save.settings.diff || 'normal'); else go('adventure');
};
acts.claimMission = (d) => {
  const m = MISSION_POOL.find((x) => x.id === d.id), s = G.save;
  if (s.daily.claimed[m.id]) return;
  s.daily.claimed[m.id] = true; addReward(m.reward); save(); sfx.coin(); toast('🎁 ' + rewardText(m.reward)); refresh();
};
acts.goSettings = () => go('settings');

function isUnlocked(ch, idx) {
  const c = G.save.progress.cleared;
  if (idx > 1) return !!c[ch + '-' + (idx - 1)];
  if (ch === 0) return true;
  return !!c[(ch - 1) + '-' + CHAPTERS[ch - 1].count];
}
function findNext() {
  for (const C of CHAPTERS) for (let i = 1; i <= C.count; i++) {
    if (!G.save.progress.cleared[C.id + '-' + i] && isUnlocked(C.id, i)) return getStage(C.id, i);
  }
  return null;
}

async function attendance() {
  const s = G.save, t = today();
  if (s.attendance.last === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yk = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  s.attendance.streak = s.attendance.last === yk ? (s.attendance.streak % 7) + 1 : 1;
  s.attendance.last = t;
  const r = ATTENDANCE[s.attendance.streak - 1];
  addReward(r); save(); renderTop();
  sfx.bell();
  await modal(`<h3>📅 출석 ${s.attendance.streak}일차!</h3><div class="att">${ATTENDANCE.map((a, i) => `<div class="${i + 1 === s.attendance.streak ? 'now' : i < s.attendance.streak ? 'past' : ''}"><small>${i + 1}일</small><span>${a.chalk ? '✏️' + a.chalk : ''} ${a.coin ? '🪙' + a.coin : ''}</span></div>`).join('')}</div><p>오늘의 보상: <b>${rewardText(r)}</b></p>`);
}

// ================= 모험 =================
let advCh = 1;
screens.adventure = (root, p) => {
  const s = G.save;
  if (p && p.ch !== undefined) advCh = p.ch;
  else { const n = findNext(); advCh = n ? n.ch : advCh; }
  const stages = stageList(advCh);
  const C = CHAPTERS[advCh];
  root.innerHTML = `<div class="adv">
    <div class="tabs chap">${CHAPTERS.map((c) => {
      const un = isUnlocked(c.id, 1);
      return `<button class="tab2 ${c.id === advCh ? 'on' : ''} ${un ? '' : 'lock'}" data-act="pickChap" data-ch="${c.id}">${un ? c.icon : '🔒'}<small>${c.id === 0 ? '프롤' : 'CH' + c.id}</small></button>`;
    }).join('')}</div>
    <h2 class="chtitle">${C.icon} ${C.name}</h2>
    <p class="mut small">표면: ${SURFACES[C.surface].name} · 적정 Lv.${C.lvBase}~</p>
    <div class="stage-list">${stages.map((st) => {
      const un = isUnlocked(st.ch, st.idx), stars = s.progress.stars[st.id] || 0;
      return `<button class="stage ${un ? '' : 'lock'} ${st.boss ? 'boss' : st.mid ? 'mid' : ''}" data-act="stageInfo" data-ch="${st.ch}" data-i="${st.idx}" ${un ? '' : 'disabled'}>
        <span class="sn">${st.boss ? '👑' : st.mid ? '⚔️' : st.idx}</span>
        <span class="st-t"><b>${esc(st.title)}</b><small>Lv.${st.lv} · 적 ${st.enemies.length}</small></span>
        <span class="st-s">${un ? [1, 2, 3].map((i) => `<i class="${i <= stars ? 'on' : ''}">★</i>`).join('') : '🔒'}</span></button>`;
    }).join('')}</div></div>`;
};
acts.pickChap = (d) => { if (isUnlocked(+d.ch, 1)) { advCh = +d.ch; go('adventure', { ch: advCh }); } else toast('이전 챕터를 먼저 클리어하세요'); };

acts.stageInfo = async (d) => {
  const st = getStage(+d.ch, +d.i), s = G.save;
  const party = partyFromSave(s.party);
  if (!party.length) { toast('편성된 지우개가 없어요'); return; }
  const diff = s.settings.diff || 'normal';
  const html = `<h3>${esc(st.title)}</h3><p class="mut small">${esc(st.chapterName)} · ${SURFACES[st.surface].name}</p>
    <div class="elist">${st.enemies.map((e) => `<div class="en"><span>${ENEMIES[e.id].emoji}</span><b>${ENEMIES[e.id].name}</b><small>Lv.${e.lv}</small></div>`).join('')}</div>
    ${st.zones.length ? `<p class="small">⚠️ 지형: ${st.zones.map((z) => ZONE_TYPES[z.type].name).join(', ')}</p>` : ''}
    <p class="small">보상: 🪙 ${st.reward.coin} · ⭐ EXP ${st.reward.exp}${st.reward.chalk ? ' · ✏️ ' + st.reward.chalk : ''}</p>
    <p class="small">내 편성: ${party.map((p) => `${ERASERS[p.inst.baseId].emoji} Lv.${p.inst.level}`).join('  ')}</p>
    <div class="chips" id="diffchips">${Object.entries(DIFFS).map(([k, v]) => `<button class="chip ${k === diff ? 'on' : ''}" data-diff="${k}">${v}</button>`).join('')}</div>
    <p class="mut small">난이도가 높을수록 적 AI가 정확해지고 가이드가 짧아져요.</p>`;
  const r = await modal(html, [{ label: '닫기', val: false }, { label: '⚔️ 출격', val: true, cls: 'pri' }], {
    dismiss: true,
    onOpen: (w) => w.querySelectorAll('[data-diff]').forEach((c) => c.onclick = () => { s.settings.diff = c.dataset.diff; w.querySelectorAll('[data-diff]').forEach((x) => x.classList.toggle('on', x === c)); save(); }),
  });
  if (r) stageStart(st, s.settings.diff || 'normal');
};

export function stageStart(st, diff, forceEasy) {
  const s = G.save;
  const guideOverride = { easy: 'easy', normal: s.settings.guide, hard: s.settings.guide === 'easy' ? 'normal' : s.settings.guide, hell: 'hard' }[diff];
  const party = partyFromSave(s.party.slice(0, partySlots()));
  const settings = { ...s.settings, guide: st.ch === 0 ? 'easy' : guideOverride };
  const orig = s.settings;
  startBattle({
    mode: 'story', stage: st, party, diff: diff === 'easy' && st.ch === 0 ? 'easy' : diff, after: 'adventure',
    restart: () => stageStart(st, diff), nextStage: (n) => stageStart(n, diff),
  });
  // 가이드 설정은 전투 객체에만 반영
  if (G.battle) { G.battle.settings = settings; if (G.view) G.view.guideMode = settings.guide; }
}

// ================= 지우개 =================
screens.erasers = (root) => {
  const s = G.save, slots = partySlots();
  const owned = [...s.erasers].sort((a, b) => ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(ERASERS[b.baseId].rar) - ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(ERASERS[a.baseId].rar) || b.level - a.level);
  root.innerHTML = `<div class="erasers"><h2>🩷 내 지우개 <small>${s.erasers.length}/${Object.keys(ERASERS).length}</small></h2>
    <section class="card"><h3>출전 편성 (${s.party.length}/${slots})</h3><div class="party">${Array.from({ length: 3 }, (_, i) => {
      const inst = getInst(s.party[i]);
      if (i >= slots) return `<div class="pslot lock">🔒<small>${i === 1 ? '1-5 클리어' : '2-10 클리어'}</small></div>`;
      return inst ? `<div class="pslot">${ecard(inst)}</div>` : '<div class="pslot empty">비어 있음</div>';
    }).join('')}</div></section>
    <div class="egrid">${owned.map((i) => ecard(i, i.free ? `<span class="pt">+${i.free}P</span>` : '')).join('')}</div></div>`;
};
acts.openEraser = (d) => go('eraserDetail', { uid: d.uid });

screens.eraserDetail = (root, p) => {
  const s = G.save, inst = getInst(p.uid);
  if (!inst) return go('erasers');
  const b = ERASERS[inst.baseId], st = computeStats(inst, s);
  const need = expNeed(inst.level);
  const sk = skillsFor(inst);
  const pas = PASSIVES[b.passive];
  const shards = s.shards[inst.baseId] || 0;
  root.innerHTML = `<div class="detail">
    <button class="back" data-go="erasers">◀ 목록</button>
    <section class="card dh r-${b.rar}">${eraserFace(inst, 96)}<div><h2>${esc(inst.nick || b.name)} ${rarBadge(b.rar)}</h2>
      <div class="mut small">Lv.${inst.level}/${MAX_LV} ${'★'.repeat(inst.star)}${'☆'.repeat(5 - inst.star)} · 전투력 ${power(inst)}</div>
      <div class="bar xp"><i style="width:${inst.level >= MAX_LV ? 100 : inst.exp / need * 100}%"></i></div><small class="mut">${inst.level >= MAX_LV ? 'MAX' : `EXP ${inst.exp}/${need}`}</small>
      <p class="desc">${esc(b.desc)}</p></div></section>
    <section class="card"><h3>능력치</h3><div class="stats">
      ${[['hp', 'HP', st.hp], ['atk', '공격', st.atk], ['def', '방어', st.def], ['spd', '민첩', st.spd]].map(([k, n, v]) => `<div><span>${n}</span><b>${v}</b>${inst.free ? `<button class="btn xs" data-act="addPt" data-uid="${inst.uid}" data-k="${k}">+</button>` : ''}</div>`).join('')}
      <div><span>치명</span><b>${st.crit}%</b></div><div><span>행운</span><b>${st.luck}</b></div></div>
      ${inst.free ? `<p class="drop">남은 포인트 <b>${inst.free}</b>P (HP+12 / 공격+2 / 방어+1.5 / 민첩+1)</p>` : ''}</section>
    <section class="card"><h3>스킬</h3>
      ${b.skills.map((id, i) => { const un = [1, 5, 12][i] <= inst.level; const k = SKILLS[id]; return `<div class="skrow ${un ? '' : 'lock'}"><span>${k.icon}</span><div><b>${k.name}</b> <small>집중 ${k.cost}</small><br><small class="mut">${k.desc}</small></div>${un ? '' : `<small>Lv.${[1, 5, 12][i]} 해금</small>`}</div>`; }).join('')}
      ${pas[0] ? `<div class="skrow pas"><span>✨</span><div><b>${pas[0]}</b> <small>패시브</small><br><small class="mut">${pas[1]}</small></div></div>` : ''}</section>
    <section class="card"><h3>장비</h3><div class="slots">${['cover', 'case', 'charm'].map((sl) => {
      const it = s.items.find((x) => x.uid === inst.equip[sl]);
      return `<button class="slot" data-act="pickEquip" data-uid="${inst.uid}" data-slot="${sl}"><small>${SLOTS[sl]}</small>${it ? `<b>${eqName(it)}</b><small>${statStr(equipStats(it))}</small>${rarBadge(it.rar)}` : '<b class="mut">+ 장착</b>'}</button>`;
    }).join('')}</div></section>
    <section class="card"><h3>육성</h3><div class="row-btns">
      <button class="btn" data-act="train" data-uid="${inst.uid}">🏋️ 훈련 (🪙${trainCost(inst)})</button>
      <button class="btn" data-act="wipe" data-uid="${inst.uid}">🧼 닦아주기 <small>친밀 ${inst.aff}</small></button>
      <button class="btn ${canAwaken(s, inst) ? 'pri' : ''}" data-act="awaken" data-uid="${inst.uid}">${inst.star >= 5 ? '각성 MAX' : `⭐ 각성 (조각 ${shards}/${STAR_COST[inst.star]})`}</button></div>
      <div class="row-btns"><button class="btn ${s.party.includes(inst.uid) ? '' : 'pri'}" data-act="toggleParty" data-uid="${inst.uid}">${s.party.includes(inst.uid) ? '편성 해제' : '출전 편성'}</button>
      <button class="btn" data-act="rename" data-uid="${inst.uid}">✏️ 이름 짓기</button></div></section></div>`;
};
const trainCost = (inst) => 60 + inst.level * 25;
acts.addPt = (d) => {
  const inst = getInst(d.uid); if (!inst.free) return;
  inst.free--; inst.pts[d.k]++; save(); sfx.click(); refresh();
};
acts.train = (d) => {
  const inst = getInst(d.uid), s = G.save, c = trainCost(inst);
  if (inst.level >= MAX_LV) return toast('이미 최대 레벨이에요');
  if (s.coin < c) return toast('코인이 부족해요');
  s.coin -= c;
  const lv0 = inst.level;
  import('./rpg.js').then((m) => { m.addExp(inst, Math.round(c * 0.9)); if (inst.level > lv0) { sfx.levelup(); toast(`⬆ 레벨 ${inst.level}!`); } else sfx.coin(); save(); refresh(); });
};
acts.wipe = (d) => {
  const inst = getInst(d.uid), s = G.save, k = 'wipe_' + inst.uid;
  if (s.claimed[k] === today()) return toast('오늘은 이미 닦아줬어요');
  s.claimed[k] = today(); inst.aff += 30; save(); toast('🧼 뽀득뽀득! 친밀도 +30'); sfx.coin(); refresh();
};
acts.awaken = (d) => {
  const inst = getInst(d.uid), s = G.save;
  if (inst.star >= 5) return;
  if (!canAwaken(s, inst)) return toast('조각이 부족해요. 같은 지우개를 뽑으면 조각이 쌓여요');
  s.shards[inst.baseId] -= STAR_COST[inst.star]; inst.star++; save(); sfx.levelup(); toast(`⭐ 각성 ${inst.star}단계!`); refresh();
};
acts.toggleParty = (d) => {
  const s = G.save, i = s.party.indexOf(d.uid);
  if (i >= 0) { if (s.party.length <= 1) return toast('최소 1마리는 편성해야 해요'); s.party.splice(i, 1); }
  else { if (s.party.length >= partySlots()) return toast('편성 칸이 가득 찼어요'); s.party.push(d.uid); }
  save(); refresh();
};
// 이름 짓기: 입력 값을 확실히 읽기 위해 override
acts.rename = (d) => {
  const inst = getInst(d.uid);
  const root = $('#modal-root');
  const w = document.createElement('div'); w.className = 'modal-wrap';
  w.innerHTML = `<div class="modal"><div class="modal-body"><h3>이름 짓기</h3><input id="nick" class="inp" maxlength="8" value="${esc(inst.nick || '')}" placeholder="${ERASERS[inst.baseId].name}"></div><div class="modal-btns"><button class="btn" id="n-c">취소</button><button class="btn pri" id="n-o">저장</button></div></div>`;
  root.appendChild(w);
  w.querySelector('#n-c').onclick = () => w.remove();
  w.querySelector('#n-o').onclick = () => { inst.nick = w.querySelector('#nick').value.trim().slice(0, 8); save(); w.remove(); refresh(); };
};

acts.pickEquip = async (d) => {
  const s = G.save, inst = getInst(d.uid);
  const list = s.items.filter((x) => x.slot === d.slot);
  const cur = inst.equip[d.slot];
  const html = `<h3>${SLOTS[d.slot]} 장착</h3><div class="ilist">${list.length ? list.map((it) => {
    const by = s.erasers.find((e) => e.equip[it.slot] === it.uid);
    return `<button class="item r-${it.rar} ${cur === it.uid ? 'on' : ''}" data-pick="${it.uid}"><span class="ii">${EQUIP_TPL[it.tpl].icon}</span><div><b>${eqName(it)}</b> ${rarBadge(it.rar)}<br><small>${statStr(equipStats(it))}${by && by !== inst ? ' · ' + esc(by.nick || ERASERS[by.baseId].name) + ' 착용중' : ''}</small></div></button>`;
  }).join('') : '<p class="mut">가진 장비가 없어요. 스테이지 드랍이나 문방구에서 구해보세요!</p>'}</div>`;
  const r = await modal(html, [{ label: '해제', val: 'off' }, { label: '닫기', val: false, cls: 'pri' }], {
    dismiss: true,
    onOpen: (w) => w.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => w.closeWith(b.dataset.pick)),
  });
  if (!r) return;
  if (r === 'off') inst.equip[d.slot] = null;
  else { for (const e of s.erasers) if (e.equip[d.slot] === r) e.equip[d.slot] = null; inst.equip[d.slot] = r; sfx.coin(); }
  save(); refresh();
};

// ================= 가방 =================
let bagFilter = 'all';
screens.bag = (root) => {
  const s = G.save;
  const items = s.items.filter((i) => bagFilter === 'all' || i.slot === bagFilter).sort((a, b) => EQ_RAR[b.rar] - EQ_RAR[a.rar] || b.plus - a.plus);
  root.innerHTML = `<div class="bag"><h2>🎒 가방 <small>${s.items.length}개</small></h2>
    <div class="chips">${[['all', '전체'], ['cover', '커버'], ['case', '케이스'], ['charm', '부적']].map(([k, v]) => `<button class="chip ${bagFilter === k ? 'on' : ''}" data-act="bagF" data-k="${k}">${v}</button>`).join('')}</div>
    <div class="ilist">${items.map((it) => {
      const by = s.erasers.find((e) => e.equip[it.slot] === it.uid);
      return `<button class="item r-${it.rar}" data-act="itemInfo" data-uid="${it.uid}"><span class="ii">${EQUIP_TPL[it.tpl].icon}</span><div><b>${eqName(it)}</b> ${rarBadge(it.rar)}<br><small>${statStr(equipStats(it))}${by ? ' · ' + esc(by.nick || ERASERS[by.baseId].name) : ''}</small></div></button>`;
    }).join('') || '<p class="mut empty">장비가 없어요.</p>'}</div></div>`;
};
acts.bagF = (d) => { bagFilter = d.k; refresh(); };
acts.itemInfo = async (d) => {
  const s = G.save, it = s.items.find((x) => x.uid === d.uid);
  if (!it) return;
  const by = s.erasers.find((e) => e.equip[it.slot] === it.uid);
  const html = `<h3>${eqName(it)} ${rarBadge(it.rar)}</h3><p>${statStr(equipStats(it))}</p><p class="mut small">${SLOTS[it.slot]} 장비${by ? ' · ' + esc(by.nick || ERASERS[by.baseId].name) + ' 착용 중' : ''}</p>
    ${it.plus < MAX_PLUS ? `<p class="small">강화 +${it.plus + 1}: 🪙 ${enhanceCost(it)} (성공 100%, 능력치 +15%)</p>` : '<p class="small">최대 강화</p>'}`;
  const r = await modal(html, [{ label: `판매 🪙${sellPrice(it)}`, val: 'sell' }, ...(it.plus < MAX_PLUS ? [{ label: '강화', val: 'up', cls: 'pri' }] : []), { label: '닫기', val: false }], { dismiss: true });
  if (r === 'up') {
    const c = enhanceCost(it);
    if (s.coin < c) return toast('코인이 부족해요');
    s.coin -= c; it.plus++; save(); sfx.levelup(); toast(`${eqName(it)} 강화 성공!`); renderTop(); acts.itemInfo(d);
  } else if (r === 'sell') {
    if (by) return toast('착용 중인 장비는 판매할 수 없어요');
    if (!(await confirmBox(`${eqName(it)}을(를) 🪙${sellPrice(it)}에 판매할까요?`))) return;
    s.coin += sellPrice(it); s.items = s.items.filter((x) => x !== it); save(); sfx.coin(); refresh();
  }
};

// ================= 문방구 =================
let shopTab = 'gacha';
screens.shop = (root) => {
  const s = G.save, free = s.gacha.freeDay !== today();
  root.innerHTML = `<div class="shop"><h2>🏪 문방구</h2>
    <div class="tabs"><button class="tab2 ${shopTab === 'gacha' ? 'on' : ''}" data-act="shopT" data-k="gacha">🎰 뽑기</button><button class="tab2 ${shopTab === 'daily' ? 'on' : ''}" data-act="shopT" data-k="daily">🛒 오늘의 진열</button></div>
    ${shopTab === 'gacha' ? `<section class="card gacha"><div class="machine">🎰</div>
      <p class="mut small">확률 공개 · 중복 지우개는 각성 조각으로 변환돼요</p>
      <div class="gcol"><h3>일반 뽑기</h3><small>N 70% · R 25% · SR 5%</small>
        <div class="row-btns"><button class="btn" data-act="pull" data-k="normal" data-n="1">1회 🪙500</button><button class="btn pri" data-act="pull" data-k="normal" data-n="10">10회 🪙4,500</button></div></div>
      <div class="gcol"><h3>고급 뽑기</h3><small>R 60% · SR 37% · SSR 3% · 50회 천장 (${s.gacha.pity_premium}/50)</small>
        <div class="row-btns"><button class="btn" data-act="pull" data-k="premium" data-n="1">1회 ✏️5</button><button class="btn pri" data-act="pull" data-k="premium" data-n="10">10회 ✏️50</button></div></div>
      <button class="btn ${free ? 'pri' : ''}" data-act="pullFree" ${free ? '' : 'disabled'}>${free ? '🎁 오늘의 무료 뽑기' : '무료 뽑기 완료 (내일 또!)'}</button>
      <p class="mut small">🌟 신화(UR) 지우개는 뽑기가 아닌 업적·도전으로 얻을 수 있어요.</p></section>`
      : `<section class="card"><p class="mut small">매일 새 진열 6칸. 자정에 갱신돼요.</p><div class="ilist">${s.shop.items.map((it, i) => {
        const bought = s.shop.bought.includes(i), price = Math.round(140 * EQ_RAR[it.rar] * 1.4);
        return `<button class="item r-${it.rar} ${bought ? 'sold' : ''}" data-act="buyItem" data-i="${i}" ${bought ? 'disabled' : ''}><span class="ii">${EQUIP_TPL[it.tpl].icon}</span><div><b>${eqName(it)}</b> ${rarBadge(it.rar)}<br><small>${statStr(equipStats(it))}</small></div><span class="price">${bought ? '품절' : '🪙' + price}</span></button>`;
      }).join('')}</div></section>`}</div>`;
};
acts.shopT = (d) => { shopTab = d.k; refresh(); };
acts.buyItem = (d) => {
  const s = G.save, i = +d.i, it = s.shop.items[i];
  const price = Math.round(140 * EQ_RAR[it.rar] * 1.4);
  if (s.shop.bought.includes(i)) return;
  if (s.coin < price) return toast('코인이 부족해요');
  s.coin -= price; s.shop.bought.push(i); s.items.push({ ...it, uid: 'i_' + Math.random().toString(36).slice(2, 9) }); save(); sfx.coin(); toast('구매 완료!'); refresh();
};
acts.pullFree = () => { const s = G.save; if (s.gacha.freeDay === today()) return; s.gacha.freeDay = today(); doPull('normal', 1, true); };
acts.pull = (d) => doPull(d.k, +d.n, false);

async function doPull(kind, n, free) {
  const s = G.save, g = GACHA[kind];
  let cost = free ? 0 : g.cost * n;
  if (n === 10 && kind === 'normal') cost = 4500;
  if (!free) {
    if (g.costType === 'coin' ? s.coin < cost : s.chalk < cost) return toast(g.costType === 'coin' ? '코인이 부족해요' : '분필이 부족해요');
    if (g.costType === 'coin') s.coin -= cost; else s.chalk -= cost;
  }
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const results = [];
  for (let i = 0; i < n; i++) {
    const r = gachaRoll(kind, s, rng);
    const got = grantEraser(s, r.id);
    results.push({ ...r, ...got });
  }
  s.stats.gachas += n; bump(s, 'gachas', n);
  save(); renderTop();
  sfx.gacha();
  // 캡슐 연출
  const best = results.reduce((a, r) => Math.max(a, ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(r.rar)), 0);
  const cols = ['#e5e7eb', '#60a5fa', '#a78bfa', '#fbbf24', '#f472b6'];
  const root = $('#modal-root');
  const ov = document.createElement('div'); ov.className = 'capsule-ov';
  ov.innerHTML = `<div class="capsule" style="--cc:${cols[best]}"><i></i></div><p>철컥철컥...</p>`;
  root.appendChild(ov);
  await new Promise((r) => setTimeout(r, 1300));
  ov.remove();
  sfx.gachaGet(best);
  const html = `<h3>🎉 뽑기 결과</h3><div class="gres">${results.map((r) => { const b = ERASERS[r.id]; return `<div class="gr r-${r.rar} ${r.isNew ? 'new' : ''}"><div class="eface" style="--c:${b.color}">${b.emoji}</div><b>${b.name}</b>${rarBadge(r.rar)}<small>${r.isNew ? 'NEW!' : '조각 +' + r.shards}</small></div>`; }).join('')}</div>`;
  await modal(html, [{ label: '확인', val: true, cls: 'pri' }]);
  refresh();
}

// ================= 도감 / 업적 =================
let dexTab = 'eraser';
screens.dex = (root) => {
  const s = G.save;
  const tabs = [['eraser', '지우개'], ['enemy', '적'], ['ach', '업적'], ['stat', '기록']];
  let body = '';
  if (dexTab === 'eraser') {
    const ids = Object.keys(ERASERS);
    body = `<p class="mut small">수집 ${s.dex.erasers.length}/${ids.length}</p><div class="egrid">${ids.map((id) => {
      const b = ERASERS[id], has = s.dex.erasers.includes(id);
      return `<button class="ecard r-${b.rar} ${has ? '' : 'unk'}" data-act="dexInfo" data-id="${id}"><div class="eface" style="--c:${b.color};width:58px;height:44px;font-size:32px">${b.emoji}</div><b>${has ? b.name : '???'}</b>${rarBadge(b.rar)}</button>`;
    }).join('')}</div>`;
  } else if (dexTab === 'enemy') {
    body = `<div class="egrid">${Object.entries(ENEMIES).map(([id, e]) => {
      const n = s.dex.enemies[id] || 0;
      return `<button class="ecard ${n ? '' : 'unk'}" data-act="dexEnemy" data-id="${id}"><div class="eface" style="--c:${e.color};width:58px;height:44px;font-size:32px">${e.emoji}</div><b>${n ? e.name : '???'}</b><small>${n ? n + '회 격파' : ''}</small>${e.boss ? '<span class="rar r-SSR">BOSS</span>' : ''}</button>`;
    }).join('')}</div>`;
  } else if (dexTab === 'ach') {
    body = ACHIEVEMENTS.map((a) => {
      const v = achProgress(a), done = v >= a.goal, cl = s.claimed[a.id];
      return `<div class="mission"><div><b>${a.name}</b><div class="bar"><i style="width:${Math.min(100, v / a.goal * 100)}%"></i></div><small>${a.desc} · ${Math.min(v, a.goal)}/${a.goal} · ${a.reward.eraser ? '🧽 ' + ERASERS[a.reward.eraser].name : rewardText(a.reward)}</small></div>
        ${cl ? '<span class="done">완료</span>' : done ? `<button class="btn sm pri" data-act="claimAch" data-id="${a.id}">받기</button>` : ''}</div>`;
    }).join('');
  } else {
    const t = s.stats;
    body = `<div class="statlist">${[['전투 승리', t.wins], ['전투 패배', t.losses], ['낙사시킨 적', t.falls], ['따먹기', t.pins], ['아슬아슬 생존', t.edges], ['치명타', t.crits], ['최고 콤보', t.bestCombo], ['튕긴 횟수', t.shots], ['뽑기 횟수', t.gachas], ['무한 책상 최고', t.rogueBest + '방'], ['획득한 별', t.stars]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
  }
  root.innerHTML = `<div class="dex"><h2>📖 도감·업적</h2><div class="tabs">${tabs.map(([k, v]) => `<button class="tab2 ${dexTab === k ? 'on' : ''}" data-act="dexT" data-k="${k}">${v}</button>`).join('')}</div>${body}</div>`;
};
acts.dexT = (d) => { dexTab = d.k; refresh(); };
acts.dexInfo = (d) => {
  const b = ERASERS[d.id], has = G.save.dex.erasers.includes(d.id);
  if (!has) return modal(`<h3>???</h3><p class="mut">아직 만나지 못한 지우개예요.</p>`);
  modal(`<h3>${b.emoji} ${b.name} ${rarBadge(b.rar)}</h3><p>${b.desc}</p><p class="small">기본 HP ${b.hp} · 공격 ${b.atk} · 방어 ${b.def} · 민첩 ${b.spd}</p><p class="small">✨ ${PASSIVES[b.passive][0] || '—'} ${PASSIVES[b.passive][1]}</p><p class="small">스킬: ${b.skills.map((k) => SKILLS[k].icon + SKILLS[k].name).join(', ')}</p>`);
};
acts.dexEnemy = (d) => {
  const e = ENEMIES[d.id], n = G.save.dex.enemies[d.id] || 0;
  if (!n) return modal(`<h3>???</h3><p class="mut">아직 만나지 못한 적이에요.</p>`);
  modal(`<h3>${e.emoji} ${e.name}</h3><p>${e.desc}</p><p class="small">기본 HP ${e.hp} · 공격 ${e.atk} · 방어 ${e.def}</p><p class="small">성격: ${{ attack: '공격적', edge: '낙사 사냥꾼', coward: '겁쟁이' }[e.pers]}${e.boss ? ' · 낙사 즉사 면역(보스)' : ''}</p>`);
};
acts.claimAch = (d) => {
  const a = ACHIEVEMENTS.find((x) => x.id === d.id), s = G.save;
  if (s.claimed[a.id] || achProgress(a) < a.goal) return;
  s.claimed[a.id] = true;
  if (a.reward.eraser) { const r = grantEraser(s, a.reward.eraser); toast(`🎉 ${ERASERS[a.reward.eraser].name} ${r.isNew ? '획득' : '조각 획득'}!`); }
  else { addReward(a.reward); toast('🎁 ' + rewardText(a.reward)); }
  save(); sfx.levelup(); renderTop(); refresh();
};

// ================= 설정 =================
screens.settings = (root) => {
  const t = G.save.settings;
  const chk = (k, label) => `<label class="sw"><span>${label}</span><input type="checkbox" data-set="${k}" ${t[k] ? 'checked' : ''}><i></i></label>`;
  root.innerHTML = `<div class="settings"><button class="back" data-go="home">◀ 홈</button><h2>⚙️ 설정</h2>
    <section class="card">
      <label class="sl"><span>효과음</span><input type="range" min="0" max="1" step="0.1" value="${t.sound}" data-set="sound"></label>
      <label class="sl"><span>배경음악</span><input type="range" min="0" max="1" step="0.1" value="${t.bgm}" data-set="bgm"></label>
      ${chk('vibrate', '진동')}${chk('reduceMotion', '효과 줄이기 (흔들림·깜빡임 감소)')}${chk('spin', '회전(스핀) 조작 사용')}${chk('timer', '턴 제한시간 (15초)')}${chk('dda', '연패 시 난이도 자동 보정')}
      <div class="sl"><span>조준 가이드</span><div class="chips">${[['easy', '쉬움 (전체)'], ['normal', '보통'], ['hard', '어려움']].map(([k, v]) => `<button class="chip ${t.guide === k ? 'on' : ''}" data-act="setGuide" data-k="${k}">${v}</button>`).join('')}</div></div></section>
    <section class="card"><h3>💾 데이터</h3><p class="mut small">기록은 이 브라우저에만 저장돼요. 기기를 바꾸기 전에 꼭 백업하세요.</p>
      <div class="row-btns"><button class="btn" data-act="exportSave">백업 코드 복사</button><button class="btn" data-act="importSave">코드로 복원</button><button class="btn warn" data-act="resetSave">초기화</button></div></section>
    <section class="card"><h3>ℹ️ 정보</h3><p class="small">지우개 RPG ${VERSION_TXT}<br>책상 위에서 지우개를 튕겨 싸우는 추억의 놀이 RPG.<br>모든 효과음·음악은 브라우저에서 직접 합성됩니다.</p>
      <p class="small mut">홈 화면에 추가하면 앱처럼 설치 없이 오프라인에서도 즐길 수 있어요 (PWA).</p></section></div>`;
  $$('[data-set]', root).forEach((el) => {
    el.oninput = () => {
      const k = el.dataset.set;
      t[k] = el.type === 'checkbox' ? el.checked : +el.value;
      if (k === 'sound' || k === 'bgm') { setVolumes(t.sound, t.bgm); if (k === 'bgm') (t.bgm > 0 ? startBgm() : stopBgm()); if (k === 'sound') sfx.click(); }
      save();
    };
  });
};
acts.setGuide = (d) => { G.save.settings.guide = d.k; save(); refresh(); };
acts.exportSave = async () => {
  const code = exportCode(G.save);
  try { await navigator.clipboard.writeText(code); toast('📋 백업 코드를 복사했어요'); }
  catch (e) { await modal(`<h3>백업 코드</h3><textarea class="inp" rows="6" readonly onclick="this.select()">${code}</textarea><p class="small mut">전체 선택해서 복사해 두세요.</p>`); }
};
acts.importSave = () => {
  const root = $('#modal-root');
  const w = document.createElement('div'); w.className = 'modal-wrap';
  w.innerHTML = `<div class="modal"><div class="modal-body"><h3>코드로 복원</h3><textarea id="impc" class="inp" rows="6" placeholder="백업 코드를 붙여넣으세요"></textarea><p class="small warn-t">현재 기록이 덮어써집니다.</p></div><div class="modal-btns"><button class="btn" id="i-c">취소</button><button class="btn pri" id="i-o">복원</button></div></div>`;
  root.appendChild(w);
  w.querySelector('#i-c').onclick = () => w.remove();
  w.querySelector('#i-o').onclick = () => {
    try { const s = importCode(w.querySelector('#impc').value); G.save = s; persist(s); w.remove(); toast('✅ 복원 완료!'); go('home'); }
    catch (e) { toast('❌ ' + (e.message || '코드를 확인해 주세요')); }
  };
};
acts.resetSave = async () => {
  if (!(await confirmBox('<b>모든 기록이 삭제됩니다.</b><br>정말 초기화할까요?', '초기화', '취소'))) return;
  if (!(await confirmBox('되돌릴 수 없어요. 정말 정말요?', '네, 삭제', '취소'))) return;
  G.save = defaultSave(); persist(G.save); toast('초기화했어요'); go('title');
};
