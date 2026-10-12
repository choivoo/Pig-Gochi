import { useState } from 'react';
import { PetThumb } from '../../components/common';
import { EGGS, LINEAGE_NAME, SPECIES, STAGE_NAME } from '../../data/pets';
import { useGame } from '../../stores/gameStore';
import type { EggType } from '../../types';

export function StoragePanel() {
  const save = useGame((s) => s.save);
  const switchPet = useGame((s) => s.switchPet);
  const startNewEgg = useGame((s) => s.startNewEgg);
  const [egg, setEgg] = useState<EggType | null>(null);
  const [name, setName] = useState('');
  if (!save) return null;
  const pets = Object.values(save.ownedPets).sort((a, b) => a.bornAt - b.bornAt);
  const cur = save.activePetId ? save.ownedPets[save.activePetId] : undefined;
  const canNew = !cur || cur.stage === 'adult';
  return (
    <div className="stack">
      <div className="muted">함께한 친구들은 '친구들의 정원'에서 안전하게 지내요. 활성 펫은 한 마리만 돌볼 수 있고, 정원의 친구는 시간이 멈춰 있어요.</div>
      <div className="grid">
        {pets.map((p) => {
          const sp = SPECIES[p.speciesId];
          const active = p.uid === save.activePetId;
          return (
            <div key={p.uid} className={`card ${active ? 'selected' : ''}`}>
              <PetThumb speciesId={p.speciesId} frame={0} scale={p.stage === 'adult' || p.stage === 'child' ? 1 : 2} />
              <b>{p.name}</b>
              <small>{p.stage === 'egg' ? '알' : `${sp.name} · ${STAGE_NAME[p.stage]}`}</small>
              {sp && <small>{LINEAGE_NAME[sp.lineage]}</small>}
              <small>친밀도 {Math.round(p.stats.bond)} · 진화 {p.history.length}회</small>
              {active ? <span className="pill">함께 지내는 중</span> : <button className="btn small mint" onClick={() => switchPet(p.uid)}>데려오기</button>}
            </div>
          );
        })}
      </div>
      <div className="card" style={{ alignItems: 'stretch', textAlign: 'left' }}>
        <b>새로운 알 키우기</b>
        {!canNew ? <div className="muted">지금 키우는 펫이 성체가 되면 새로운 알을 받을 수 있어요.</div> : (
          <div className="stack">
            <div className="muted">지금 펫은 정원으로 옮겨져요. 언제든 다시 데려올 수 있어요.</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>{EGGS.map((e) => <button key={e.id} className={`btn small ${egg === e.id ? 'pink' : ''}`} onClick={() => setEgg(e.id)}>{e.name}</button>)}</div>
            <input className="input" placeholder="알의 이름 (최대 8자)" maxLength={8} value={name} onChange={(e) => setName(e.target.value)} aria-label="새 알의 이름" />
            <button className="btn pink" disabled={!egg} onClick={() => { if (egg) { const r = startNewEgg(egg, name); if (r.ok) useGame.getState().setPanel('none'); } }}>알 받기</button>
          </div>
        )}
      </div>
    </div>
  );
}
