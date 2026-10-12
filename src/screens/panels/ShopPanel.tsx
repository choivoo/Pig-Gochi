import { useRef, useState } from 'react';
import { Icon, Img } from '../../components/common';
import { CATEGORY_NAME, SHOP_ITEMS, type ItemCategory } from '../../data/items';
import { isUnlocked, unlockText } from '../../game/core/economy';
import { useGame } from '../../stores/gameStore';

const CATS = Object.keys(CATEGORY_NAME) as ItemCategory[];

export function ShopPanel() {
  const save = useGame((s) => s.save);
  const buy = useGame((s) => s.buy);
  const [cat, setCat] = useState<ItemCategory>('food');
  const [sel, setSel] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const lock = useRef(0);
  if (!save) return null;
  const items = SHOP_ITEMS.filter((i) => i.category === cat);
  const item = items.find((i) => i.id === sel) ?? null;
  const ownedCount = (id: string, c: ItemCategory) => (c === 'room' ? (save.ownedRooms.includes(id.replace('room:', '')) ? 1 : 0) : (save.inventory[id] ?? 0));
  const doBuy = () => {
    if (!item) return;
    const t = performance.now();
    if (t - lock.current < 450) return; // swallow double taps
    lock.current = t;
    buy(item.id, item.stackable ? qty : 1);
  };
  const total = item && item.price !== null ? item.price * (item.stackable ? qty : 1) : 0;
  const unlocked = item ? isUnlocked(save, item.unlock) : true;
  const owned = item ? ownedCount(item.id, item.category) : 0;
  const cannot = !item || item.price === null || !unlocked || (!item.stackable && owned >= 1);
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}><span className="coin-chip"><Icon name="coin" size="sm" />{save.coins}</span><span className="muted">코인이 부족해도 기본 사료와 휴식은 언제나 무료예요.</span></div>
      <div className="tabs" role="tablist">
        {CATS.map((c) => <button key={c} role="tab" className="tab" aria-selected={cat === c} onClick={() => { setCat(c); setSel(null); setQty(1); }}>{CATEGORY_NAME[c]}</button>)}
      </div>
      <div className="grid" role="list" style={{ marginBottom: item ? 110 : 0 }}>
        {items.map((i) => {
          const un = isUnlocked(save, i.unlock);
          const own = ownedCount(i.id, i.category);
          return (
            <button key={i.id} role="listitem" className={`card ${sel === i.id ? 'selected' : ''} ${!un || i.price === null ? 'locked' : ''}`} style={{ cursor: 'pointer' }} onClick={() => { setSel(i.id); setQty(1); }} aria-label={`${i.name} ${i.price === null ? '보상 전용' : `${i.price} 코인`}`}>
              {own > 0 && <span className="qty">보유 {own}</span>}
              <div className="thumb"><Img src={i.icon} size={i.category === 'room' ? 64 : undefined} /></div>
              <b>{i.name}</b>
              <small>{i.price === null ? '보상 전용' : i.price === 0 ? '무료' : `🪙 ${i.price}`}</small>
              {!un && <small>🔒 {unlockText(i.unlock)}</small>}
            </button>
          );
        })}
      </div>
      {item && (
        <div className="storage-note" style={{ position: 'sticky', bottom: -14, background: 'var(--white)', marginTop: 8 }}>
          <div className="row">
            <Img src={item.icon} size={32} />
            <div style={{ flex: 1 }}>
              <b>{item.name}</b> <span className="pill">{'★'.repeat(item.rarity)}</span>
              <div className="muted">{item.desc}{item.effect ? ` (${item.effect})` : ''}</div>
              {!unlocked && <div className="muted">🔒 {unlockText(item.unlock)}</div>}
            </div>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            {item.stackable && <div className="row"><button className="btn small icon-only" aria-label="수량 줄이기" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><b>{qty}</b><button className="btn small icon-only" aria-label="수량 늘리기" onClick={() => setQty(Math.min(item.maxStack, qty + 1))}>＋</button></div>}
            <button className="btn gold" style={{ flex: 1 }} disabled={cannot || save.coins < total} onClick={doBuy}>
              {item.price === null ? '구입할 수 없어요' : !unlocked ? '잠겨 있어요' : (!item.stackable && owned >= 1) ? '보유 중' : save.coins < total ? `코인 부족 (🪙 ${total})` : `🪙 ${total} 구입`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
