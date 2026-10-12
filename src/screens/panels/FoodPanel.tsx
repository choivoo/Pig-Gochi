import { Img } from '../../components/common';
import { FOODS } from '../../data/items';
import { BALANCE } from '../../data/balance';
import { SPECIES } from '../../data/pets';
import { activePet } from '../../game/core/progress';
import { useGame } from '../../stores/gameStore';

export function FoodPanel() {
  const save = useGame((s) => s.save);
  const feed = useGame((s) => s.feed);
  const setPanel = useGame((s) => s.setPanel);
  const pet = save && activePet(save);
  if (!save || !pet) return null;
  const sp = SPECIES[pet.speciesId];
  const full = pet.stats.satiety >= BALANCE.care.overfedAt;
  const list = FOODS.filter((f) => f.price === 0 || (save.inventory[`food:${f.id}`] ?? 0) > 0);
  return (
    <div className="stack">
      <div className="muted">{pet.name}의 포만감 {Math.round(pet.stats.satiety)}/100 {full ? '· 배가 너무 불러요' : ''}</div>
      <div className="grid">
        {list.map((f) => {
          const qty = save.inventory[`food:${f.id}`] ?? 0;
          const fav = sp.favoriteFood === f.id, dis = sp.dislikedFood === f.id;
          return (
            <button key={f.id} className="card" style={{ cursor: 'pointer' }} disabled={full} onClick={() => { setPanel('none'); setTimeout(() => feed(f.id), 120); }} aria-label={`${f.name}${f.price === 0 ? ' 무료' : ` ${qty}개`}${fav ? ', 좋아하는 음식' : ''}${dis ? ', 싫어하는 음식' : ''}`}>
              {f.price > 0 && <span className="qty">×{qty}</span>}
              <div className="thumb"><Img src={`assets/food/${f.id}.png`} size={48} /></div>
              <b>{f.name}</b>
              <small>포만 +{f.satiety} · 행복 +{f.happiness}{f.health ? ` · 건강 +${f.health}` : ''}</small>
              {fav && <span className="pill" style={{ background: '#ffd0e0' }}>❤ 좋아해요</span>}
              {dis && <span className="pill" style={{ background: '#ddd' }}>✖ 싫어해요</span>}
              {f.price === 0 && <span className="pill">무료 · 무제한</span>}
            </button>
          );
        })}
      </div>
      <button className="btn mint" onClick={() => setPanel('shop')}>음식 사러 가기</button>
    </div>
  );
}
