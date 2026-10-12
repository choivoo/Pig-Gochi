import type { Emotion, PetInstance } from '../../types';

export const EMOTION_LABEL: Record<Emotion, string> = {
  calm: '평온', joy: '기쁨', excited: '신남', sleepy: '졸림', hungry: '배고픔', sad: '슬픔',
  bored: '지루함', angry: '화남', tired: '피곤함', sick: '아픔', affection: '애정', curious: '호기심',
};
export const EMOTION_ICON: Record<Emotion, string> = {
  calm: '🙂', joy: '😊', excited: '🤩', sleepy: '😪', hungry: '🍽️', sad: '😢', bored: '😑', angry: '😠', tired: '😩', sick: '🤒', affection: '🥰', curious: '🧐',
};
/** Which sprite frame an emotion maps to (see FRAMES in scripts/assets/pets.py) */
export const EMOTION_FRAME: Record<Emotion, string> = {
  calm: 'idle', joy: 'happy', excited: 'happy', sleepy: 'idle', hungry: 'sad', sad: 'sad', bored: 'idle', angry: 'sad', tired: 'sad', sick: 'sick', affection: 'happy', curious: 'idle',
};

export function computeEmotion(p: PetInstance, hour: number, recentlyPetted = false): Emotion {
  const s = p.stats;
  if (p.sleeping) return 'sleepy';
  if (p.illness || s.health < 30) return 'sick';
  if (s.satiety < 25) return 'hungry';
  if (s.energy < 20) return 'tired';
  if (s.stress > 70 && s.happiness < 45) return 'angry';
  if (s.energy < 35) return 'sleepy';
  if (s.happiness < 30) return 'sad';
  if (recentlyPetted && s.bond > 20) return 'affection';
  if (s.happiness < 50 && s.stress < 40) return 'bored';
  if (s.bond > 60 && s.happiness > 65) return 'affection';
  if (s.happiness > 85) return 'excited';
  if (s.happiness > 65) return 'joy';
  if ((p.personality.curious > 60 || p.personality.prankster > 60) && (hour + p.seed) % 3 === 0) return 'curious';
  return 'calm';
}

export function needTags(p: PetInstance, emotion: Emotion): string[] {
  const tags: string[] = [];
  if (p.sleeping) return ['sleeping'];
  if (p.illness) tags.push('sick');
  if (p.stats.satiety < 30) tags.push('hungry');
  if (p.stats.cleanliness < 30) tags.push('dirty');
  if (p.stats.energy < 30) tags.push('sleepy');
  if (emotion === 'bored') tags.push('bored');
  if (emotion === 'sad') tags.push('sad');
  if (emotion === 'angry') tags.push('angry');
  if (emotion === 'affection') tags.push('love');
  if (emotion === 'excited' || emotion === 'joy') tags.push('happy');
  if (emotion === 'curious') tags.push('curious');
  if (emotion === 'tired') tags.push('tired');
  return tags;
}
