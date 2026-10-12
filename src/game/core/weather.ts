import { BALANCE } from '../../data/balance';
import { hashString, rng } from './util';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'starry';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const timeOfDay = (hour: number): TimeOfDay => (hour >= 6 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'evening' : 'night');
export const seasonOf = (month0: number): Season => (month0 >= 2 && month0 <= 4 ? 'spring' : month0 >= 5 && month0 <= 7 ? 'summer' : month0 >= 8 && month0 <= 10 ? 'autumn' : 'winter');
export const WEATHER_NAME: Record<Weather, string> = { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈', starry: '별빛 밤' };
export const TOD_NAME: Record<TimeOfDay, string> = { morning: '아침', day: '낮', evening: '저녁', night: '밤' };

/** Weather is seeded by calendar day so re-entering the screen never re-rolls it. */
export function weatherFor(dayKeyStr: string, tod: TimeOfDay, season: Season): Weather {
  const r = rng(hashString(dayKeyStr))();
  const W = BALANCE.weather;
  let w: Weather = 'clear';
  if (r < W.rainChance) w = season === 'winter' ? 'snow' : 'rain';
  else if (r < W.rainChance + W.cloudyChance) w = 'cloudy';
  else if (r < W.rainChance + W.cloudyChance + W.snowChance && season === 'winter') w = 'snow';
  if (tod === 'night' && w === 'clear') return 'starry';
  return w;
}
