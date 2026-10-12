import { useState } from 'react';
import { Icon, PetThumb } from '../../components/common';
import { LINEAGE_NAME, PERSONALITY_NAME, SPECIES, STAGE_NAME } from '../../data/pets';
import { FOOD_BY_ID } from '../../data/items';
import { computeEmotion, EMOTION_ICON, EMOTION_LABEL } from '../../game/core/emotion';
import { growthProgress } from '../../game/core/evolution';
import { ILLNESS_NAME } from '../../game/core/simulation';
import { activePet } from '../../game/core/progress';
import { now, useGame } from '../../stores/gameStore';
import type { Personality } from '../../types';

export function StatusPanel() {
  const save = useGame((s) => s.save);
  const setPanel = useGame((s) => s.setPanel);
  const rename = useGame((s) => s.rename);
  const [name, setName] = useState('');
  const pet = save && activePet(save);
  if (!save || !pet) return null;
  const sp = SPECIES[pet.speciesId];
  const emo = computeEmotion(pet, new Date(now()).getHours());
  const top = (Object.entries(pet.personality) as [Personality, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const egg = pet.stage === 'egg';
  return (
    <div className="stack">
      <div className="row">
        <PetThumb speciesId={pet.speciesId} frame={egg ? 0 : 3} scale={egg ? 3 : pet.stage === 'baby' ? 3 : 2} />
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 18 }}>{pet.name}</b>
          <div className="muted">{egg ? '알' : `${sp.name} (${sp.species})`}</div>
          {!egg && <div className="muted">{LINEAGE_NAME[sp.lineage]} · {STAGE_NAME[pet.stage]}</div>}
          <div>{EMOTION_ICON[emo]} {EMOTION_LABEL[emo]}{pet.illness ? ` · 🤒 ${ILLNESS_NAME[pet.illness]}` : ''}</div>
        </div>
      </div>
      {!egg && (
        <>
          <div><b>성장</b> <span className="muted">{pet.stage === 'adult' ? '다 자랐어요!' : `${Math.round(growthProgress(pet) * 100)}%`}</span>
            <div className="bar" style={{ color: '#8fd96b', marginTop: 4 }}><i style={{ width: `${growthProgress(pet) * 100}%` }} /></div></div>
          {sp.evolutionCandidates.length > 0 && <div className="storage-note">💡 {sp.evolutionHint}</div>}
          <div><b>성격</b> {top.map(([k]) => <span key={k} className="pill" style={{ marginRight: 4 }}>{PERSONALITY_NAME[k]}</span>)}</div>
          <div className="muted">좋아하는 음식: {FOOD_BY_ID[sp.favoriteFood]?.name} · 싫어하는 음식: {FOOD_BY_ID[sp.dislikedFood]?.name}</div>
          <div className="muted">특별 행동: {sp.specialAction.name} — {sp.specialAction.effect}</div>
          <div className="muted">돌봄 기록: 먹이 {pet.care.feeds}회 · 쓰다듬기 {pet.care.strokes}회 · 목욕 {pet.care.baths}회 · 수면 {pet.care.sleepCount}회 · 미니게임 {pet.care.minigames}회</div>
          {pet.special && <div className="storage-note">✨ 특별한 유대 상태예요!</div>}
        </>
      )}
      <div className="row">
        <input className="input" placeholder="이름 바꾸기 (최대 10자)" value={name} maxLength={10} onChange={(e) => setName(e.target.value)} aria-label="펫 이름" />
        <button className="btn small" onClick={() => { rename(name); setName(''); }}>변경</button>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn mint" onClick={() => setPanel('care')}><Icon name="medicine" size="sm" />치료</button>
        <button className="btn lav" onClick={() => setPanel('wardrobe')}><Icon name="star" size="sm" />꾸며 주기</button>
        <button className="btn sky" onClick={() => setPanel('storage')}><Icon name="pets" size="sm" />보관함</button>
        <button className="btn gold" onClick={() => setPanel('missions')}><Icon name="trophy" size="sm" />미션·업적</button>
      </div>
    </div>
  );
}
