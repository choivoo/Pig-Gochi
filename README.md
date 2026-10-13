# PIXEL LIFE — 작은 생명의 세계

모바일·PC 브라우저에서 즐기는 **오리지널 도트 다마고치 육성 게임**입니다. 광고·결제 없음, 데이터는 이 기기에만 저장되며 설치 후에는 오프라인으로도 플레이할 수 있습니다(PWA).

## 게임 특징
- 별빛/불꽃/이슬 알 3종 → 아기 3 → 어린 펫 6 → 성체 12 (총 **21종**), 돌봄 기록 기반의 결정적 진화 분기
- 먹이(25종)·쓰다듬기·목욕(거품 문지르기)·수면·치료·장난감 놀이, 감정/성격/자율 행동, 규칙 기반 대사 120+
- 미니게임 6종: 별 모으기, 낚시, 기억력 카드, 점프 달리기, 미로 탐험, 리듬 탭
- 상점·코인, 가구 37종, 방 배경 6종, 액세서리 20종, 도감, 업적 54개, 일일/주간 미션, 낮/밤·날씨·계절 연출
- 오프라인 정산(최대 8시간, 회복 가능한 하한선), 내보내기/가져오기 백업, 접근성(키보드·움직임 줄이기·저성능 모드)

## 실행
```bash
npm install
npm run dev            # 개발 서버
npm run build          # 타입 검사 + 프로덕션 빌드 (dist/)
npm run preview        # 빌드 미리보기 (http://localhost:4173)
npm run typecheck && npm run lint
npm test               # 유닛·통합 테스트 (Vitest)
npm run test:e2e       # 브라우저 E2E (Playwright, 빌드 후 preview 자동 실행)
npm run assets:gen     # 도트 에셋 재생성 (Python 3 + Pillow)
npm run assets:check   # 에셋 검증
```
정적 호스팅(GitHub Pages, Cloudflare Pages, Netlify, Vercel)에 `dist/`를 올리면 됩니다. `base`가 `./`라 하위 경로에서도 동작합니다. 실제 배포는 계정이 필요하므로 이 저장소에서는 수행하지 않았습니다.

## 구조
- `src/game/core` 순수 게임 규칙(시뮬레이션·돌봄·진화·경제·미션·업적), `src/game/render` 캔버스 렌더러, `src/game/minigames` 6종, `src/screens` React UI, `src/stores` Zustand, `src/persistence` IndexedDB/마이그레이션
- 수치는 모두 `src/data/balance.ts`에 중앙 관리됩니다.
- Phaser 대신 직접 구현한 Canvas 2D 렌더러를 사용합니다(의존성·복잡도 절감).

## 그래픽 제작 방식
이 개발 환경에는 Codex CLI/이미지 생성 스킬이 없어 **모든 도트 에셋을 `scripts/assets/*.py`(Pillow)로 절차적으로 직접 제작**했습니다. 외부 이미지·모델·오디오를 쓰지 않았고 효과음/BGM은 Web Audio로 합성합니다. 목록은 `docs/art/asset-manifest.md`.

## 저장 데이터
IndexedDB(`pixel-life`) + localStorage 미러(페이지 종료 시 동기 저장), 스키마 버전 1, 손상 시 백업 슬롯으로 복구. **브라우저 데이터를 지우면 진행도가 사라지고 기기 간 동기화는 없습니다.** 설정에서 JSON으로 내보내기/가져오기 하세요.

## 알려진 제한
- 실제 기기(iOS/Android) 테스트는 못 했고, Chromium 데스크톱 + 모바일 에뮬레이션만 검증했습니다.
- FPS를 실측하지 않았습니다. 리듬 게임의 오디오 지연 보정 UI는 없습니다(판정은 입력 시각 기준).
- 이슬·불꽃 계열 등 일부 진화 분기는 자동 테스트로 도달 가능성만 검증했고, 실제 플레이 밸런스는 미조정입니다.
