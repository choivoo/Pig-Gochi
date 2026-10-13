import { useEffect, useState } from 'react';
import { now } from '../stores/gameStore';

export function useNow(intervalMs = 1000): number {
  const [t, setT] = useState(now());
  useEffect(() => {
    const id = window.setInterval(() => setT(now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}
