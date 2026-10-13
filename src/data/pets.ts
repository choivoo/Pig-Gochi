import type { Lineage, Personality, PetSpecies, Stage, Stats } from '../types';

const base = (o: Partial<Stats> = {}): Stats => ({ satiety: 80, happiness: 80, cleanliness: 90, energy: 90, health: 100, bond: 10, stress: 0, ...o });

interface Def {
  id: string; name: string; lineage: Lineage; stage: Stage; species: string; desc: string; dex: string;
  tags: Personality[]; fav: string; dis: string; toy: string; special: [string, string, string];
  evolve?: string[]; unlock: string; hint: string;
  affinity?: PetSpecies['affinity']; pa?: PetSpecies['personalityAffinity'];
}

const D: Def[] = [
  { id: 'mongle', name: '몽글', lineage: 'starlight', stage: 'baby', species: '별솜이', desc: '둥글고 작은 하얀 털뭉치. 별 모양 꼬리가 반짝여요.', dex: '별빛 알에서 태어나는 다정하고 잠이 많은 아기. 쓰다듬는 걸 제일 좋아해요.', tags: ['affectionate', 'sleepy'], fav: 'milk', dis: 'firejelly', toy: 'plush', special: ['star_bubble', '별빛 방울 만들기', '행복도가 올라가는 별빛 방울을 띄워요.'], evolve: ['mongsil', 'gureumi'], unlock: '별빛 알 부화', hint: '행복과 친밀도가 높으면 몽실, 푹 쉬고 차분하면 구르미로 자라요.', affinity: {} },
  { id: 'mongsil', name: '몽실', lineage: 'starlight', stage: 'child', species: '포근솜이', desc: '포근한 털과 연분홍빛 볼을 가진 밝은 아이.', dex: '쓰다듬어 주는 손길을 기다리는 애교쟁이.', tags: ['affectionate', 'lively'], fav: 'cookie', dis: 'fish', toy: 'plush', special: ['fluff_dance', '솜털 춤', '폭신폭신 춤을 춰요.'], evolve: ['solbyeol', 'daltsom'], unlock: '몽글 성장', hint: '친밀도가 높으면 솜별, 밤에 차분히 지내면 달솜이 돼요.', affinity: { happyMinutes: 1, bondGained: 1, strokes: 0.6 }, pa: { affectionate: 1 } },
  { id: 'gureumi', name: '구르미', lineage: 'starlight', stage: 'child', species: '구름솜이', desc: '구름 모양 몸의 하늘색 아이. 둥둥 떠다녀요.', dex: '느긋하게 떠다니며 쉬는 걸 좋아해요.', tags: ['calm', 'sleepy'], fav: 'juice', dis: 'pancake', toy: 'kite', special: ['float_nap', '둥실 낮잠', '허공에서 낮잠을 자요.'], evolve: ['gureumwang', 'pokpungmong'], unlock: '몽글 성장', hint: '잘 쉬고 차분하면 구름왕, 활발히 놀면 폭풍몽이 돼요.', affinity: { sleepCount: 1, restMinutes: 1, cleanMinutes: 0.4 }, pa: { calm: 1, sleepy: 1 } },
  { id: 'solbyeol', name: '솜별', lineage: 'starlight', stage: 'adult', species: '별의 수호자', desc: '밝고 다정한 별의 수호자.', dex: '머리 위에 작은 고리가 빛나는 다정한 수호자. 곁에 있는 것만으로 마음이 따뜻해져요.', tags: ['affectionate', 'calm'], fav: 'starcandy', dis: 'jelly', toy: 'plush', special: ['star_rain', '별빛 비', '반짝이는 별빛을 흩뿌려요.'], unlock: '몽실 성장 + 높은 친밀도', hint: '행복과 친밀도를 쌓아요.', affinity: { happyMinutes: 1, bondGained: 1.2, strokes: 0.5, favFoodCount: 0.4 }, pa: { affectionate: 1 } },
  { id: 'daltsom', name: '달솜', lineage: 'starlight', stage: 'adult', species: '달빛 솜이', desc: '밤과 달빛을 좋아하는 조용한 생명체.', dex: '이마의 초승달 무늬가 달빛을 모아요. 밤에 가장 활기차요.', tags: ['calm', 'shy'], fav: 'mooncookie', dis: 'icecream', toy: 'blocks', special: ['moon_gaze', '달 바라보기', '창밖의 달을 한참 바라봐요.'], unlock: '몽실 성장 + 밤 돌봄', hint: '밤에 함께 시간을 보내요.', affinity: { nightMinutes: 1.4, sleepCount: 0.7, restMinutes: 0.6 }, pa: { calm: 1, shy: 1 } },
  { id: 'gureumwang', name: '구름왕', lineage: 'starlight', stage: 'adult', species: '구름 왕', desc: '구름 위에 작은 왕관을 쓴 장난꾸러기.', dex: '왕관을 쓰고 의기양양! 사실은 장난이 제일 좋아요.', tags: ['prankster', 'sleepy'], fav: 'pudding', dis: 'soup', toy: 'kite', special: ['crown_pose', '왕관 자세', '왕관을 고쳐 쓰며 뽐내요.'], unlock: '구르미 성장 + 충분한 휴식', hint: '잘 재우고 깨끗하게 지내요.', affinity: { sleepCount: 1, restMinutes: 1, cleanMinutes: 0.6, happyMinutes: 0.4 }, pa: { prankster: 1, sleepy: 1 } },
  { id: 'pokpungmong', name: '폭풍몽', lineage: 'starlight', stage: 'adult', species: '번개 구름', desc: '번개 문양이 있는 활동적인 구름 생명체.', dex: '찌릿찌릿! 이마의 번개 무늬로 놀이를 즐겨요.', tags: ['lively', 'prankster'], fav: 'firejelly', dis: 'milk', toy: 'drum', special: ['thunder_hop', '번개 점프', '찌릿한 번개와 함께 점프해요.'], unlock: '구르미 성장 + 많은 놀이', hint: '미니게임과 놀이를 많이 해요.', affinity: { minigames: 1.2, toyPlays: 1, rhythmPlays: 0.6 }, pa: { lively: 1, prankster: 1 } },

  { id: 'toktok', name: '톡톡', lineage: 'flame', stage: 'baby', species: '불꼬마', desc: '주황색 둥근 몸에 불꽃 꼬리를 가진 호기심쟁이.', dex: '불꽃 알에서 태어나는 활동적인 아기. 놀자고 졸라요.', tags: ['lively', 'curious'], fav: 'pancake', dis: 'icecream', toy: 'ball', special: ['spark', '작은 불꽃 튀기기', '꼬리에서 작은 불꽃이 톡톡 튀어요.'], evolve: ['bulssi', 'jeongikong'], unlock: '불꽃 알 부화', hint: '운동하듯 놀면 불씨, 빠른 리듬을 좋아하면 전기콩이 돼요.' },
  { id: 'bulssi', name: '불씨', lineage: 'flame', stage: 'child', species: '불씨', desc: '머리 위 작은 불꽃이 타오르는 씩씩한 아이.', dex: '운동과 활발한 놀이를 좋아해요.', tags: ['lively'], fav: 'sandwich', dis: 'icecream', toy: 'ball', special: ['burn_up', '불타오르기', '의욕이 활활 타올라요.'], evolve: ['hwayeomtori', 'jaetbitryong'], unlock: '톡톡 성장', hint: '활발하고 배부르게 먹으면 화염토리, 차분히 쉬면 잿빛룡이 돼요.', affinity: { toyPlays: 1, minigames: 0.8, feeds: 0.4 }, pa: { lively: 1 } },
  { id: 'jeongikong', name: '전기콩', lineage: 'flame', stage: 'child', species: '전기콩', desc: '노란 콩 모양에 번개 무늬가 있어요.', dex: '리듬과 빠른 움직임을 좋아하는 번개콩.', tags: ['curious', 'prankster'], fav: 'banana', dis: 'soup', toy: 'drum', special: ['zap', '찌릿 인사', '손끝에서 찌릿 전기가 튀어요.'], evolve: ['beongaetto', 'neonkaet'], unlock: '톡톡 성장', hint: '리듬 게임을 하면 번개토, 밤에 놀면 네온캣이 돼요.', affinity: { rhythmPlays: 1.2, minigames: 0.8, toyPlays: 0.4 }, pa: { curious: 1, prankster: 1 } },
  { id: 'hwayeomtori', name: '화염토리', lineage: 'flame', stage: 'adult', species: '불꽃 수호자', desc: '활기찬 불꽃 수호자.', dex: '불꽃 날개를 펄럭이며 하루 종일 에너지가 넘쳐요.', tags: ['lively', 'glutton'], fav: 'sandwich', dis: 'milk', toy: 'ball', special: ['flame_flap', '불꽃 날갯짓', '불꽃 날개를 펄럭여요.'], unlock: '불씨 성장 + 활발한 돌봄', hint: '잘 먹이고 많이 놀아 줘요.', affinity: { feeds: 1, toyPlays: 1, favFoodCount: 0.6, minigames: 0.6 }, pa: { lively: 1, glutton: 1 } },
  { id: 'jaetbitryong', name: '잿빛룡', lineage: 'flame', stage: 'adult', species: '재의 작은 용', desc: '회색 비늘과 따뜻한 불씨를 가진 작은 용.', dex: '꼬리 끝의 불씨는 절대 꺼지지 않아요. 조용한 걸 좋아해요.', tags: ['calm', 'shy'], fav: 'fish', dis: 'jelly', toy: 'blocks', special: ['ember_nap', '불씨 낮잠', '꼬리의 불씨를 품고 낮잠을 자요.'], unlock: '불씨 성장 + 차분한 돌봄', hint: '차분히 쉬고 깨끗하게 지내요.', affinity: { restMinutes: 1, sleepCount: 0.8, cleanMinutes: 0.8, baths: 0.4 }, pa: { calm: 1, shy: 1 } },
  { id: 'beongaetto', name: '번개토', lineage: 'flame', stage: 'adult', species: '번개 토끼', desc: '빠르게 점프하는 전기 토끼.', dex: '긴 귀로 소리를 듣고 번개처럼 뛰어올라요.', tags: ['lively', 'curious'], fav: 'carrot', dis: 'fish', toy: 'drum', special: ['lightning_jump', '번개 점프', '번쩍! 높이 뛰어올라요.'], unlock: '전기콩 성장 + 리듬 놀이', hint: '리듬 탭을 자주 해요.', affinity: { rhythmPlays: 1.5, minigames: 1, toyPlays: 0.5 }, pa: { lively: 1, curious: 1 } },
  { id: 'neonkaet', name: '네온캣', lineage: 'flame', stage: 'adult', species: '네온 고양이', desc: '밤에 빛나는 꼬리를 가진 도트 고양이.', dex: '어둠 속에서 네온 줄무늬가 빛나요. 밤이 되면 눈이 반짝!', tags: ['prankster', 'curious'], fav: 'jelly', dis: 'carrot', toy: 'yarn', special: ['neon_glow', '네온 반짝', '온몸의 줄무늬가 반짝여요.'], unlock: '전기콩 성장 + 밤 놀이', hint: '밤에 놀고 늦게까지 함께해요.', affinity: { nightMinutes: 1.3, toyPlays: 1, minigames: 0.6 }, pa: { prankster: 1, curious: 1 } },

  { id: 'mulkong', name: '물콩', lineage: 'nature', stage: 'baby', species: '물방울콩', desc: '민트색 물방울 몸에 작은 잎이 돋았어요.', dex: '이슬 알에서 태어나는 차분하고 깨끗한 걸 좋아하는 아기.', tags: ['calm', 'curious'], fav: 'dewberry', dis: 'cookie', toy: 'ball', special: ['water_pop', '물방울 만들기', '통통 튀는 물방울을 만들어요.'], evolve: ['mulbangul', 'saessak'], unlock: '이슬 알 부화', hint: '자주 씻기면 물방울, 정원처럼 꾸며 주면 새싹이 돼요.' },
  { id: 'mulbangul', name: '물방울', lineage: 'nature', stage: 'child', species: '물방울', desc: '맑은 물방울 모양에 작은 지느러미가 있어요.', dex: '물놀이와 깨끗한 환경을 좋아해요.', tags: ['calm', 'lively'], fav: 'juice', dis: 'pancake', toy: 'ball', special: ['splash', '첨벙', '신나게 첨벙첨벙 물을 튀겨요.'], evolve: ['paadori', 'seoripin'], unlock: '물콩 성장', hint: '활기차게 놀면 파도리, 차분하고 깨끗하면 서리핀이 돼요.', affinity: { baths: 1, cleanMinutes: 1, happyMinutes: 0.3 }, pa: { calm: 1 } },
  { id: 'saessak', name: '새싹', lineage: 'nature', stage: 'child', species: '새싹이', desc: '머리에 새싹이 자라는 초록 아이.', dex: '정원과 자연을 좋아해요. 화분 곁에서 낮잠을 자요.', tags: ['curious', 'sleepy'], fav: 'carrot', dis: 'firejelly', toy: 'blocks', special: ['grow_leaf', '새싹 쑥쑥', '머리 위 새싹이 쑥 자라요.'], evolve: ['supyojeong', 'gasitori'], unlock: '물콩 성장', hint: '방을 예쁘게 꾸미면 숲요정, 수줍게 지내면 가시토리가 돼요.', affinity: { roomScore: 1.5, cleanMinutes: 0.6, happyMinutes: 0.4 }, pa: { curious: 1 } },
  { id: 'paadori', name: '파도리', lineage: 'nature', stage: 'adult', species: '파도 친구', desc: '파도 모양 꼬리가 특징인 물의 친구.', dex: '파도 꼬리를 흔들면 시원한 물보라가 일어요.', tags: ['lively', 'curious'], fav: 'fish', dis: 'cookie', toy: 'ball', special: ['wave_tail', '파도 꼬리', '물보라를 일으켜요.'], unlock: '물방울 성장 + 활발한 놀이', hint: '목욕과 놀이를 즐겨요.', affinity: { baths: 1, toyPlays: 1, minigames: 0.8 }, pa: { lively: 1, curious: 1 } },
  { id: 'seoripin', name: '서리핀', lineage: 'nature', stage: 'adult', species: '얼음 물고기', desc: '차분한 얼음빛 물고기형 생명체.', dex: '머리의 서리 결정은 차가운 아침에 가장 반짝여요.', tags: ['calm', 'shy'], fav: 'icecream', dis: 'soup', toy: 'blocks', special: ['frost_sparkle', '서리 반짝', '서리가 반짝반짝 빛나요.'], unlock: '물방울 성장 + 깨끗한 환경', hint: '항상 깨끗하게 유지해요.', affinity: { cleanMinutes: 1.4, baths: 1, restMinutes: 0.6 }, pa: { calm: 1, shy: 1 } },
  { id: 'supyojeong', name: '숲요정', lineage: 'nature', stage: 'adult', species: '숲의 요정', desc: '작은 나뭇잎 날개를 가진 숲의 생명체.', dex: '머리 꽃이 활짝 피면 기분이 최고라는 뜻이에요.', tags: ['curious', 'affectionate'], fav: 'strawberry', dis: 'fish', toy: 'plush', special: ['bloom', '꽃 피우기', '머리의 꽃이 활짝 피어나요.'], unlock: '새싹 성장 + 꾸민 방', hint: '방을 가구로 가득 꾸며 줘요.', affinity: { roomScore: 1.6, happyMinutes: 0.8, bondGained: 0.6 }, pa: { curious: 1, affectionate: 1 } },
  { id: 'gasitori', name: '가시토리', lineage: 'nature', stage: 'adult', species: '가시 새', desc: '나뭇잎과 작은 가시로 몸을 보호하는 수줍은 생명체.', dex: '낯을 가리지만 마음을 열면 가시를 눕혀요.', tags: ['shy', 'glutton'], fav: 'soup', dis: 'jelly', toy: 'blocks', special: ['thorn_hide', '가시 숨기', '가시를 세우고 쏙 숨어요.'], unlock: '새싹 성장 + 조용한 돌봄', hint: '조용히 먹이고 재우며 돌봐요.', affinity: { feeds: 1, sleepCount: 0.8, favFoodCount: 0.8, roomScore: 0.2 }, pa: { shy: 1, glutton: 1 } },
];

const stageStats: Record<Stage, Partial<Stats>> = { egg: {}, baby: {}, child: { bond: 15 }, adult: { bond: 20 } };

export const SPECIES: Record<string, PetSpecies> = Object.fromEntries(D.map((d) => [d.id, {
  id: d.id, name: d.name, description: d.desc, species: d.species, lineage: d.lineage, growthStage: d.stage,
  personalityTags: d.tags, favoriteFood: d.fav, dislikedFood: d.dis, favoriteToy: d.toy,
  baseStats: base(stageStats[d.stage]), animationSet: 'standard', spriteAtlas: `assets/pets/${d.id}.png`,
  dialoguePool: [d.lineage, d.stage, ...d.tags],
  specialAction: { id: d.special[0], name: d.special[1], effect: d.special[2] },
  evolutionCandidates: d.evolve ?? [], unlockConditions: d.unlock, encyclopediaDescription: d.dex,
  evolutionHint: d.hint, affinity: d.affinity, personalityAffinity: d.pa,
} as PetSpecies]));

export const SPECIES_LIST = D.map((d) => SPECIES[d.id]);
export const ALL_SPECIES_IDS = D.map((d) => d.id);
export const EGG_BABY: Record<string, string> = { starlight: 'mongle', flame: 'toktok', dew: 'mulkong' };
export const EGGS = [
  { id: 'starlight', name: '별빛 알', desc: '하얀색과 연보라색의 알. 부드럽고 따뜻한 분위기의 생명체가 태어나요.', baby: 'mongle' },
  { id: 'flame', name: '불꽃 알', desc: '주황색과 빨간색이 섞인 알. 활동적인 생명체가 태어나요.', baby: 'toktok' },
  { id: 'dew', name: '이슬 알', desc: '연하늘색과 민트색이 섞인 알. 차분하고 자연을 좋아하는 생명체가 태어나요.', baby: 'mulkong' },
] as const;
export const LINEAGE_NAME: Record<Lineage, string> = { starlight: '별빛 계열', flame: '불꽃 계열', nature: '자연 계열' };
export const STAGE_NAME: Record<string, string> = { egg: '알', baby: '아기', child: '어린 펫', adult: '성체' };
export const PERSONALITY_NAME: Record<Personality, string> = {
  lively: '활발함', calm: '차분함', affectionate: '애교', shy: '수줍음', curious: '호기심', prankster: '장난꾸러기', glutton: '먹보', sleepy: '잠꾸러기',
};
