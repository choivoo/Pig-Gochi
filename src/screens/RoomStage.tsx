import { useEffect, useMemo, useRef } from 'react';
import { SPECIES } from '../data/pets';
import { startled } from '../game/core/care';
import { computeEmotion } from '../game/core/emotion';
import { evolutionReady } from '../game/core/evolution';
import { activePet } from '../game/core/progress';
import { seasonOf, timeOfDay, weatherFor } from '../game/core/weather';
import { dayKey } from '../game/core/util';
import { RoomView, type RoomViewState } from '../game/render/roomView';
import { useNow } from '../hooks/useNow';
import { now, onGameEvent, useGame } from '../stores/gameStore';
import type { PlacedItem } from '../types';

export interface StageProps {
  layoutOverride?: PlacedItem[];
  editMode?: boolean;
  selectedUid?: string | null;
  onEditSelect?: (uid: string | null) => void;
  onEditCommit?: (l: PlacedItem[]) => void;
  onFurniture?: (fn: string) => void;
  onLongPress?: () => void;
}

export function RoomStage(p: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<RoomView | null>(null);
  const save = useGame((s) => s.save);
  const bubble = useGame((s) => s.bubble);
  const store = useGame;
  const t = useNow(30000);

  const pet = save ? activePet(save) : undefined;
  const d = new Date(t);
  const tod = timeOfDay(d.getHours());
  const weather = weatherFor(dayKey(t), tod, seasonOf(d.getMonth()));
  const season = seasonOf(d.getMonth());

  const state: RoomViewState | null = useMemo(() => {
    if (!save || !pet) return null;
    return {
      theme: save.roomTheme, layout: p.layoutOverride ?? save.roomLayout, speciesId: pet.speciesId, stage: pet.stage, accessories: pet.accessories,
      sleeping: pet.sleeping, sick: !!pet.illness, special: pet.special, emotion: computeEmotion(pet, d.getHours()), personality: pet.personality, bond: pet.stats.bond,
      hatchTaps: pet.hatchTaps, tod, weather, season, editMode: !!p.editMode, selectedUid: p.selectedUid ?? null, lowPower: save.settings.lowPower,
      reducedMotion: save.settings.reducedMotion, evolveReady: !!evolutionReady(pet),
    };
  }, [save, p.layoutOverride, p.editMode, p.selectedUid, tod, weather, season]);

  // create the view once
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const v = new RoomView(c);
    viewRef.current = v;
    v.bubbleEl = bubbleRef.current;
    (window as unknown as { __PIXEL_LIFE__?: unknown }).__PIXEL_LIFE__ = { store: useGame, petScreenCenter: () => v.petScreenCenter() };
    v.start();
    const fit = () => {
      const w = wrap.current;
      if (!w) return;
      v.resize(w.clientWidth, w.clientHeight, window.devicePixelRatio || 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrap.current) ro.observe(wrap.current);
    window.addEventListener('orientationchange', fit);
    return () => { ro.disconnect(); window.removeEventListener('orientationchange', fit); v.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => { if (state && viewRef.current) viewRef.current.setState(state); }, [state]);

  // callbacks always see fresh props / store
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.cb = {
      onTapEgg: () => { store.getState().tapEgg(); },
      onTapPet: () => {
        const st = store.getState();
        st.say(['poke', 'greet'], true);
        v.actor.trigger('HAPPY', 700);
        v.spawn('heart', v.petCenter().x, v.petCenter().y - 6, 1);
      },
      onPoke: () => {
        const st = store.getState();
        st.say(['poke_many'], true);
        v.actor.trigger('INTERACTING', 1300);
        v.spawn('question', v.petCenter().x, v.petCenter().y - 10, 2, 20);
        v.spawn('exclaim', v.petCenter().x + 6, v.petCenter().y - 14, 1, 4);
        if (st.save) { const res = startled(st.save, now()); if (res.ok) st.apply(res, { silent: true }); }
      },
      onStroke: () => {
        const r = store.getState().stroke();
        v.spawn('heart', v.petCenter().x, v.petCenter().y - 6, 1, 20);
        if (!r.ok) return;
      },
      onLongPressPet: () => { if (p.onLongPress) p.onLongPress(); else store.getState().setPanel('status'); },
      onTapFurniture: (fn) => p.onFurniture?.(fn),
      onEditSelect: p.onEditSelect,
      onEditCommit: p.onEditCommit,
    };
  });

  // game events -> animations
  useEffect(() => {
    return onGameEvent((e) => {
      const v = viewRef.current;
      if (!v) return;
      const c = v.petCenter();
      switch (e.type) {
        case 'feed': v.startEating(); v.showFood(e.foodId); if (e.reaction === 'fav') v.spawn('heart', c.x, c.y, 3, 24); else if (e.reaction === 'dislike') v.spawn('sweat', c.x + 8, c.y, 2); else v.spawn('sparkle', c.x, c.y, 2, 20); break;
        case 'play': v.actor.trigger('PLAYING', 2200); v.spawn('music', c.x, c.y - 10, 2, 24); v.spawn('star', c.x, c.y, 2, 24); break;
        case 'heal': v.actor.trigger('HAPPY', 1000); v.spawn('sparkle', c.x, c.y, 4, 28); break;
        case 'special': v.actor.trigger('HAPPY', 1600); v.actor.jump(5); v.spawn('sparkle', c.x, c.y - 8, 5, 30); v.spawn('star', c.x, c.y - 8, 2, 30); break;
        case 'hatch': v.spawn('sparkle', 96, 110, 6, 40); break;
        case 'evolve': v.actor.trigger('EVOLVING', 3000, true); break;
        case 'coins': v.spawn('coin_fx', c.x, c.y - 8, Math.min(4, 1 + Math.floor(e.amount / 30)), 28); break;
        case 'pet': if (!e.rewarded) v.actor.trigger('HAPPY', 400); break;
        case 'bathe': v.spawn('foam', c.x, c.y, 3, 20); v.spawn('sparkle', c.x, c.y - 6, 3, 24); break;
        default: break;
      }
    });
  }, []);

  const sp = pet ? SPECIES[pet.speciesId] : undefined;
  return (
    <div className="stage" ref={wrap} aria-label={pet && sp ? `${pet.name}의 방` : '방'}>
      <canvas ref={canvas} role="img" aria-label={pet ? `${pet.name} (${sp?.name ?? '알'})이(가) 있는 방. 눌러서 반응을 볼 수 있어요.` : '방'} />
      <div ref={bubbleRef} className="bubble" style={{ left: '50%', top: '30%', display: bubble ? 'block' : 'none' }} aria-live="polite" role="status">{bubble?.text}</div>
    </div>
  );
}
