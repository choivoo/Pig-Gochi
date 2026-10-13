import { useState } from 'react';
import { Icon } from '../../components/common';
import { TOYS, TOY_ICON } from '../../data/items';
import { SPECIES } from '../../data/pets';
import { GAME_META } from '../../game/minigames/meta';
import { GAME_IDS } from '../../game/core/minigameReward';
import { ownsToy } from '../../game/core/care';
import { activePet } from '../../game/core/progress';
import { useGame } from '../../stores/gameStore';

export function PlayPanel({ tab: initial }: { tab: 'toys' | 'games' }) {
  const [tab, setTab] = useState(initial);
  const save = useGame((s) => s.save);
  const play = useGame((s) => s.play);
  const setPanel = useGame((s) => s.setPanel);
  const startMinigame = useGame((s) => s.startMinigame);
  const pet = save && activePet(save);
  if (!save || !pet) return null;
  const sp = SPECIES[pet.speciesId];
  return (
    <div>
      <div className="tabs" role="tablist">
        <button role="tab" className="tab" aria-selected={tab === 'toys'} onClick={() => setTab('toys')}>장난감</button>
        <button role="tab" className="tab" aria-selected={tab === 'games'} onClick={() => setTab('games')}>미니게임 6종</button>
      </div>
      {tab === 'toys' && (
        <div className="grid">
          {TOYS.map((t) => {
            const has = ownsToy(save, t.id);
            return (
              <button key={t.id} className={`card ${has ? '' : 'locked'}`} disabled={!has} style={{ cursor: has ? 'pointer' : 'default' }} onClick={() => { setPanel('none'); setTimeout(() => play(t.id), 120); }}>
                <div className="thumb"><Icon name={TOY_ICON[t.id]} size="lg" /></div>
                <b>{t.name}</b>
                <small>{has ? t.desc : '상점에서 구입'}</small>
                {sp.favoriteToy === t.id && <span className="pill" style={{ background: '#ffd0e0' }}>❤ 가장 좋아해요</span>}
              </button>
            );
          })}
        </div>
      )}
      {tab === 'games' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {GAME_IDS.map((id) => {
            const m = GAME_META[id];
            const rec = save.minigameRecords[id];
            return (
              <button key={id} className="card" style={{ cursor: 'pointer' }} onClick={() => startMinigame(id)} aria-label={`${m.name} 시작`}>
                <div className="thumb"><img src={`${import.meta.env.BASE_URL}assets/minigames/${m.icon}.png`} alt="" style={{ width: 48, height: 48, objectFit: 'contain', imageRendering: 'pixelated' }} /></div>
                <b>{m.name}</b>
                <small>{m.short}</small>
                <small>최고 점수 {rec?.best ?? 0} · {rec?.plays ?? 0}회</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
