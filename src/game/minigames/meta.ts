import type { GameId } from '../core/minigameReward';

export interface GameMeta { name: string; short: string; icon: string; how: string[]; difficulties?: { id: string; label: string }[] }
export const GAME_META: Record<GameId, GameMeta> = {
  stars: { name: '별 모으기', short: '떨어지는 별을 바구니로 받아요', icon: 'star_gold', how: ['별이 위에서 떨어져요. 바구니를 움직여 받으세요.', '노란 별 +10, 금빛 별 +30, 회색 돌 −15!', '모바일: 화면을 드래그 · PC: 마우스 또는 ←/→ 키', '45초 동안 시간이 지날수록 빨라져요.'] },
  fishing: { name: '낚시', short: '타이밍에 맞춰 물고기를 낚아요', icon: 'fish_gold', how: ['찌가 움직이면 곧 입질이 와요. "!"가 보이면 준비하세요.', '게이지의 초록 구간에 표시가 있을 때 화면을 누르세요(스페이스).', '큰 물고기일수록 구간이 좁고 빨라요. 총 8번 던져요.'] },
  memory: { name: '기억력 카드', short: '같은 그림을 찾아요', icon: 'card_back', how: ['카드를 눌러 뒤집고 같은 그림 두 장을 찾으세요.', '적은 횟수와 짧은 시간일수록 높은 점수예요.', '쉬움 6장 · 보통 12장 · 어려움 16장'], difficulties: [{ id: 'easy', label: '쉬움 (6장)' }, { id: 'normal', label: '보통 (12장)' }, { id: 'hard', label: '어려움 (16장)' }] },
  runner: { name: '점프 달리기', short: '장애물을 뛰어넘어요', icon: 'obstacle_rock', how: ['펫이 달려요! 장애물 앞에서 점프하세요.', '모바일: 화면 터치 · PC: 스페이스바 또는 마우스 클릭', '점점 빨라져요. 부딪히면 끝!'] },
  maze: { name: '미로 탐험', short: '별을 모아 출구로 가요', icon: 'flag', how: ['미로에서 별을 모으고 깃발 출구까지 가세요.', '모바일: 스와이프 또는 아래 방향 버튼 · PC: 방향키/WASD', '빨리 나갈수록 점수가 높아요. 미로는 항상 출구까지 길이 있어요.'], difficulties: [{ id: 'easy', label: '쉬움 (7×5)' }, { id: 'normal', label: '보통 (11×8)' }, { id: 'hard', label: '어려움 (15×11)' }] },
  rhythm: { name: '리듬 탭', short: '박자에 맞춰 눌러요', icon: 'note_tile', how: ['노트가 판정선에 닿을 때 해당 줄을 누르세요.', '모바일: 줄을 터치 · PC: A·S·D 또는 ←↓→ 키', 'PERFECT / GREAT / GOOD / MISS 판정과 콤보가 있어요.', '소리가 나지 않아도 화면의 노트를 보고 즐길 수 있어요.'] },
};
