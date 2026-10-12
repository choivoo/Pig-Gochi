import { useState } from 'react';
import { Icon } from '../../components/common';
import { ACHIEVEMENTS, type AchCategory } from '../../data/achievements';
import { MISSION_BY_ID } from '../../data/missions';
import { achievementProgress } from '../../game/core/progress';
import { useGame } from '../../stores/gameStore';

export function AchievementsPanel({ initial }: { initial: 'ach' | 'missions' }) {
  const [tab, setTab] = useState(initial);
  const save = useGame((s) => s.save);
  const claim = useGame((s) => s.claimMission);
  const setPanel = useGame((s) => s.setPanel);
  if (!save) return null;
  const cats = Array.from(new Set(ACHIEVEMENTS.map((a) => a.category))) as AchCategory[];
  const unlocked = Object.keys(save.achievements).length;
  const list = (title: string, items: typeof save.missions.daily) => (
    <div className="stack"><b>{title}</b>
      {items.map((m) => {
        const d = MISSION_BY_ID[m.id];
        if (!d) return null;
        const done = m.progress >= d.target;
        return (
          <div key={m.id} className="mission">
            <div style={{ flex: 1 }}>
              <div><b>{d.title}</b> <span className="pill">🪙 {d.coins}</span></div>
              <div className="bar pbar" style={{ color: '#8fd96b', marginTop: 4 }}><i style={{ width: `${Math.min(100, (m.progress / d.target) * 100)}%` }} /></div>
              <small>{Math.min(m.progress, d.target)} / {d.target}</small>
            </div>
            <button className="btn small gold" disabled={!done || m.claimed} onClick={() => claim(m.id)}>{m.claimed ? '받음' : done ? '받기' : '진행 중'}</button>
          </div>
        );
      })}
    </div>
  );
  return (
    <div>
      <div className="tabs" role="tablist">
        <button role="tab" className="tab" aria-selected={tab === 'missions'} onClick={() => setTab('missions')}>미션</button>
        <button role="tab" className="tab" aria-selected={tab === 'ach'} onClick={() => setTab('ach')}>업적 {unlocked}/{ACHIEVEMENTS.length}</button>
      </div>
      {tab === 'missions' && (
        <div className="stack">
          {list('오늘의 미션', save.missions.daily)}
          {list('이번 주 미션 (월요일에 초기화)', save.missions.weekly)}
          <div className="muted">연속 출석 {save.streak}일 · 하루 빠져도 괜찮아요. 천천히 즐겨 주세요.</div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn small" onClick={() => setPanel('storage')}><Icon name="pets" size="sm" />보관함</button>
            <button className="btn small" onClick={() => setPanel('care')}><Icon name="medicine" size="sm" />치료</button>
            <button className="btn small" onClick={() => setPanel('wardrobe')}><Icon name="star" size="sm" />꾸며 주기</button>
          </div>
        </div>
      )}
      {tab === 'ach' && (
        <div className="stack">
          {cats.map((c) => (
            <div key={c} className="stack"><b>{c}</b>
              {ACHIEVEMENTS.filter((a) => a.category === c).map((a) => {
                const p = Math.min(a.target, achievementProgress(save, a.counter));
                const done = !!save.achievements[a.id];
                return (
                  <div key={a.id} className="mission" style={{ opacity: done ? 1 : 0.9 }}>
                    <span>{done ? '🏆' : '🔒'}</span>
                    <div style={{ flex: 1 }}>
                      <b>{a.title}</b> <span className="pill">🪙 {a.reward}</span>
                      <div className="muted">{a.description}</div>
                      <div className="bar" style={{ color: '#ffb400', marginTop: 2 }}><i style={{ width: `${(p / a.target) * 100}%` }} /></div>
                      <small>{p} / {a.target}{done ? ` · 달성 ${new Date(save.achievements[a.id].unlockedAt).toLocaleDateString('ko-KR')}` : ''}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
