export interface MissionDef { id: string; title: string; event: string; target: number; coins: number; weekly?: boolean }
export const DAILY_POOL: MissionDef[] = [
  { id: 'd_feed2', title: '먹이 2번 주기', event: 'feeds', target: 2, coins: 25 },
  { id: 'd_feed4', title: '먹이 4번 주기', event: 'feeds', target: 4, coins: 30 },
  { id: 'd_game1', title: '미니게임 1번 플레이', event: 'minigames', target: 1, coins: 25 },
  { id: 'd_game2', title: '미니게임 2번 플레이', event: 'minigames', target: 2, coins: 30 },
  { id: 'd_pet3', title: '펫 쓰다듬기 3번', event: 'strokes', target: 3, coins: 20 },
  { id: 'd_pet8', title: '펫 쓰다듬기 8번', event: 'strokes', target: 8, coins: 25 },
  { id: 'd_bath1', title: '목욕시키기 1번', event: 'baths', target: 1, coins: 20 },
  { id: 'd_sleep1', title: '잠자리에 들이기', event: 'sleeps', target: 1, coins: 20 },
  { id: 'd_play2', title: '장난감으로 놀기 2번', event: 'toyPlays', target: 2, coins: 25 },
];
export const WEEKLY_POOL: MissionDef[] = [
  { id: 'w_game10', title: '미니게임 누적 10회', event: 'minigames', target: 10, coins: 80, weekly: true },
  { id: 'w_days7', title: '펫과 7번 상호작용하는 날 만들기', event: 'activeDays', target: 7, coins: 100, weekly: true },
  { id: 'w_feed25', title: '먹이 누적 25번 주기', event: 'feeds', target: 25, coins: 70, weekly: true },
  { id: 'w_pet40', title: '쓰다듬기 누적 40번', event: 'strokes', target: 40, coins: 70, weekly: true },
];
export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries([...DAILY_POOL, ...WEEKLY_POOL].map((m) => [m.id, m]));
