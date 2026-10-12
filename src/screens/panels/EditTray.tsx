import { useMemo, useRef, useState } from 'react';
import { Icon, Img } from '../../components/common';
import { FURN_BY_ID, FURNITURE, ROOM_THEMES } from '../../data/items';
import { snapPlacement } from '../../game/core/economy';
import { useGame } from '../../stores/gameStore';
import type { PlacedItem } from '../../types';
import { RoomStage } from '../RoomStage';

let uidn = 0;
const newUid = () => `n${Date.now().toString(36)}${(uidn++).toString(36)}`;

export function EditTray() {
  const save = useGame((s) => s.save);
  const setPanel = useGame((s) => s.setPanel);
  const setLayout = useGame((s) => s.setLayout);
  const setRoom = useGame((s) => s.setRoom);
  const toast = useGame((s) => s.toast);
  const [draft, setDraft] = useState<PlacedItem[]>(() => (save ? save.roomLayout.map((x) => ({ ...x })) : []));
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<'furn' | 'room'>('furn');
  const [confirmReset, setConfirmReset] = useState(false);
  const undo = useRef<PlacedItem[][]>([]);
  const push = (next: PlacedItem[]) => { undo.current.push(draft.map((x) => ({ ...x }))); if (undo.current.length > 30) undo.current.shift(); setDraft(next); };
  const owned = useMemo(() => FURNITURE.map((f) => ({ f, have: save?.inventory[`furn:${f.id}`] ?? 0 })).filter((x) => x.have > 0), [save]);
  if (!save) return null;
  const remaining = (id: string) => (save.inventory[`furn:${id}`] ?? 0) - draft.filter((d) => d.itemId === id).length;
  const selected = draft.find((d) => d.uid === sel);

  const add = (id: string) => {
    if (remaining(id) <= 0) { toast('보관함에 남은 가구가 없어요.', undefined, 'error'); return; }
    if (draft.length >= 30) { toast('방이 가득 찼어요.', undefined, 'error'); return; }
    const d = FURN_BY_ID[id];
    const p = snapPlacement(id, 72 + (draft.length % 4) * 16, d.slot === 'wall' ? 64 : 140);
    const it: PlacedItem = { uid: newUid(), itemId: id, x: p.x, y: p.y, flip: false };
    push([...draft, it]); setSel(it.uid);
  };
  const save_ = () => { const r = setLayout(draft); if (r.ok) { setPanel('none'); useGame.getState().tutorial('place'); useGame.getState().say(['room'], true); } };
  const added = draft.filter((d) => !save.roomLayout.some((o) => o.uid === d.uid)).length;
  void added;
  return (
    <>
      <div style={{ gridRow: 2, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <RoomStage layoutOverride={draft} editMode selectedUid={sel} onEditSelect={setSel} onEditCommit={(l) => push(l)} />
      </div>
      <div className="statusbar edit-tray" style={{ maxHeight: '40dvh', overflowY: 'auto', gridRow: '3 / 5' }} aria-label="꾸미기 도구">
        <div className="row" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
          <button className="btn small mint" onClick={save_}>저장</button>
          <button className="btn small" onClick={() => { setPanel('none'); }}>취소</button>
          <button className="btn small" disabled={undo.current.length === 0} onClick={() => { const p = undo.current.pop(); if (p) setDraft(p); }}>되돌리기</button>
          {!confirmReset ? <button className="btn small red" onClick={() => setConfirmReset(true)}>초기화</button> : <button className="btn small red" onClick={() => { push([]); setConfirmReset(false); setSel(null); }}>정말 비우기</button>}
        </div>
        {selected && (
          <div className="row" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
            <b style={{ flex: 1 }}>{FURN_BY_ID[selected.itemId].name}</b>
            {FURN_BY_ID[selected.itemId].rotatable && <button className="btn small sky" onClick={() => push(draft.map((d) => (d.uid === selected.uid ? { ...d, flip: !d.flip } : d)))}>↔ 회전</button>}
            <button className="btn small" onClick={() => { push(draft.filter((d) => d.uid !== selected.uid)); setSel(null); }}>보관함으로</button>
          </div>
        )}
        <div className="tabs" role="tablist">
          <button role="tab" className="tab" aria-selected={tab === 'furn'} onClick={() => setTab('furn')}>가구</button>
          <button role="tab" className="tab" aria-selected={tab === 'room'} onClick={() => setTab('room')}>배경</button>
        </div>
        <div className="muted" style={{ marginBottom: 4 }}>가구를 끌어서 옮겨요. 8px 격자에 맞춰져요. 펫이 가려지지 않게 놓아 주세요.</div>
        {tab === 'furn' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))' }}>
            {owned.map(({ f }) => (
              <button key={f.id} className="card" style={{ cursor: 'pointer', padding: 3 }} disabled={remaining(f.id) <= 0} onClick={() => add(f.id)} aria-label={`${f.name} 놓기 (남은 ${remaining(f.id)}개)`}>
                <span className="qty">{remaining(f.id)}</span>
                <div className="thumb" style={{ width: 48, height: 40 }}><Img src={`assets/furniture/${f.id}.png`} /></div>
                <small>{f.name}</small>
              </button>
            ))}
          </div>
        )}
        {tab === 'furn' && owned.length === 0 && <div className="muted">가구가 없어요. 상점에서 구입해요.</div>}
        {tab === 'room' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
            {ROOM_THEMES.map((r) => {
              const has = save.ownedRooms.includes(r.id);
              return (
                <button key={r.id} className={`card ${save.roomTheme === r.id ? 'selected' : ''} ${has ? '' : 'locked'}`} disabled={!has} style={{ cursor: has ? 'pointer' : 'default', padding: 3 }} onClick={() => setRoom(r.id)}>
                  <img src={`${import.meta.env.BASE_URL}assets/rooms/${r.id}.png`} alt="" style={{ width: 80, height: 67, imageRendering: 'pixelated' }} />
                  <small>{r.name}{has ? '' : ' 🔒'}</small>
                </button>
              );
            })}
          </div>
        )}
        <button className="btn small mint" style={{ marginTop: 8 }} onClick={() => setPanel('shop')}><Icon name="shop" size="xs" /> 상점</button>
      </div>
    </>
  );
}
