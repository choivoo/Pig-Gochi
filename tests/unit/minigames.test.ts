import { describe, expect, it } from 'vitest';
import { Fishing, inZone, FISH, FISHING_ROUNDS } from '../../src/game/minigames/fishing';
import { MAZE_SIZE, MazeGame, generateMaze, mazeSolvable } from '../../src/game/minigames/maze';
import { MEM_LAYOUT, MemoryGame, memoryDeck, memoryMax, memoryScore } from '../../src/game/minigames/memory';
import { RhythmGame, WINDOWS, buildChart, chartMax, judge, comboBonus } from '../../src/game/minigames/rhythm';
import { Runner } from '../../src/game/minigames/runner';
import { STARS_DURATION, StarCatcher } from '../../src/game/minigames/stars';

describe('maze', () => {
  it('is always solvable from start to exit for every difficulty and many seeds', () => {
    for (const d of Object.keys(MAZE_SIZE) as (keyof typeof MAZE_SIZE)[]) {
      const { w, h } = MAZE_SIZE[d];
      for (let seed = 1; seed <= 40; seed++) {
        const g = generateMaze(w, h, seed);
        expect(mazeSolvable(g, [1, 1], [2 * w - 1, 2 * h - 1])).toBe(true);
        // every cell reachable (perfect maze)
        for (let y = 1; y < g.length; y += 2) for (let x = 1; x < g[0].length; x += 2) expect(mazeSolvable(g, [1, 1], [x, y])).toBe(true);
      }
    }
  });
  it('is deterministic per seed and differs between seeds', () => {
    expect(generateMaze(7, 5, 3)).toEqual(generateMaze(7, 5, 3));
    expect(generateMaze(7, 5, 3)).not.toEqual(generateMaze(7, 5, 4));
  });
  it('lets the player walk, collect stars, and finish; walls block movement', () => {
    const m = new MazeGame('easy', 5, 'mongle');
    // brute-force walk with BFS path
    const g = m.grid; const goal = m.exit;
    const prev = new Map<string, string>(); const q: [number, number][] = [[1, 1]]; prev.set('1,1', '');
    while (q.length) { const [x, y] = q.shift() as [number, number]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (g[ny]?.[nx] === false && !prev.has(`${nx},${ny}`)) { prev.set(`${nx},${ny}`, `${x},${y}`); q.push([nx, ny]); } } }
    const path: [number, number][] = []; let cur = `${goal[0]},${goal[1]}`;
    while (cur) { path.unshift(cur.split(',').map(Number) as [number, number]); cur = prev.get(cur) as string; }
    expect(m.step(-1, 0)).toBe(false); // outer wall
    for (let i = 1; i < path.length; i++) expect(m.step(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])).toBe(true);
    expect(m.isOver()).toBe(true);
    expect(m.result().score).toBeGreaterThanOrEqual(100);
    expect(m.result().score).toBeLessThanOrEqual(m.result().max);
  });
});

describe('memory', () => {
  it('has the documented card counts and every face appears exactly twice', () => {
    expect(MEM_LAYOUT.easy.cols * MEM_LAYOUT.easy.rows).toBe(6);
    expect(MEM_LAYOUT.normal.cols * MEM_LAYOUT.normal.rows).toBe(12);
    expect(MEM_LAYOUT.hard.cols * MEM_LAYOUT.hard.rows).toBe(16);
    const deck = memoryDeck(8, 42);
    for (let i = 0; i < 8; i++) expect(deck.filter((x) => x === i)).toHaveLength(2);
  });
  it('plays through to completion and scores within bounds', () => {
    const g = new MemoryGame('easy', 9);
    const pos = new Map<number, number[]>();
    g.cards.forEach((c, i) => pos.set(c.face, [...(pos.get(c.face) ?? []), i]));
    for (const [, [a, b]] of pos) { g.flip(a); g.flip(b); g.update(16); }
    expect(g.isOver()).toBe(true);
    expect(g.moves).toBe(3);
    const r = g.result();
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(r.max);
    expect(r.max).toBe(memoryMax(3));
  });
  it('mismatched cards flip back and cannot be clicked while locked', () => {
    const g = new MemoryGame('easy', 9);
    const f0 = g.cards[0].face;
    const other = g.cards.findIndex((c, i) => i > 0 && c.face !== f0);
    g.flip(0); g.flip(other);
    expect(g.flip(g.cards.findIndex((c, i) => i !== 0 && i !== other && !c.open))).toBe(false);
    g.update(800);
    expect(g.cards[0].open).toBe(false);
    expect(g.cards[other].open).toBe(false);
  });
  it('rewards fewer moves and less time', () => {
    expect(memoryScore(6, 6, 20)).toBeGreaterThan(memoryScore(6, 14, 20));
    expect(memoryScore(6, 6, 20)).toBeGreaterThan(memoryScore(6, 6, 55));
  });
});

describe('rhythm', () => {
  it('judges by the documented windows', () => {
    expect(judge(0)).toBe('PERFECT'); expect(judge(WINDOWS.perfect)).toBe('PERFECT');
    expect(judge(WINDOWS.perfect + 1)).toBe('GREAT'); expect(judge(-WINDOWS.great)).toBe('GREAT');
    expect(judge(WINDOWS.great + 1)).toBe('GOOD'); expect(judge(WINDOWS.good + 1)).toBe('MISS');
  });
  it('chart is deterministic and notes are ordered', () => {
    const a = buildChart(7);
    expect(a).toEqual(buildChart(7));
    for (let i = 1; i < a.length; i++) expect(a[i].t).toBeGreaterThanOrEqual(a[i - 1].t);
    expect(a.length).toBeGreaterThan(30);
  });
  it('a perfect autoplay reaches the maximum score; no input scores zero and all MISS', () => {
    const g = new RhythmGame(3);
    const notes = [...g.notes];
    let guard = 0;
    while (!g.isOver() && guard++ < 100000) {
      g.update(10);
      for (const n of notes) if (n.state === 'pending' && Math.abs(n.t - g.clock) <= 5) g.press(n.lane, n.t);
    }
    expect(g.counts.MISS).toBe(0);
    expect(g.result().score).toBe(chartMax(notes.length));
    const idle = new RhythmGame(3);
    let k = 0; while (!idle.isOver() && k++ < 100000) idle.update(10);
    expect(idle.score).toBe(0);
    expect(idle.counts.MISS).toBe(idle.notes.length);
  });
  it('combo bonus is capped', () => { expect(comboBonus(100)).toBe(20); });
  it('uses input time, so a late frame does not change the judgement', () => {
    const g = new RhythmGame(3);
    const n = g.notes[0];
    g.update(100); // clock far from the note
    g.press(n.lane, n.t + 10);
    expect(g.counts.PERFECT).toBe(1);
  });
});

describe('fishing', () => {
  it('zone test is inclusive of the zone and exclusive outside', () => {
    expect(inZone(0.5, 0.4, 0.2)).toBe(true); expect(inZone(0.4, 0.4, 0.2)).toBe(true); expect(inZone(0.61, 0.4, 0.2)).toBe(false); expect(inZone(0.39, 0.4, 0.2)).toBe(false);
  });
  it('bigger fish are harder: narrower zone, faster marker, more points', () => {
    expect(FISH.gold.zone).toBeLessThan(FISH.mid.zone); expect(FISH.mid.zone).toBeLessThan(FISH.small.zone);
    expect(FISH.gold.speed).toBeGreaterThan(FISH.small.speed); expect(FISH.gold.points).toBeGreaterThan(FISH.small.points);
  });
  it('a bot that taps inside the zone catches fish and ends after the configured rounds', () => {
    const g = new Fishing(11);
    let guard = 0;
    while (!g.isOver() && guard++ < 200000) {
      g.update(16);
      if (g.phase === 'bite' && inZone(g.marker, g.zoneStart, FISH[g.fish].zone)) g.tap();
    }
    expect(g.isOver()).toBe(true);
    expect(g.round).toBe(FISHING_ROUNDS);
    expect(g.score).toBeGreaterThan(0);
  });
  it('tapping too early loses the fish', () => {
    const g = new Fishing(11);
    g.tap();
    expect(g.phase).toBe('result');
    expect(g.score).toBe(0);
  });
});

describe('star catcher', () => {
  it('ends after the time limit and never goes negative', () => {
    const g = new StarCatcher(5);
    let t = 0;
    while (!g.isOver() && t < 60000) { g.update(16); t += 16; }
    expect(g.isOver()).toBe(true);
    expect(t / 1000).toBeGreaterThan(STARS_DURATION - 1);
    expect(g.score).toBeGreaterThanOrEqual(0);
  });
  it('a basket that tracks the nearest falling object beats an idle basket', () => {
    const smart = new StarCatcher(5); const idle = new StarCatcher(5);
    while (!smart.isOver()) {
      const target = smart.drops.filter((d) => d.kind !== 'rock').sort((a, b) => b.y - a.y)[0];
      if (target) smart.pointer('move', target.x);
      smart.update(16); idle.update(16);
    }
    while (!idle.isOver()) idle.update(16);
    expect(smart.score).toBeGreaterThan(idle.score);
  });
});

describe('runner', () => {
  it('colliding ends the game; jumping at the right time survives a long run', () => {
    const idle = new Runner(3, 'mongle');
    for (let i = 0; i < 2000 && !idle.isOver(); i++) idle.update(16);
    expect(idle.isOver()).toBe(true);
    const bot = new Runner(3, 'mongle');
    for (let i = 0; i < 3500 && !bot.isOver(); i++) {
      const next = bot.obstacles.find((o) => o.x + o.w > 28);
      if (next && next.x - 40 < bot.speed * 0.37 && next.x > 20) bot.jump();
      bot.update(16);
    }
    expect(bot.isOver()).toBe(false);
    expect(bot.score()).toBeGreaterThan(50);
  });
});
