import { activePet } from '../../game/core/progress';
import { ILLNESS_NAME } from '../../game/core/simulation';
import { useGame } from '../../stores/gameStore';
import type { HealKind } from '../../game/core/care';
import { Icon } from '../../components/common';

export function CarePanel() {
  const save = useGame((s) => s.save);
  const heal = useGame((s) => s.heal);
  const setPanel = useGame((s) => s.setPanel);
  const pet = save && activePet(save);
  if (!save || !pet) return null;
  const inv = save.inventory;
  const opts: { kind: HealKind; name: string; desc: string; qty?: number }[] = [
    { kind: 'rest', name: '기본 휴식', desc: '건강 +8, 스트레스 감소. 언제나 무료예요.' },
    { kind: 'snack', name: '건강 간식', desc: '건강 +15, 포만감 +5. 무료 (1분에 한 번)' },
    { kind: 'medicine', name: '간단한 약', desc: '건강 +25', qty: inv['special:medicine'] ?? 0 },
    { kind: 'special', name: '특별 치료', desc: '건강 +50, 아픈 상태를 바로 낫게 해요.', qty: inv['special:super_medicine'] ?? 0 },
  ];
  return (
    <div className="stack">
      <div className="storage-note">건강 {Math.round(pet.stats.health)}/100 {pet.illness ? `· 현재 증상: ${ILLNESS_NAME[pet.illness]}` : '· 건강해요'}</div>
      {opts.map((o) => (
        <div key={o.kind} className="mission">
          <Icon name="medicine" size="sm" />
          <div style={{ flex: 1 }}><b>{o.name}</b>{o.qty !== undefined && <span className="pill" style={{ marginLeft: 6 }}>보유 {o.qty}</span>}<div className="muted">{o.desc}</div></div>
          <button className="btn small mint" onClick={() => heal(o.kind)}>사용</button>
        </div>
      ))}
      <button className="btn" onClick={() => setPanel('shop')}>상점에서 약 사기</button>
    </div>
  );
}
