const hasBatchim = (s: string): boolean => {
  const c = s.charCodeAt(s.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
};
const isRieul = (s: string): boolean => (s.charCodeAt(s.length - 1) - 0xac00) % 28 === 8;
export const iga = (s: string): string => `${s}${hasBatchim(s) ? '이' : '가'}`;
export const eunneun = (s: string): string => `${s}${hasBatchim(s) ? '은' : '는'}`;
export const euro = (s: string): string => `${s}${hasBatchim(s) && !isRieul(s) ? '으로' : '로'}`;
