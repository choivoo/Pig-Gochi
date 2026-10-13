import { DIALOGUE } from '../../data/dialogue';

export interface DialogueState { recent: string[] }
export const newDialogueState = (): DialogueState => ({ recent: [] });

/**
 * Picks a line for the first tag that has unseen lines; never repeats one of the
 * last 10 lines in a row. Falls back to 'idle'.
 */
export function pickLine(tags: string[], st: DialogueState, r: () => number = Math.random): string {
  const order = [...tags, 'idle'];
  for (const tag of order) {
    const pool = DIALOGUE.filter((l) => l.tags.includes(tag));
    const fresh = pool.filter((l) => !st.recent.includes(l.t));
    const use = fresh.length > 0 ? fresh : pool.filter((l) => l.t !== st.recent[st.recent.length - 1]);
    if (use.length === 0) continue;
    const line = use[Math.floor(r() * use.length)].t;
    st.recent.push(line);
    if (st.recent.length > 10) st.recent.shift();
    return line;
  }
  return '…';
}
