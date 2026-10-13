# 아키텍처
입력(React/캔버스) → `gameStore` 액션 → `core/*` 순수 함수(`runAction`이 저장본을 복제해 검증·변경, 실패 시 원본 유지) → `GameEvent` 발행 → 렌더러/오디오/토스트 반응 → 디바운스 자동 저장.
- 시간: 온라인은 1초 틱(`tickPet`), 재접속/장시간 공백은 `settleOffline`(결정적, 동일 시각 재호출 시 변화 없음, 음수 시간 무시).
- 보상 중복 방지: `claimed` 키 집합(`claimOnce`), 미니게임은 runId.
- 저장: `persistence/migrate.ts`가 신뢰할 수 없는 입력을 검증·복구, 알 수 없는 펫/아이템은 버림.
- 렌더: `RoomView`(192×160 논리 해상도, 정수 배율 백킹 + 맞춤 CSS), `PetActor` 상태 머신.
