// 게임 데이터: 지우개, 스킬, 적, 장비, 챕터, 업적 등 (순수 데이터 + 헬퍼)
export const RARITY = {
  N: { name: '일반', color: '#9aa3ad', mult: 1.0, shard: 3 },
  R: { name: '고급', color: '#4aa3ff', mult: 1.15, shard: 4 },
  SR: { name: '희귀', color: '#a86bff', mult: 1.35, shard: 6 },
  SSR: { name: '전설', color: '#ffb800', mult: 1.6, shard: 10 },
  UR: { name: '신화', color: '#ff5fa2', mult: 2.0, shard: 20 },
};

// 액티브 스킬. cost = 집중력
export const SKILLS = {
  power: { name: '풀파워 튕기기', icon: '💪', cost: 20, desc: '이번 발사 속도 +35%', mod: { speedMul: 1.35 } },
  precise: { name: '정밀 조준', icon: '🎯', cost: 15, desc: '궤적 전체 표시, 흔들림 없음', mod: { guideFull: true } },
  curve: { name: '회전 슛', icon: '🌀', cost: 25, desc: '강한 회전으로 휘어 나감', mod: { curve: 1.7 } },
  shield: { name: '가루 방패', icon: '🛡️', cost: 30, desc: '2턴간 받는 피해 -40%', now: 'shield' },
  heal: { name: '응급 지우기', icon: '💚', cost: 35, desc: 'HP 25% 회복, 상태이상 해제', now: 'heal' },
  knock: { name: '넉백 강화', icon: '💥', cost: 25, desc: '이번 충돌 밀어내기 ×1.8', mod: { knockMul: 1.8 } },
  slick: { name: '미끄럼 코팅', icon: '🧈', cost: 20, desc: '이번 발사 마찰 절반 (멀리 감)', mod: { fmul: 0.5 } },
  rage: { name: '분노', icon: '🔥', cost: 30, desc: '3턴간 공격 +25%, 방어 -15%', now: 'rage' },
};

// 패시브 설명
export const PASSIVES = {
  none: ['', ''],
  edgeSave: ['끈질긴 모서리', '전투당 1회, 낙사하는 순간 책상 위로 버틴다'],
  sticky: ['끈적한 몸', '맞힌 적을 끈적이게 한다 (이동 -30%)'],
  coin: ['수집가', '코인 획득 +50%'],
  shieldStart: ['새 지우개', '전투 시작 시 방패 2턴'],
  splash: ['폭죽', '충돌 시 주변 적에게 50% 피해'],
  freeze: ['냉기', '충돌 시 25% 확률로 적 1턴 빙결'],
  revive: ['되감기', '전투당 1회, 쓰러지면 HP 40%로 부활'],
  blind: ['향기', '적의 조준 정확도가 크게 떨어진다'],
  growing: ['성장', '턴마다 공격력 +8% (최대 +40%)'],
  curveBoost: ['반달', '회전 효과 +40%'],
  heavy: ['육중함', '넉백 저항 +, 피해 감소 10%'],
  critBoost: ['날카로운 모서리', '치명타 확률 +10%'],
  split: ['퍼즐 조각', '첫 피격 시 피해 50% 감소'],
};

// 지우개 도감. hp/atk/def/spd는 Lv1 기본값. r=반지름, m=질량
export const ERASERS = {
  malrangi: { name: '말랑이', rar: 'N', emoji: '💗', color: '#ffe3e3', hp: 60, atk: 8, def: 2, spd: 10, r: 22, m: 1.0, crit: 5, passive: 'none', skills: ['power', 'precise', 'shield'], desc: '낙천적인 주인공. "틀린 건 지우면 돼, 지우~!"' },
  sand: { name: '모래지우개', rar: 'N', emoji: '🪨', color: '#cfcfd4', hp: 66, atk: 9, def: 3, spd: 7, r: 22, m: 1.15, crit: 4, passive: 'heavy', skills: ['power', 'knock', 'shield'], desc: '거칠거칠 든든. 잘 안 밀린다.' },
  cap: { name: '뚜껑이', rar: 'N', emoji: '🔘', color: '#ffd9a8', hp: 48, atk: 7, def: 1, spd: 16, r: 18, m: 0.7, crit: 8, passive: 'none', skills: ['slick', 'precise', 'curve'], desc: '연필 뚜껑에서 태어난 날쌘돌이.' },
  bignemo: { name: '큰네모', rar: 'R', emoji: '⬜', color: '#f4f4ff', hp: 90, atk: 9, def: 5, spd: 5, r: 27, m: 1.7, crit: 3, passive: 'heavy', skills: ['knock', 'shield', 'power'], desc: '무겁고 크다. 쉽게 밀리지 않는 탱커.' },
  half: { name: '반달이', rar: 'R', emoji: '🌙', color: '#fff3c4', hp: 62, atk: 9, def: 2, spd: 12, r: 21, m: 0.95, crit: 7, passive: 'curveBoost', skills: ['curve', 'precise', 'slick'], desc: '곡선 샷의 달인.' },
  glue: { name: '딱풀이', rar: 'R', emoji: '🧴', color: '#d6f5d6', hp: 70, atk: 8, def: 3, spd: 8, r: 22, m: 1.1, crit: 4, passive: 'sticky', skills: ['knock', 'heal', 'power'], desc: '닿으면 끈적끈적. 적이 느려진다.' },
  scent: { name: '딸기향이', rar: 'SR', emoji: '🍓', color: '#ffc2d1', hp: 72, atk: 11, def: 3, spd: 13, r: 21, m: 0.95, crit: 8, passive: 'blind', skills: ['precise', 'heal', 'curve'], desc: '달콤한 향에 적이 헷갈린다.' },
  ink: { name: '먹지우개', rar: 'SR', emoji: '🖤', color: '#9a9aa8', hp: 78, atk: 12, def: 4, spd: 9, r: 22, m: 1.25, crit: 10, passive: 'critBoost', skills: ['power', 'rage', 'knock'], desc: '검은 먹물처럼 날카로운 한 방.' },
  plastic: { name: '플라스틱왕', rar: 'SR', emoji: '💠', color: '#bfe9ff', hp: 64, atk: 13, def: 2, spd: 17, r: 19, m: 0.75, crit: 14, passive: 'critBoost', skills: ['slick', 'power', 'rage'], desc: '초경량 초고속. 모서리 한 방이 매섭다.' },
  bear: { name: '곰돌이', rar: 'SR', emoji: '🧸', color: '#ffd8b1', hp: 85, atk: 10, def: 4, spd: 10, r: 23, m: 1.2, crit: 5, passive: 'shieldStart', skills: ['shield', 'heal', 'power'], desc: '귀여움이 방패가 된다.' },
  puzzle: { name: '퍼즐이', rar: 'SR', emoji: '🧩', color: '#e6d5ff', hp: 74, atk: 10, def: 3, spd: 11, r: 22, m: 1.0, crit: 6, passive: 'split', skills: ['curve', 'shield', 'knock'], desc: '조각이 흩어져 첫 충격을 흡수한다.' },
  gold: { name: '황금지우개', rar: 'SSR', emoji: '🏅', color: '#ffe27a', hp: 110, atk: 13, def: 6, spd: 9, r: 24, m: 1.6, crit: 6, passive: 'coin', skills: ['power', 'knock', 'heal'], desc: '반짝반짝 묵직. 코인이 더 많이 나온다.' },
  ice: { name: '얼음지우개', rar: 'SSR', emoji: '🧊', color: '#cdf3ff', hp: 95, atk: 14, def: 5, spd: 12, r: 22, m: 1.2, crit: 8, passive: 'freeze', skills: ['slick', 'precise', 'shield'], desc: '차갑게 얼려버린다.' },
  firework: { name: '폭죽이', rar: 'SSR', emoji: '🎆', color: '#ffb3c6', hp: 88, atk: 16, def: 3, spd: 12, r: 22, m: 1.1, crit: 10, passive: 'splash', skills: ['power', 'rage', 'knock'], desc: '부딪히면 펑! 주변까지 번진다.' },
  king: { name: '거대 지우개 왕', rar: 'UR', emoji: '👑', color: '#ffdf8e', hp: 150, atk: 18, def: 8, spd: 10, r: 28, m: 2.0, crit: 10, passive: 'growing', skills: ['power', 'rage', 'shield'], desc: '턴이 갈수록 거대해지는 지우개의 왕.' },
  time: { name: '시간 지우개', rar: 'UR', emoji: '⏳', color: '#d9c7ff', hp: 120, atk: 17, def: 6, spd: 18, r: 22, m: 1.1, crit: 12, passive: 'revive', skills: ['precise', 'curve', 'heal'], desc: '쓰러져도 시간을 되감는다.' },
  infinite: { name: '무한 지우개', rar: 'UR', emoji: '♾️', color: '#ffffff', hp: 140, atk: 19, def: 7, spd: 14, r: 24, m: 1.5, crit: 12, passive: 'edgeSave', skills: ['power', 'heal', 'knock'], desc: '닳지 않는 전설. 책상 끝에서도 버틴다.' },
};
export const GACHA_POOLS = {
  N: ['malrangi', 'sand', 'cap'],
  R: ['bignemo', 'half', 'glue'],
  SR: ['scent', 'ink', 'plastic', 'bear', 'puzzle'],
  SSR: ['gold', 'ice', 'firework'],
};
export const STAR_COST = [5, 10, 20, 40, 80];

// 적 도감. aim=조준 정확도 기본, pers=성격(attack/edge/coward)
export const ENEMIES = {
  pencil: { name: '새 연필 병사', emoji: '✏️', color: '#f7d56a', hp: 30, atk: 6, def: 1, spd: 8, r: 20, m: 0.9, aim: 0.55, pers: 'attack', desc: '직선 돌진밖에 모르는 신병.' },
  fatpencil: { name: '뭉툭 연필', emoji: '🖍️', color: '#e9a64a', hp: 55, atk: 8, def: 3, spd: 5, r: 24, m: 1.5, aim: 0.5, pers: 'attack', desc: '느리지만 무거워 안 밀린다.' },
  sharp: { name: '샤프 정찰병', emoji: '🖊️', color: '#8fb6d9', hp: 25, atk: 10, def: 1, spd: 14, r: 18, m: 0.8, aim: 0.75, pers: 'edge', desc: '정밀하게 낙사를 노린다.' },
  ballpen: { name: '볼펜 용병', emoji: '🖋️', color: '#4a6bd6', hp: 40, atk: 9, def: 2, spd: 10, r: 20, m: 1.0, aim: 0.65, pers: 'attack', desc: '돈 되는 일이면 뭐든.' },
  marker: { name: '사인펜 암살자', emoji: '🖌️', color: '#e0457b', hp: 20, atk: 14, def: 0, spd: 18, r: 17, m: 0.7, aim: 0.8, pers: 'edge', desc: '낙사 유도 전문. 대신 약하다.' },
  slime: { name: '가루 슬라임', emoji: '🫧', color: '#eeeeee', hp: 35, atk: 4, def: 1, spd: 6, r: 21, m: 0.9, aim: 0.4, pers: 'coward', desc: '말랑말랑 가루 덩어리.' },
  highlighter: { name: '형광펜 광대', emoji: '🤡', color: '#d5ff3b', hp: 38, atk: 7, def: 2, spd: 11, r: 20, m: 0.95, aim: 0.6, pers: 'attack', desc: '눈부신 광대.' },
  crayon: { name: '크레파스 전사', emoji: '🖍️', color: '#ff7a59', hp: 60, atk: 12, def: 3, spd: 8, r: 22, m: 1.3, aim: 0.6, pers: 'attack', desc: '번지는 힘.' },
  scissors: { name: '가위 암살자', emoji: '✂️', color: '#b8c0cc', hp: 45, atk: 16, def: 2, spd: 13, r: 19, m: 1.0, aim: 0.75, pers: 'edge', desc: '날카로운 칼날.' },
  tape: { name: '테이프 요원', emoji: '🩹', color: '#f2e2b3', hp: 50, atk: 8, def: 3, spd: 9, r: 21, m: 1.1, aim: 0.6, pers: 'attack', sticky: true, desc: '닿으면 달라붙는다.' },
  compass: { name: '컴퍼스 창병', emoji: '🧭', color: '#7d8da1', hp: 52, atk: 15, def: 4, spd: 9, r: 21, m: 1.1, aim: 0.7, pers: 'attack', desc: '회전 찌르기.' },
  protractor: { name: '각도기 궁수', emoji: '📐', color: '#9fd8ff', hp: 40, atk: 11, def: 2, spd: 12, r: 20, m: 0.9, aim: 0.85, pers: 'edge', desc: '각도 계산의 달인.' },
  ironsharp: { name: '철제 샤프 기사', emoji: '🛡️', color: '#6c7a89', hp: 90, atk: 14, def: 7, spd: 7, r: 24, m: 1.8, aim: 0.7, pers: 'attack', desc: '단단한 금속 갑옷.' },
  stamp: { name: '도장 병사', emoji: '🔴', color: '#d64545', hp: 80, atk: 18, def: 5, spd: 7, r: 23, m: 1.6, aim: 0.65, pers: 'attack', desc: '쾅! 확정 도장.' },
  stapler: { name: '스테이플러 총잡이', emoji: '📎', color: '#555e6b', hp: 70, atk: 13, def: 4, spd: 10, r: 22, m: 1.3, aim: 0.8, pers: 'edge', desc: '철컥철컥.' },
  // 보스
  bossSharp: { name: '박 반장 샤프', emoji: '🖊️', color: '#5a8fc2', hp: 120, atk: 12, def: 4, spd: 12, r: 28, m: 2.2, aim: 0.85, pers: 'edge', boss: true, desc: '1반의 규율 담당. 직선 정밀 사격.' },
  boss2B: { name: '2B 총독', emoji: '🕶️', color: '#333', hp: 200, atk: 14, def: 6, spd: 9, r: 32, m: 2.8, aim: 0.8, pers: 'attack', boss: true, summon: 'pencil', desc: '연필 제국의 지방 총독.' },
  bossTri: { name: '삼색 볼펜 대장', emoji: '🖊️', color: '#e24a4a', hp: 240, atk: 16, def: 7, spd: 11, r: 30, m: 2.6, aim: 0.85, pers: 'attack', boss: true, summon: 'ballpen', desc: '빨강·파랑·검정의 삼형제 리더.' },
  bossZipper: { name: '필통 관리인 지퍼', emoji: '🧳', color: '#8b5cf6', hp: 330, atk: 18, def: 8, spd: 8, r: 34, m: 3.2, aim: 0.8, pers: 'attack', boss: true, summon: 'slime', desc: '지퍼를 열고 닫는 필통의 문지기.' },
  bossPalette: { name: '팔레트 마법사', emoji: '🎨', color: '#ff9f43', hp: 300, atk: 20, def: 8, spd: 11, r: 30, m: 2.6, aim: 0.88, pers: 'edge', boss: true, summon: 'crayon', desc: '색으로 지형을 바꾼다.' },
  bossNeon: { name: '형광 단장 네온', emoji: '🎪', color: '#2bff88', hp: 420, atk: 22, def: 9, spd: 13, r: 32, m: 3.0, aim: 0.88, pers: 'attack', boss: true, summon: 'highlighter', desc: '눈부신 서커스의 단장.' },
  bossMagnet: { name: '자석 박사', emoji: '🧲', color: '#e63946', hp: 400, atk: 24, def: 10, spd: 10, r: 31, m: 3.0, aim: 0.9, pers: 'edge', boss: true, summon: 'ironsharp', desc: '자기장을 다루는 박사.' },
  bossCompass: { name: '컴퍼스 대공', emoji: '🧭', color: '#457b9d', hp: 540, atk: 27, def: 12, spd: 11, r: 33, m: 3.4, aim: 0.9, pers: 'attack', boss: true, summon: 'compass', desc: '원을 그리며 몰아붙인다.' },
  bossWhistle: { name: '호루라기 코치', emoji: '📣', color: '#f4a261', hp: 520, atk: 28, def: 11, spd: 14, r: 32, m: 3.0, aim: 0.9, pers: 'edge', boss: true, summon: 'sharp', desc: '삑! 경기 시작.' },
  bossPE: { name: '체육 선생님 그림자', emoji: '👤', color: '#222', hp: 700, atk: 31, def: 13, spd: 12, r: 35, m: 3.8, aim: 0.92, pers: 'attack', boss: true, summon: 'marker', desc: '밤의 체육관에 드리운 그림자.' },
  bossRed: { name: '빨간 펜 채점관', emoji: '🖍️', color: '#e11d48', hp: 680, atk: 34, def: 14, spd: 13, r: 32, m: 3.2, aim: 0.93, pers: 'edge', boss: true, summon: 'stamp', desc: '틀렸다! 낙인을 찍는다.' },
  bossHB: { name: 'HB 대제', emoji: '👑', color: '#2d2d2d', hp: 1100, atk: 38, def: 16, spd: 12, r: 38, m: 4.5, aim: 0.95, pers: 'attack', boss: true, summon: 'fatpencil', desc: '"세상은 이제 내가 쓴 대로 확정된다!"' },
  // 허수아비(튜토리얼)
  dummy: { name: '지우개 가루 인형', emoji: '🧸', color: '#e8e0d0', hp: 20, atk: 2, def: 0, spd: 1, r: 22, m: 1.0, aim: 0.1, pers: 'coward', desc: '맞아도 아프지 않은 연습용 인형.' },
};

// 장비. slot: cover(커버) / case(케이스) / charm(부적)
export const EQUIP_TPL = {
  paper: { name: '종이 슬리브', slot: 'cover', icon: '📄', stats: { def: 3, hp: 6 } },
  vinyl: { name: '비닐 커버', slot: 'cover', icon: '🛍️', stats: { def: 4, spd: 1 } },
  metalcap: { name: '철제 캡', slot: 'cover', icon: '🔩', stats: { def: 7, hp: 10 } },
  cloth: { name: '천 필통', slot: 'case', icon: '👝', stats: { hp: 18 } },
  metalcase: { name: '금속 필통', slot: 'case', icon: '🥫', stats: { hp: 12, def: 3, atk: 1 } },
  clear: { name: '투명 케이스', slot: 'case', icon: '🧊', stats: { spd: 3, hp: 10 } },
  clover: { name: '네잎클로버 스티커', slot: 'charm', icon: '🍀', stats: { luck: 8, crit: 2 } },
  star: { name: '별 스티커', slot: 'charm', icon: '⭐', stats: { crit: 5, atk: 1 } },
  keyring: { name: '곰돌이 키링', slot: 'charm', icon: '🔑', stats: { atk: 3, spd: 1 } },
  candy: { name: '합격 엿', slot: 'charm', icon: '🍬', stats: { atk: 4, crit: 3 } },
};
export const SLOTS = { cover: '커버', case: '케이스', charm: '부적' };
export const EQ_RAR = { N: 1, R: 1.5, SR: 2.2, SSR: 3.2 };

// 챕터. 스테이지는 코드에서 생성(stages.js)
export const CHAPTERS = [
  { id: 0, name: '프롤로그: 첫 책상', icon: '🌙', bg: '#d9a86c', felt: '#c99a5e', surface: 'wood', lvBase: 1, count: 3 },
  { id: 1, name: '우리 반 책상', icon: '🏫', bg: '#d9a86c', felt: '#c99a5e', surface: 'wood', lvBase: 1, pool: ['pencil', 'fatpencil', 'sharp'], mid: 'bossSharp', boss: 'boss2B', count: 10 },
  { id: 2, name: '필통 미궁', icon: '👝', bg: '#6b5b8a', felt: '#5a4b78', surface: 'cloth', lvBase: 7, pool: ['ballpen', 'marker', 'slime'], mid: 'bossTri', boss: 'bossZipper', count: 10 },
  { id: 3, name: '미술실의 반란', icon: '🎨', bg: '#d98c8c', felt: '#c97a7a', surface: 'paint', lvBase: 14, pool: ['crayon', 'highlighter', 'slime', 'tape'], mid: 'bossPalette', boss: 'bossNeon', count: 10 },
  { id: 4, name: '과학실의 비밀', icon: '🔬', bg: '#7fb3a8', felt: '#6aa196', surface: 'steel', lvBase: 21, pool: ['scissors', 'compass', 'protractor', 'ironsharp'], mid: 'bossMagnet', boss: 'bossCompass', count: 10 },
  { id: 5, name: '체육관 대난투', icon: '🏀', bg: '#e8b66a', felt: '#d9a24f', surface: 'gym', lvBase: 28, pool: ['tape', 'scissors', 'highlighter', 'ironsharp'], mid: 'bossWhistle', boss: 'bossPE', count: 10 },
  { id: 6, name: '교무실 침투', icon: '📋', bg: '#a8a29a', felt: '#948e86', surface: 'office', lvBase: 35, pool: ['stamp', 'stapler', 'ironsharp', 'compass'], mid: 'bossRed', boss: 'bossHB', count: 10 },
];
// 표면: 마찰 배율
export const SURFACES = {
  wood: { mu: 1.0, name: '나무 책상' },
  cloth: { mu: 1.35, name: '천 필통' },
  paint: { mu: 0.9, name: '물감 책상' },
  steel: { mu: 0.8, name: '실험대' },
  gym: { mu: 0.55, name: '체육관 마루' },
  office: { mu: 1.0, name: '교무실 책상' },
};
export const ZONE_TYPES = {
  ice: { mu: 0.12, color: 'rgba(160,220,255,.55)', name: '얼음/물' },
  glue: { mu: 3.2, color: 'rgba(255,240,150,.6)', name: '풀' },
  sand: { mu: 2.0, color: 'rgba(230,220,200,.65)', name: '분필 가루' },
};

export const ACHIEVEMENTS = [
  { id: 'a_first', name: '첫 승리', desc: '전투에서 처음 승리', stat: 'wins', goal: 1, reward: { coin: 200 } },
  { id: 'a_win20', name: '단골 전사', desc: '전투 20번 승리', stat: 'wins', goal: 20, reward: { coin: 800, chalk: 2 } },
  { id: 'a_fall30', name: '낙사 장인', desc: '적을 30번 낙사시키기', stat: 'falls', goal: 30, reward: { coin: 600, chalk: 2 } },
  { id: 'a_fall200', name: '책상 위의 폭군', desc: '적을 200번 낙사시키기', stat: 'falls', goal: 200, reward: { chalk: 8 } },
  { id: 'a_pin10', name: '따먹기 입문', desc: '따먹기 10번 성공', stat: 'pins', goal: 10, reward: { coin: 500, chalk: 2 } },
  { id: 'a_combo5', name: '5콤보!', desc: '한 번의 샷으로 5콤보', stat: 'bestCombo', goal: 5, reward: { chalk: 3 } },
  { id: 'a_edge30', name: '가장자리의 사나이', desc: '아슬아슬 생존 30번', stat: 'edges', goal: 30, reward: { coin: 700, chalk: 2 } },
  { id: 'a_gacha50', name: '문방구 단골', desc: '뽑기 50회', stat: 'gachas', goal: 50, reward: { chalk: 5 } },
  { id: 'a_own8', name: '수집가', desc: '지우개 8종 보유', stat: 'owned', goal: 8, reward: { coin: 1000, chalk: 3 } },
  { id: 'a_own10', name: '지우개 왕국', desc: '지우개 10종 보유 → 왕 지우개 획득', stat: 'owned', goal: 10, reward: { eraser: 'king' } },
  { id: 'a_rogue10', name: '무한 책상 10방', desc: '무한 책상 10방 돌파', stat: 'rogueBest', goal: 10, reward: { chalk: 5 } },
  { id: 'a_rogue15', name: '시간을 되감다', desc: '무한 책상 15방 → 시간 지우개 획득', stat: 'rogueBest', goal: 15, reward: { eraser: 'time' } },
  { id: 'a_clear', name: '교실의 수호자', desc: 'HB 대제 격파 → 무한 지우개 획득', stat: 'hbClear', goal: 1, reward: { eraser: 'infinite' } },
  { id: 'a_stars', name: '별 수집가', desc: '스테이지 별 50개', stat: 'stars', goal: 50, reward: { chalk: 5, coin: 1500 } },
];

export const MISSION_POOL = [
  { id: 'm_win', name: '전투 3번 승리', stat: 'wins', goal: 3, reward: { coin: 200 } },
  { id: 'm_fall', name: '적 5번 낙사시키기', stat: 'falls', goal: 5, reward: { coin: 250 } },
  { id: 'm_shot', name: '지우개 30번 튕기기', stat: 'shots', goal: 30, reward: { coin: 150, chalk: 1 } },
  { id: 'm_combo', name: '2콤보 이상 달성', stat: 'combo2', goal: 1, reward: { coin: 200 } },
  { id: 'm_pin', name: '따먹기 1번 성공', stat: 'pins', goal: 1, reward: { chalk: 1 } },
  { id: 'm_crit', name: '치명타 3번', stat: 'crits', goal: 3, reward: { coin: 200 } },
  { id: 'm_gacha', name: '뽑기 1번', stat: 'gachas', goal: 1, reward: { coin: 100 } },
];

export const ATTENDANCE = [
  { coin: 300 }, { coin: 500 }, { chalk: 2 }, { coin: 800 }, { chalk: 3 }, { coin: 1200 }, { chalk: 5, coin: 1000 },
];

export const TIPS = [
  '모서리로 맞히면 더 아파요',
  '책상 끝은 위험해요!',
  '선생님 오기 전에 한 판만!',
  '살짝 닿은 채로 멈추면 따먹기!',
  '지우개를 비스듬히 잡고 당기면 휘어 나가요',
  '집중력이 가득 차면 스킬을 아끼지 마세요',
  '같은 지우개가 또 나오면 조각으로 변해요',
  '풀 위에서는 지우개가 달라붙어요',
];
