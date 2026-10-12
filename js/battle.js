// 전투 로직 (렌더링과 분리). 이벤트는 this.emit 으로 UI/FX에 전달한다.
import { makeWorld, makeBody, step, isSettled, launch, mulberry32, clamp, inTable, edgeDistance, DT, W, H } from './physics.js';
import { shotSpeed, hitDamage, atkOf, defOf, MAX_PULL, MIN_PULL } from './combat.js';
import { planShot } from './ai.js';
import { SKILLS, ENEMIES, ERASERS } from './data.js';
import { enemyStats } from './rpg.js';

const TURN_TIME = 15;

export class Battle {
  /**
   * cfg: { stage, party:[{inst,stats,skills,hp?}], enemies:[{id,lv,x,y}|{build}], mode, diff, seed,
   *        humanTeams:[0]|[0,1], settings, bonus:{hp,atk,def,crit,spd} }
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.stage = cfg.stage;
    this.rng = mulberry32(cfg.seed || (Date.now() & 0xffff));
    this.diff = cfg.diff || 'normal';
    this.humanTeams = cfg.humanTeams || [0];
    this.settings = cfg.settings || {};
    const st = cfg.stage;
    this.world = makeWorld({ obstacles: st.obstacles, zones: st.zones, baseMu: st.baseMu });
    this.world.table = { ...this.world.table };
    this.handlers = [];
    this.nextId = 1;
    this.turnTeam = 0; this.turnNo = 1; this.phase = 'aim';
    this.focus = [0, 0];
    this.skip = [false, false];
    this.mods = {};
    this.selId = null;
    this.timeLeft = TURN_TIME;
    this.aiWait = 0.9;
    this.over = null;
    this.stat = { shots: 0, falls: 0, pins: 0, crits: 0, edges: 0, bestCombo: 0, dmgTaken: 0, turns: 0, combo2: 0, coinMul: 1 };
    this.minimal = !!cfg.headless;
    this.shotInfo = null;

    const bonus = cfg.bonus || {};
    // 아군
    const n = cfg.party.length;
    cfg.party.forEach((p, i) => {
      const x = 120 + (i % 2) * 70, y = n === 1 ? H / 2 : H / 2 + (i - (n - 1) / 2) * 110;
      this.addBody({ team: 0, x, y, name: p.name || ERASERS[p.inst.baseId].name, base: ERASERS[p.inst.baseId], stats: p.stats, inst: p.inst, skills: p.skills, hp: p.hp, bonus, kind: 'eraser' });
    });
    // 적
    cfg.enemies.forEach((e) => {
      if (e.build) {
        this.addBody({ team: 1, x: e.x, y: e.y, name: e.build.name, base: ERASERS[e.build.baseId], stats: e.build.stats, skills: e.build.skills, kind: 'eraser', pers: 'attack', aim: e.aim ?? 0.8 });
      } else {
        const def = ENEMIES[e.id];
        this.addBody({ team: 1, x: e.x, y: e.y, name: def.name, base: def, stats: enemyStats(e.id, e.lv), kind: 'enemy', enemyId: e.id, lv: e.lv, aim: def.aim, pers: def.pers, boss: !!def.boss });
      }
    });
    for (const b of this.world.bodies) {
      if (b.passive === 'shieldStart') b.status.shield = 2;
    }
    this.selId = this.world.bodies.find((b) => b.team === 0).id;
    // 선공: 민첩 비교 (친구 대결은 항상 팀0)
    if (cfg.speedFirst) {
      const s0 = Math.max(...this.bodiesOf(0).map((b) => b.spd)), s1 = Math.max(...this.bodiesOf(1).map((b) => b.spd));
      if (s1 > s0 * 1.3) { this.turnTeam = 1; }
    }
    this.beginTurn(true);
  }

  on(fn) { this.handlers.push(fn); }
  emit(type, data = {}) { data.type = type; for (const h of this.handlers) h(data); }

  addBody(o) {
    const s = o.stats, base = o.base, bonus = o.bonus || {};
    const maxhp = Math.round(s.hp * (1 + (bonus.hp || 0)));
    const b = makeBody({
      id: this.nextId++, team: o.team, x: o.x, y: o.y, r: s.r, m: s.m, angle: o.team === 0 ? 0 : Math.PI,
    });
    Object.assign(b, {
      name: o.name, emoji: base.emoji, color: base.color, kind: o.kind, enemyId: o.enemyId, lv: o.lv,
      maxhp, hp: o.hp != null ? Math.min(o.hp, maxhp) : maxhp,
      atk: s.atk * (1 + (bonus.atk || 0)), def: s.def + (bonus.def || 0), spd: s.spd + (bonus.spd || 0),
      crit: (s.crit || 5) + (bonus.crit || 0), critDmg: s.critDmg || 1.5, luck: s.luck || 5,
      passive: o.kind === 'eraser' ? base.passive : 'none', skills: o.skills || [], status: {}, flags: {}, growth: 0,
      aim: o.aim ?? 1, pers: o.pers || 'attack', boss: !!o.boss, inst: o.inst, spinCap: 1, pop: 0,
    });
    if (b.boss) b.e = 0.5;
    this.world.bodies.push(b);
    return b;
  }

  bodiesOf(team) { return this.world.bodies.filter((b) => b.team === team && b.alive && !b.fallen); }
  body(id) { return this.world.bodies.find((b) => b.id === id); }
  isHuman(team) { return this.humanTeams.includes(team); }

  // ===== 턴 =====
  beginTurn(first = false) {
    this.phase = 'aim'; this.mods = {};
    this.timeLeft = TURN_TIME; this.aiWait = 0.8 + this.rng() * 0.4;
    const mine = this.bodiesOf(this.turnTeam);
    if (!mine.some((b) => b.id === this.selId) && mine.length && this.isHuman(this.turnTeam)) this.selId = mine[0].id;
    if (this.skip[this.turnTeam]) {
      this.skip[this.turnTeam] = false;
      this.emit('skipped', { team: this.turnTeam });
      this.endTurn(true);
      return;
    }
    for (const b of mine) { if (b.passive === 'growing') b.growth++; }
    this.maybeShrink();
    this.emit('turn', { team: this.turnTeam, first });
  }

  // 선생님 순찰: 오래 끄는 전투는 책상이 점점 좁아진다 (교착 방지)
  maybeShrink() {
    if (this.turnTeam !== 0 || this.turnNo < 16 || this.turnNo % 2 !== 0 || this.shrunkAt === this.turnNo) return;
    this.shrunkAt = this.turnNo;
    const t = this.world.table;
    if (t.w <= 380 || t.h <= 210) return;
    // table 객체는 스테이지 간 공유되지 않도록 복사본으로 교체
    this.world.table = { x: t.x + 16, y: t.y + 12, w: t.w - 32, h: t.h - 24 };
    for (const b of this.world.bodies) if (b.alive && !b.fallen) this.placeInside(b);
    this.emit('shrink', {});
  }

  endTurn(skipped = false, extra = false) {
    if (!extra) {
      // 상태 지속시간 감소
      for (const b of this.world.bodies) {
        if (b.team !== this.turnTeam) continue;
        for (const k of Object.keys(b.status)) { b.status[k]--; if (b.status[k] <= 0) delete b.status[k]; }
      }
      this.turnTeam = 1 - this.turnTeam;
      if (this.turnTeam === 0) { this.turnNo++; }
    }
    this.stat.turns = this.turnNo;
    if (extra) this.emit('extra', { team: this.turnTeam });
    this.beginTurn();
  }

  // ===== 스킬 =====
  canUse(sid, bodyId) {
    const sk = SKILLS[sid], b = this.body(bodyId || this.selId);
    return !!sk && this.phase === 'aim' && b && b.alive && this.focus[b.team] >= sk.cost;
  }
  useSkill(sid) {
    const b = this.body(this.selId);
    if (!this.canUse(sid, this.selId)) return false;
    const sk = SKILLS[sid];
    this.focus[b.team] -= sk.cost;
    if (sk.now === 'shield') b.status.shield = 3;
    else if (sk.now === 'heal') { const h = Math.round(b.maxhp * 0.25); b.hp = Math.min(b.maxhp, b.hp + h); b.status = {}; this.emit('heal', { b, amount: h }); }
    else if (sk.now === 'rage') b.status.rage = 4;
    else this.mods = { ...this.mods, ...sk.mod, skillId: sid };
    this.emit('skill', { b, sid });
    return true;
  }

  curveFor(b, spin) {
    if (this.mods.curve) return (spin >= 0 ? 1 : -1) * this.mods.curve;
    if (this.settings.spin === false) return 0;
    return spin * 1.5 * (b.passive === 'curveBoost' ? 1.4 : 1);
  }

  // ===== 발사 =====
  // dx,dy: 발사 방향 단위벡터, power 0~1, spin -1~1
  shoot(b, dx, dy, power, spin = 0) {
    if (this.phase !== 'aim' || !b || !b.alive) return false;
    const mods = this.mods;
    const speed = shotSpeed(b, power, mods);
    const curve = this.curveFor(b, spin);
    launch(b, dx, dy, speed, curve, mods.fmul || 1);
    this.shotInfo = { shooter: b, team: b.team, hits: 0, dealt: false, contact: null, combo: 0, start: { x: b.x, y: b.y }, moved: new Map(), knock: mods.knockMul || 1, lastHitTurnDmg: 0 };
    for (const o of this.world.bodies) this.shotInfo.moved.set(o.id, { x: o.x, y: o.y });
    this.phase = 'sim';
    this.stat.shots++;
    this.emit('launch', { b, power, speed });
    return true;
  }

  autoShot(team) {
    const mine = this.bodiesOf(team), foes = this.bodiesOf(1 - team);
    if (!mine.length || !foes.length) return;
    const b = mine.find((x) => x.id === this.selId) || mine[0];
    let f = foes[0], bd = 1e9;
    for (const o of foes) { const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; f = o; } }
    const l = bd || 1;
    this.shoot(b, (f.x - b.x) / l, (f.y - b.y) / l, 0.45, 0);
  }

  aiTurn() {
    const team = this.turnTeam;
    const blind = this.bodiesOf(1 - team).some((b) => b.passive === 'blind') ? 1.6 : 1;
    const lead = this.bodiesOf(team)[0];
    if (lead && lead.enemyId === 'dummy') { // 허수아비는 얌전히 서 있다
      const a = this.rng() * Math.PI * 2;
      this.selId = lead.id; this.shoot(lead, Math.cos(a), Math.sin(a), 0.08, 0); return;
    }
    let aim = lead ? lead.aim : 0.7;
    let diff = this.diff;
    // 동적 난이도 보정
    if (this.cfg.dda && this.cfg.dda < 0) aim *= 0.85;
    const plan = planShot(this.world, team, { aim, diff, rngSeed: (this.rng() * 1e9) | 0, blind, mods: {} });
    if (!plan) { this.autoShot(team); return; }
    this.selId = plan.body.id;
    this.shoot(plan.body, plan.dx, plan.dy, plan.power, 0);
  }

  // ===== 업데이트 =====
  update(dt) {
    if (this.over) return;
    for (const b of this.world.bodies) { if (b.pop > 0) b.pop = Math.max(0, b.pop - dt * 4); }
    if (this.phase === 'aim') {
      if (this.isHuman(this.turnTeam)) {
        if (this.settings.timer !== false) {
          this.timeLeft -= dt;
          if (this.timeLeft <= 0 && !this.dragging) this.autoShot(this.turnTeam);
        }
      } else {
        this.aiWait -= dt;
        if (this.aiWait <= 0) this.aiTurn();
      }
    } else if (this.phase === 'sim') {
      this.acc = (this.acc || 0) + dt;
      let n = 0;
      while (this.acc >= DT && n++ < 6) {
        this.acc -= DT;
        step(this.world, DT);
        this.processEvents();
        if (this.over) return;
        if (isSettled(this.world)) { this.finishShot(); break; }
      }
    }
  }

  processEvents() {
    const evs = this.world.events;
    if (!evs.length) return;
    const list = evs.splice(0, evs.length);
    for (const e of list) {
      if (e.type === 'hit') this.onHit(e);
      else if (e.type === 'fall') this.onFall(e.b);
      else if (e.type === 'wall') this.emit('wall', e);
    }
  }

  critRoll(att) {
    if (this.rng() * 100 < att.crit) { this.stat.crits++; return att.critDmg; }
    return 1;
  }

  onHit(e) {
    const { a, b } = e;
    if (a.team === b.team) { this.emit('bump', { x: e.x, y: e.y, impact: e.impact }); return; }
    const si = this.shotInfo;
    const tot = e.spA + e.spB + 1;
    const involved = si && (a === si.shooter || b === si.shooter);
    let comboMul = 1;
    if (si) { si.hits++; if (si.hits > 1) comboMul = 1 + 0.15 * (si.hits - 1); }
    const pairs = [[a, b, e.spA / tot, 1], [b, a, e.spB / tot, -1]];
    for (const [att, def, share, sgn] of pairs) {
      if (!def.alive || def.fallen) continue;
      const crit = this.critRoll(att);
      let dmg = hitDamage(att, def, e.impact, share, comboMul) * crit;
      this.damage(def, dmg, { att, crit: crit > 1, x: e.x, y: e.y });
      if (att.team === this.shotTeam() ) { if (si) si.dealt = true; }
      // 넉백 강화
      if (si && att === si.shooter && si.knock > 1) {
        const k = e.impact * (si.knock - 1) * 0.8;
        def.vx += e.nx * sgn * k; def.vy += e.ny * sgn * k;
      }
      // 패시브
      if (att.passive === 'sticky' || (att.enemyId && ENEMIES[att.enemyId].sticky)) def.status.sticky = 2;
      if (att.passive === 'freeze' && this.rng() < 0.25) { this.skip[def.team] = true; this.emit('freeze', { b: def }); }
      if (att.passive === 'splash') {
        for (const o of this.world.bodies) {
          if (o.team !== att.team && o !== def && o.alive && !o.fallen && Math.hypot(o.x - def.x, o.y - def.y) < 130) this.damage(o, dmg * 0.5, { att, x: o.x, y: o.y });
        }
        this.emit('boom', { x: def.x, y: def.y });
      }
      if (att.team === 0) this.gainFocus(0, 10);
      else this.gainFocus(0, 6);
    }
    if (si) {
      si.combo = si.hits;
      if (involved) si.contact = { other: a === si.shooter ? b : a, impact: e.impact };
      if (si.hits >= 2) {
        this.stat.bestCombo = Math.max(this.stat.bestCombo, si.hits);
        if (si.hits === 2) this.stat.combo2++;
        this.emit('combo', { n: si.hits, x: e.x, y: e.y });
        if (si.team === 0) this.gainFocus(0, 5);
      }
    }
    this.emit('hit', { x: e.x, y: e.y, impact: e.impact, a, b });
  }

  shotTeam() { return this.shotInfo ? this.shotInfo.team : this.turnTeam; }

  gainFocus(team, n) { if (team === 0 || this.humanTeams.includes(1)) this.focus[team] = Math.min(100, this.focus[team] + n); }

  damage(def, dmg, info = {}) {
    if (!def.alive || def.fallen) return;
    if (def.passive === 'split' && !def.flags.split) { def.flags.split = true; dmg *= 0.5; this.emit('text', { x: def.x, y: def.y - 30, text: '조각 분리!', color: '#c9a6ff' }); }
    dmg = Math.max(1, Math.round(dmg));
    def.hp -= dmg; def.pop = 1;
    if (def.team === 0) { this.stat.dmgTaken += dmg; this.gainFocus(0, 8); }
    this.emit('damage', { b: def, dmg, crit: !!info.crit, x: info.x ?? def.x, y: info.y ?? def.y });
    if (def.hp <= 0) this.kill(def, 'hp');
  }

  kill(b, how) {
    if (!b.alive) return;
    if (b.passive === 'revive' && !b.flags.revived) {
      b.flags.revived = true; b.hp = Math.round(b.maxhp * 0.4); b.fallen = false; b.fallT = 0;
      this.placeInside(b);
      this.emit('revive', { b }); return;
    }
    b.hp = 0; b.alive = false;
    if (b.team === 1) {
      this.enemyDown(b, how);
    }
    this.emit('ko', { b, how });
    this.checkEnd();
  }
  enemyDown(b, how) {
    if (b.team === 1 && this.shotTeam() === 0) { /* 처치 기록 */ }
    if (b.team === 1) {
      this.cfg.onKill && this.cfg.onKill(b);
      this.stat.kills = (this.stat.kills || 0) + 1;
      if (how === 'fall') this.stat.falls++;
    }
  }

  placeInside(b) {
    const t = this.world.table;
    b.x = clamp(b.x, t.x + b.r + 8, t.x + t.w - b.r - 8);
    b.y = clamp(b.y, t.y + b.r + 8, t.y + t.h - b.r - 8);
    b.vx = 0; b.vy = 0;
  }

  onFall(b) {
    // 필통 쿠션: 쉬움/보통에서는 첫 낙사를 한 번 받쳐준다 (억울한 죽음 방지)
    if (b.team === 0 && this.cfg.cushion && !b.flags.cushion && !(b.passive === 'edgeSave' && !b.flags.saved)) {
      b.flags.cushion = true; b.fallen = false; b.fallT = 0; this.placeInside(b);
      b.hp = Math.max(1, b.hp - Math.round(b.maxhp * 0.25));
      this.emit('cushion', { b }); return;
    }
    if (b.passive === 'edgeSave' && !b.flags.saved) {
      b.flags.saved = true; b.fallen = false; b.fallT = 0; this.placeInside(b);
      this.emit('save', { b }); return;
    }
    if (b.boss) {
      b.fallen = false; b.fallT = 0; this.placeInside(b);
      this.damage(b, b.maxhp * 0.3, { x: b.x, y: b.y });
      if (b.alive) { this.skip[b.team] = true; this.emit('stagger', { b }); }
      return;
    }
    if (b.passive === 'revive' && !b.flags.revived) {
      b.flags.revived = true; b.hp = Math.round(b.maxhp * 0.4); b.fallen = false; b.fallT = 0;
      this.placeInside(b); this.emit('revive', { b }); return;
    }
    b.hp = 0; b.dead = true;
    if (b.team === 1) this.enemyDown(b, 'fall');
    this.emit('fallout', { b });
  }

  finishShot() {
    const si = this.shotInfo;
    const team = si ? si.team : this.turnTeam;
    // 낙하 중이던 사망체 제거
    for (const b of this.world.bodies) if (b.dead) b.alive = false;
    if (this.checkEnd()) return;
    // 따먹기: 살짝 닿은 채로 멈춘 경우
    if (si && si.contact && si.shooter.alive && !si.shooter.fallen) {
      const o = si.contact.other, s = si.shooter;
      if (o.alive && !o.fallen && o.team !== s.team && si.contact.impact < 140 && Math.hypot(o.x - s.x, o.y - s.y) <= (o.r + s.r) * 1.05) {
        this.stat.pins += s.team === 0 ? 1 : 0;
        const crit = this.critRoll(s);
        this.emit('pin', { a: s, b: o, x: (s.x + o.x) / 2, y: (s.y + o.y) / 2 });
        this.damage(o, atkOf(s) * 2.4 * crit * (o.boss ? 0.7 : 1), { att: s, crit: crit > 1, x: o.x, y: o.y });
        si.dealt = true;
        if (o.alive) { const l = Math.hypot(o.x - s.x, o.y - s.y) || 1; o.vx = ((o.x - s.x) / l) * 200; o.vy = ((o.y - s.y) / l) * 200; }
        if (this.checkEnd()) return;
        if (o.alive) { // 짧게 한 번 더 시뮬레이션(밀려남 처리)
          this.phase = 'sim'; this.shotInfo.contact = null; return;
        }
      }
    }
    // 아슬아슬
    for (const b of this.world.bodies) {
      if (!b.alive || b.fallen) continue;
      if (b.team === 0 && si) {
        const m = si.moved.get(b.id);
        const moved = m && Math.hypot(m.x - b.x, m.y - b.y) > 25;
        if (moved && edgeDistance(this.world, b) < b.r * 0.55 && inTable(this.world, b)) {
          this.stat.edges++; this.gainFocus(0, 15);
          this.emit('edge', { b });
        }
      }
    }
    // 보스 소환
    if (this.turnTeam === 1) this.bossSummon();
    // 추가 턴
    let extra = false;
    if (si && si.dealt && si.shooter.alive) {
      const ch = clamp(si.shooter.spd * 0.45, 0, 22);
      if (this.rng() * 100 < ch) extra = true;
    }
    this.shotInfo = null;
    if (this.checkEnd()) return;
    this.emit('shotEnd', { team });
    this.endTurn(false, extra);
  }

  bossSummon() {
    for (const b of this.bodiesOf(1)) {
      if (!b.boss || b.flags.summoned) continue;
      if (b.hp <= b.maxhp * 0.5) {
        const def = ENEMIES[b.enemyId];
        if (!def.summon) continue;
        b.flags.summoned = true;
        const t = this.world.table;
        for (let i = 0; i < 2; i++) {
          const ang = this.rng() * Math.PI * 2;
          const x = clamp(b.x + Math.cos(ang) * (b.r + 50), t.x + 40, t.x + t.w - 40);
          const y = clamp(b.y + Math.sin(ang) * (b.r + 50), t.y + 40, t.y + t.h - 40);
          const m = this.addBody({ team: 1, x, y, name: ENEMIES[def.summon].name, base: ENEMIES[def.summon], stats: enemyStats(def.summon, Math.max(1, b.lv - 3)), kind: 'enemy', enemyId: def.summon, lv: b.lv - 3, aim: ENEMIES[def.summon].aim, pers: ENEMIES[def.summon].pers });
          m.minion = true; m.pop = 1;
        }
        this.emit('summon', { b });
      }
    }
  }

  checkEnd() {
    if (this.over) return true;
    const a0 = this.world.bodies.some((b) => b.team === 0 && b.alive && !b.dead);
    const a1 = this.world.bodies.some((b) => b.team === 1 && b.alive && !b.dead);
    if (a0 && a1) return false;
    this.over = !a1 && a0 ? 'win' : !a0 && a1 ? 'lose' : 'draw';
    this.phase = 'over';
    this.emit('end', { result: this.over });
    return true;
  }

  // 현재 HP 비율 (별 평가용)
  hpRatio() {
    const mine = this.world.bodies.filter((b) => b.team === 0);
    const hp = mine.reduce((s, b) => s + Math.max(0, b.hp), 0), mx = mine.reduce((s, b) => s + b.maxhp, 0);
    return hp / mx;
  }
}
