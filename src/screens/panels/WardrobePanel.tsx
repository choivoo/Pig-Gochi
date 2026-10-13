import { useState } from 'react';
import { Img } from '../../components/common';
import { PetPreview } from '../../components/PetPreview';
import { ACCESSORIES } from '../../data/items';
import { activePet } from '../../game/core/progress';
import { useGame } from '../../stores/gameStore';
import type { AccSlot } from '../../types';

const SLOTS: { id: AccSlot; name: string }[] = [{ id: 'head', name: '머리' }, { id: 'side', name: '머리핀·리본' }, { id: 'face', name: '얼굴' }, { id: 'neck', name: '목' }];

export function WardrobePanel() {
  const save = useGame((s) => s.save);
  const equip = useGame((s) => s.equip);
  const setPanel = useGame((s) => s.setPanel);
  const [slot, setSlot] = useState<AccSlot>('head');
  const pet = save && activePet(save);
  if (!save || !pet) return null;
  if (pet.stage === 'egg') return <div className="muted">알에게는 아직 꾸며 줄 수 없어요.</div>;
  const owned = ACCESSORIES.filter((a) => a.slot === slot && (save.inventory[`acc:${a.id}`] ?? 0) > 0);
  return (
    <div className="stack">
      <div className="center"><PetPreview speciesId={pet.speciesId} accessories={pet.accessories} scale={3} /></div>
      <div className="tabs" role="tablist">{SLOTS.map((s) => <button key={s.id} role="tab" className="tab" aria-selected={slot === s.id} onClick={() => setSlot(s.id)}>{s.name}</button>)}</div>
      <div className="grid">
        <button className="card" style={{ cursor: 'pointer' }} onClick={() => equip(slot, null)}><div className="thumb">✖</div><b>벗기</b></button>
        {owned.map((a) => (
          <button key={a.id} className={`card ${pet.accessories[slot] === a.id ? 'selected' : ''}`} style={{ cursor: 'pointer' }} onClick={() => equip(slot, a.id)} aria-label={`${a.name} 착용`}>
            <div className="thumb"><Img src={`assets/accessories/${a.id}.png`} size={48} /></div><b>{a.name}</b>
          </button>
        ))}
      </div>
      {owned.length === 0 && <div className="muted">이 부위의 액세서리가 없어요. 상점에서 구입해 보세요.</div>}
      <button className="btn mint" onClick={() => setPanel('shop')}>액세서리 사러 가기</button>
    </div>
  );
}
