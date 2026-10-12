import { useState } from 'react';
import { PetThumb } from '../../components/common';
import { FOOD_BY_ID } from '../../data/items';
import { LINEAGE_NAME, PERSONALITY_NAME, SPECIES, SPECIES_LIST, STAGE_NAME } from '../../data/pets';
import { dexRewardList } from '../../game/core/economy';
import { emptySave } from '../../game/core/newGame';
import { useGame } from '../../stores/gameStore';

export function DexPanel() {
  const stored = useGame((s) => s.save);
  const claimDex = useGame((s) => s.claimDex);
  const save = stored ?? emptySave(0);
  const [sel, setSel] = useState<string | null>(null);
  const found = Object.keys(save.encyclopedia).length;
  const total = SPECIES_LIST.length;
  const s = sel ? SPECIES[sel] : null;
  const has = sel ? !!save.encyclopedia[sel] : false;
  return (
    <div className="stack">
      <div className="storage-note" aria-live="polite"><b>발견한 생명체 {found} / {total}</b> · 도감 완성도 {Math.round((found / total) * 100)}%
        <div className="bar" style={{ color: '#b78cf0', marginTop: 4 }}><i style={{ width: `${(found / total) * 100}%` }} /></div></div>
      {s && (
        <div className="card" style={{ alignItems: 'stretch', textAlign: 'left' }}>
          <div className="row">
            <PetThumb speciesId={s.id} frame={has ? 3 : 0} scale={s.growthStage === 'adult' ? 2 : 3} silhouette={!has} />
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 17 }}>{has ? s.name : '???'}</b>
              <div className="muted">{has ? `${LINEAGE_NAME[s.lineage]} · ${STAGE_NAME[s.growthStage]}` : '아직 만나지 못했어요'}</div>
              {has && <div className="muted">발견: {new Date(save.encyclopedia[s.id].discoveredAt).toLocaleDateString('ko-KR')}</div>}
            </div>
            <button className="btn small" onClick={() => setSel(null)}>닫기</button>
          </div>
          {has ? (
            <div className="stack" style={{ marginTop: 6 }}>
              <div>{s.encyclopediaDescription}</div>
              <div className="muted">성격: {s.personalityTags.map((t) => PERSONALITY_NAME[t]).join(', ')} · 좋아하는 음식: {FOOD_BY_ID[s.favoriteFood]?.name}</div>
              <div className="muted">특별 행동: {s.specialAction.name}</div>
              <div className="muted">진화 힌트: {s.evolutionCandidates.length ? s.evolutionHint : '이미 최종 진화체예요.'}</div>
              <div className="muted">해금 조건: {s.unlockConditions}</div>
            </div>
          ) : <div className="muted" style={{ marginTop: 6 }}>힌트: {s.unlockConditions}</div>}
        </div>
      )}
      {(['starlight', 'flame', 'nature'] as const).map((l) => (
        <div key={l}>
          <b>{LINEAGE_NAME[l]}</b>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', marginTop: 4 }}>
            {SPECIES_LIST.filter((x) => x.lineage === l).map((x) => {
              const f = !!save.encyclopedia[x.id];
              return (
                <button key={x.id} className={`card ${sel === x.id ? 'selected' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSel(x.id)} aria-label={f ? x.name : '미발견 생명체'}>
                  <div className="thumb"><PetThumb speciesId={x.id} frame={0} scale={x.growthStage === 'adult' ? 1 : x.growthStage === 'child' ? 1 : 2} silhouette={!f} /></div>
                  <b>{f ? x.name : '???'}</b><small>{STAGE_NAME[x.growthStage]}</small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div>
        <b>도감 보상</b>
        {dexRewardList.map((r) => (
          <div key={r.count} className="mission" style={{ marginTop: 4 }}><span>{found >= r.count ? '✅' : '🔒'}</span><span style={{ flex: 1 }}>{r.count === 21 ? '전체 발견' : `${r.count}종 발견`}: {r.text}</span></div>
        ))}
        {stored && <button className="btn small mint" style={{ marginTop: 6 }} onClick={claimDex}>보상 받기</button>}
      </div>
    </div>
  );
}
