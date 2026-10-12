/** Central balance sheet. Every tunable number lives here. */
export const BALANCE = {
  schemaVersion: 1,
  startCoins: 60,
  tutorialReward: 120,
  decayPerHour: { satiety: 5, happiness: 4, cleanliness: 3, energy: 3 },
  /** while sleeping (per hour) */
  sleepPerHour: { energy: 30, satiety: -2, happiness: 0, cleanliness: -1 },
  wakeEnergy: 95,
  offline: {
    capHours: 8,
    /** offline decay never pushes a stat below these floors -> always recoverable */
    floors: { satiety: 15, happiness: 20, cleanliness: 20, energy: 15, health: 45, stress: 0 },
    maxStressGain: 35,
    growthCreditMinutes: 90,
    maxPlausibleHours: 24 * 30,
  },
  stress: { gainPerHourBad: 6, recoverPerHourGood: 4, badThreshold: 25 },
  health: {
    badStatThreshold: 20,
    badMinutesForDamage: 90,
    damagePerHour: 4,
    recoverPerHourGood: 3,
    illnessMinBadMinutes: 180,
  },
  growth: {
    hatchTaps: 5,
    babyToChildMinutes: 45,
    childToAdultMinutes: 480,
    /** care minutes only count while the pet is not neglected */
    neglectThreshold: 15,
    adultSpecialBondNeeded: 90,
  },
  care: {
    feedGlobalCooldownMs: 4000,
    overfedAt: 92,
    strokeCooldownMs: 1500,
    strokeBond: 1,
    strokeHappy: 2,
    strokeDiminish: 0.6, // reward multiplier per consecutive stroke inside the window
    strokeWindowMs: 20000,
    strokeMinMultiplier: 0.1,
    bath: { cleanliness: 45, happiness: 3, stress: -4 },
    sleepToggleCooldownMs: 3000,
    playToy: { happiness: 10, energy: -8, satiety: -4, bond: 1, cooldownMs: 6000 },
    plain: { rest: { health: 6, stress: -6, cooldownMs: 15000 } },
    heal: {
      rest: { health: 8, cost: 0 },
      medicine: { health: 25, cost: 0 },
      snack: { health: 15, cost: 0 },
      special: { health: 50, cost: 0 },
    },
    favoriteFoodHappyMultiplier: 2,
    dislikedFoodHappy: -8,
    favoriteToyHappyBonus: 4,
  },
  bondGainFeed: 1,
  bondGainFavorite: 2,
  minigame: {
    /** [minimum score fraction, coins] sorted high -> low (fraction of "max" score, see games) */
    rewardTiers: [
      { grade: 4, minFrac: 0.9, coins: 70 },
      { grade: 3, minFrac: 0.65, coins: 50 },
      { grade: 2, minFrac: 0.4, coins: 35 },
      { grade: 1, minFrac: 0.15, coins: 20 },
      { grade: 0, minFrac: 0, coins: 10 },
    ],
    dailyFullRewardPlays: 8, // after this many plays/day rewards shrink
    diminishedFactor: 0.4,
    happy: 8,
    bond: 2,
    energyCost: 6,
  },
  evolution: {
    caps: {
      happyMinutes: 300, cleanMinutes: 300, restMinutes: 200, nightMinutes: 120, sleepCount: 6, minigames: 8,
      rhythmPlays: 4, favFoodCount: 6, bondGained: 40, recoveries: 2, toyPlays: 10, strokes: 40, feeds: 25, baths: 6, roomScore: 10,
    },
    weightScale: 100,
    personalityScale: 20,
    preferenceBonus: 10,
  },
  economy: {
    firstEvolutionCoins: 100,
    dexReward: 40,
    dailyMissionCoins: 25,
    weeklyMissionCoins: 80,
    streakDailyCoins: 10,
    streakMaxDays: 7,
  },
  weather: { rainChance: 0.2, cloudyChance: 0.25, snowChance: 0.1 },
  autosaveDebounceMs: 800,
  tickMs: 1000,
} as const;
export type Balance = typeof BALANCE;
