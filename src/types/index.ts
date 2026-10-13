export type Stage = 'egg' | 'baby' | 'child' | 'adult';
export type Lineage = 'starlight' | 'flame' | 'nature';
export type EggType = 'starlight' | 'flame' | 'dew';
export type Personality = 'lively' | 'calm' | 'affectionate' | 'shy' | 'curious' | 'prankster' | 'glutton' | 'sleepy';
export type Emotion =
  | 'calm' | 'joy' | 'excited' | 'sleepy' | 'hungry' | 'sad'
  | 'bored' | 'angry' | 'tired' | 'sick' | 'affection' | 'curious';
export type Illness = 'cold' | 'tummy' | 'tired' | 'weak';
export type AccSlot = 'head' | 'face' | 'neck' | 'side';
export type FoodKind = 'meal' | 'snack' | 'drink' | 'sweet';

export interface Stats {
  satiety: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  health: number;
  bond: number;
  stress: number;
}
export type StatKey = keyof Stats;

export interface CareRecord {
  happyMinutes: number;
  cleanMinutes: number;
  restMinutes: number;
  nightMinutes: number;
  sleepCount: number;
  minigames: number;
  rhythmPlays: number;
  favFoodCount: number;
  bondGained: number;
  recoveries: number;
  toyPlays: number;
  strokes: number;
  feeds: number;
  baths: number;
  roomScore: number;
}

export interface EvolutionEvent {
  from: string;
  to: string;
  at: number;
  scores?: Record<string, number>;
}

export interface PetInstance {
  uid: string;
  speciesId: string;
  name: string;
  stage: Stage;
  hatchTaps: number;
  stats: Stats;
  bornAt: number;
  stageStartedAt: number;
  growthMinutes: number; // care minutes inside the current stage
  sleeping: boolean;
  illness: Illness | null;
  badMinutes: number;
  personality: Record<Personality, number>;
  seed: number;
  accessories: Partial<Record<AccSlot, string>>;
  care: CareRecord;
  history: EvolutionEvent[];
  lastFedAt: number;
  lastStrokeAt: number;
  strokeStreak: number;
  special: boolean; // adult 'special growth' (strong bond)
}

export interface PetSpecies {
  id: string;
  name: string;
  description: string;
  species: string;
  lineage: Lineage;
  growthStage: Stage;
  personalityTags: Personality[];
  favoriteFood: string;
  dislikedFood: string;
  favoriteToy: string;
  baseStats: Stats;
  animationSet: string;
  spriteAtlas: string;
  dialoguePool: string[];
  specialAction: { id: string; name: string; effect: string };
  evolutionCandidates: string[];
  unlockConditions: string;
  encyclopediaDescription: string;
  evolutionHint: string;
  /** Weights used by the evolution score function (see evolution.ts) */
  affinity?: Partial<Record<keyof CareRecord | 'personality', number>>;
  personalityAffinity?: Partial<Record<Personality, number>>;
}

export interface PlacedItem {
  uid: string;
  itemId: string; // furniture id
  x: number; // px, logical room space
  y: number; // px of the item's bottom edge
  flip: boolean;
}

export interface Settings {
  volume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
  tutorialSkipAnim: boolean;
}

export interface MissionProgress {
  id: string;
  progress: number;
  claimed: boolean;
}
export interface MissionState {
  dayKey: string;
  weekKey: string;
  daily: MissionProgress[];
  weekly: MissionProgress[];
  weekDays: string[];
}

export interface MinigameRecord {
  best: number;
  plays: number;
  bestGrade: number;
}

export interface SaveData {
  schemaVersion: number;
  playerProfile: { name: string; icon: string };
  activePetId: string | null;
  ownedPets: Record<string, PetInstance>;
  coins: number;
  inventory: Record<string, number>;
  ownedRooms: string[];
  roomTheme: string;
  roomLayout: PlacedItem[];
  encyclopedia: Record<string, { discoveredAt: number }>;
  achievements: Record<string, { unlockedAt: number }>;
  counters: Record<string, number>;
  missions: MissionState;
  minigameRecords: Record<string, MinigameRecord>;
  settings: Settings;
  tutorial: { step: number; done: boolean };
  claimed: string[];
  cooldowns: Record<string, number>;
  createdAt: number;
  lastSavedAt: number;
  lastSimulationAt: number;
  lastLoginDay: string;
  streak: number;
}

export interface Clock {
  now(): number;
}
