# 07. 기술 설계: 웹 구현, GitHub Pages 호스팅, 저장 구조

## 1. 기술 스택 결정

### 1.1 요구사항

- 모바일(iOS Safari, Android Chrome) + PC(Chrome/Edge/Firefox/Safari) 동일 동작
- 설치 불필요, 링크 공유, GitHub Pages 정적 호스팅
- 60fps 2D 물리 + 파티클
- 오프라인 플레이 가능(PWA)
- 낮은 진입 장벽: 빌드 도구가 단순해야 개인 개발에 적합

### 1.2 후보 비교

| 선택지 | 장점 | 단점 | 판단 |
|---|---|---|---|
| 순수 Canvas 2D + 자체 물리 | 가장 가볍고 통제 가능, 결정론 쉬움 | 구현량 많음 | 물리가 단순(원/사각)하므로 **유력** |
| Phaser 3 + Matter.js | 에셋/씬/입력/오디오 통합, 자료 풍부 | 번들 ~1MB, 결정론 약함 | **1단계 권장** |
| PixiJS + Matter.js | 렌더링 성능 우수 | 직접 씬 관리 필요 | 대안 |
| Godot Web Export | 에디터 편의 | 번들 큼(수십MB), 로딩 느림 | 비권장 |
| Unity WebGL | 기능 풍부 | 용량/로딩 매우 큼, 모바일 웹 부담 | 비권장 |

### 1.3 최종 권장안

- **1단계(프로토타입~정식 1.0)**: **Phaser 3 + Matter.js + TypeScript + Vite**
  - 이유: 모바일 입력/스케일 관리, 오디오, 씬 전환, 물리를 한 번에 해결. 개발 속도 최우선.
- **2단계(온라인 대전 도입 시)**: 전투 코어(시뮬레이션)를 **프레임워크 독립 모듈**로 분리하고 필요 시 자체 결정론 물리로 교체.
- 아키텍처 원칙: "시뮬레이션(순수 로직)과 렌더링(Phaser)을 분리" → 테스트 가능, AI 평가 용 헤드리스 시뮬레이션 가능.

## 2. GitHub Pages 호스팅

### 2.1 개념

GitHub Pages는 저장소의 정적 파일(HTML/JS/CSS/에셋)을 `https://<유저>.github.io/<저장소>/` 로 서빙한다. 본 프로젝트 저장소는 `choivoo/Pig-Gochi`(현재 일부 HTML 존재, CNAME 파일 이력 있음).

### 2.2 배포 방식 두 가지

**방식 A. main 브랜치 루트 직접 배포 (단순)**
- Settings → Pages → Source: `Deploy from a branch` → `main` / `/(root)`.
- 빌드 결과물(`dist`)을 별도 폴더에 두려면 `/docs` 선택 가능.
- 단점: 빌드 산출물을 커밋해야 해 저장소가 지저분해짐.

**방식 B. GitHub Actions 빌드 후 배포 (권장)**
- Settings → Pages → Source: `GitHub Actions`.
- 소스(TypeScript)만 커밋하고 CI에서 `vite build` 후 아티팩트를 Pages로 배포.

### 2.3 GitHub Actions 워크플로 예시 (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test --if-present
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 2.4 경로(base) 설정 주의

저장소 이름이 URL 경로가 되므로 Vite의 `base` 를 맞춰야 한다.
```ts
// vite.config.ts
export default defineConfig({
  base: '/Pig-Gochi/',   // 커스텀 도메인(CNAME) 사용 시 '/'
});
```
커스텀 도메인을 쓰면 `public/CNAME` 파일에 도메인을 넣고 DNS를 연결한다. 기존에 CNAME을 추가/삭제한 이력이 있으므로 도메인 사용 여부를 먼저 확정한다.

### 2.5 제한 사항 (GitHub Pages)

- 저장소 권장 1GB 이하, 사이트 1GB 이하, 월 대역폭 약 100GB(소프트 한도).
- 서버 사이드 코드 불가(순수 정적).
- HTTPS 기본 제공 → Service Worker/PWA 사용 가능.
- 캐시 정책은 변경 불가(Cache-Control 고정 약 10분) → **파일명 해시**(Vite 기본)로 캐시 무효화.
- 대형 에셋은 압축(WebP/OGG)하고 필요시 CDN 활용.

### 2.6 PWA 구성

- `manifest.webmanifest`: 이름, 아이콘(192/512), `display: standalone`, `orientation: any`, 테마 색상.
- Service Worker(Workbox): 앱 셸 프리캐시 + 에셋 런타임 캐시, 버전 업데이트 시 "새 버전이 있어요" 토스트.
- iOS 홈 화면 추가 안내 배너(Safari 전용 문구).
- 서비스 워커 scope가 `/Pig-Gochi/` 로 제한됨을 유의.

## 3. 프로젝트 구조

```
Pig-Gochi/
├─ index.html
├─ package.json / vite.config.ts / tsconfig.json
├─ public/              (manifest, 아이콘, CNAME, 정적 에셋)
├─ src/
│  ├─ main.ts           (엔트리: Phaser 게임 생성)
│  ├─ core/             (프레임워크 독립 로직)
│  │  ├─ sim/           (물리 시뮬레이션, 충돌 처리, 낙사/따먹기 판정)
│  │  ├─ battle/        (턴 매니저, 데미지 계산, 상태이상, 스킬 실행)
│  │  ├─ ai/            (후보 샷 생성, 평가, 성격)
│  │  ├─ rpg/           (스탯, 성장, 장비, 스킬 트리)
│  │  ├─ economy/       (재화, 뽑기, 확률/천장)
│  │  └─ save/          (세이브 스키마, 마이그레이션)
│  ├─ game/             (Phaser 의존 계층)
│  │  ├─ scenes/        (Boot, Title, Home, StageSelect, Battle, Result, Gacha...)
│  │  ├─ ui/            (버튼, 모달, 토스트, 재화 바)
│  │  ├─ fx/            (파티클, 히트스톱, 카메라)
│  │  └─ audio/
│  ├─ data/             (JSON: erasers, skills, items, stages, enemies, events)
│  ├─ i18n/             (ko.json, en.json, ja.json)
│  └─ utils/
├─ tests/               (Vitest: 데미지, 확률, 세이브 마이그레이션 등)
├─ tools/               (데이터 검증 스크립트, 아틀라스 빌드)
├─ docs/기획서/         (본 기획서)
└─ .github/workflows/deploy.yml
```

## 4. 핵심 시스템 구현 설계

### 4.1 게임 루프와 고정 타임스텝

- 물리는 **고정 타임스텝 1/60초**, 렌더는 가변 프레임 보간(interpolation).
- 누적기(accumulator) 패턴으로 프레임 드랍 시에도 물리 일관성 유지, 최대 서브스텝 5회로 "죽음의 나선" 방지.
- 결정론: 난수는 시드 기반 PRNG(mulberry32), `Math.random` 금지. 전투 시드를 저장하면 리플레이 재현 가능.

### 4.2 물리 구현 상세

Matter.js 사용 시:
- 월드 중력 0 (탑다운), 각 바디에 `frictionAir`, `restitution`, `density` 설정.
- 마찰은 표면 재질에 따라 동적으로 `frictionAir` 를 조정하거나 매 스텝 속도 감쇠를 직접 적용(표면별 감속 계수).
- **정지 판정**: 모든 바디 속도 제곱합 < 임계값이 N프레임 지속.
- **터널링 방지**: 최대 속도 클램프 + 서브스텝(속도가 높으면 2~3 서브스텝).
- 낙사: 책상 다각형 포인트-인-폴리곤 검사(COM 기준). 걸림 판정은 가장자리 거리 비교.
- 따먹기: 겹침 면적은 사각형 근사 교차(SAT 폴리곤 클리핑 또는 격자 샘플링 근사)로 계산.

자체 물리를 택할 경우: 원+OBB 충돌, 임펄스 해소, 반복 해소(4회) 정도로 충분(지우개 최대 6개 이하).

### 4.3 데이터 주도 설계(Data-driven)

- 지우개, 스킬, 스테이지, 적, 이벤트는 모두 JSON. 코드 수정 없이 콘텐츠 추가 가능.
- **스킬 효과는 선언적 DSL**:
```json
{
  "id":"skill_split",
  "type":"active",
  "cost":{"focus":40},
  "effects":[
    {"op":"spawnClone","count":1,"damageScale":0.6},
    {"op":"modifyNextShot","spread":0.2}
  ],
  "tags":["split","offense"]
}
```
- 이펙트 연산자(op)는 코드에 구현된 소수의 프리미티브(`modifyStat`, `applyStatus`, `spawnClone`, `setSurface`, `heal`, `forceExtraTurn` 등)의 조합.
- JSON 스키마(AJV)로 CI에서 검증 → 데이터 오류로 배포가 깨지는 일 방지.

### 4.4 상태 관리

- 전투 상태: 불변 스냅샷 + 이벤트 로그(Event Sourcing 유사). 리플레이/되감기(시간 지우개 스킬)/디버깅에 유리.
- 전역 상태: 간단한 스토어(Zustand 스타일의 자체 구현) + 구독 패턴으로 UI 갱신.

### 4.5 입력 처리

- Pointer Events 통합(마우스/터치/펜). `touch-action: none` 으로 브라우저 제스처 방지.
- 멀티터치 방지: 첫 포인터만 조준에 사용.
- 화면 크기 변화 대응: Phaser `Scale.FIT` + 레터박스, 세로/가로 회전 시 레이아웃 재계산.
- 게임 진행 중 새로고침/탭 전환: `visibilitychange` 에서 자동 일시정지 + 저장.

### 4.6 AI 구현

- 후보 샷 평가를 위해 **헤드리스 시뮬레이터**(렌더 없이 물리만) 필요 → core/sim 을 순수 TS로 분리한 이유.
- Matter.js를 별도 월드로 복제해 사용하거나, 경량 자체 시뮬레이터를 AI 전용으로 구현(정밀도 낮춤).
- Web Worker에서 비동기 계산, 타임박스(예: 최대 120ms)로 응답 지연 방지.
- 난이도 조절 파라미터: 후보 수, 오차 표준편차, 평가 가중치, 스킬 사용 확률.

### 4.7 렌더링 최적화

- 스프라이트 배칭, 텍스처 아틀라스, 오브젝트 풀링(파티클, 데미지 숫자).
- 정적 배경은 한 번만 렌더 후 캐시(RenderTexture).
- 해상도 스케일(devicePixelRatio 상한 2). 저사양 모드: 파티클 감소, 그림자 단순화.
- 목표 성능: 중급 모바일(2021년 이후 보급형) 60fps, 저사양 30fps 이상 보장.

## 5. 저장 시스템

### 5.1 로컬 저장

- 기본: `IndexedDB`(idb 래퍼) 또는 `localStorage`(소규모). 세이브가 수십 KB 이하이면 localStorage로 충분하지만 장기적으로 IndexedDB 권장.
- 저장 시점: 전투 종료, 구매, 설정 변경, 주기적(30초), `visibilitychange`/`pagehide`.
- **세이브 슬롯 안전성**: 이중 저장(현재/백업), 저장 중 변조·손상 대비 체크섬.

### 5.2 세이브 스키마와 마이그레이션

```json
{
  "version": 3,
  "player": {"name":"", "level":7, "exp":120, "createdAt":1760000000},
  "currency": {"coin":1520, "chalk":12, "stamina":{"value":18,"updatedAt":1760000500}},
  "erasers": [ {"uid":"e_001","baseId":"malrangi","level":9,"star":1, "stats":{}, "skills":[], "equip":{}} ],
  "inventory": {"items":{"sharp_core":3}},
  "progress": {"stages":{"1-1":{"stars":3}}, "chapter":2},
  "dex": {"erasers":["malrangi"],"enemies":{"pencil_basic":42}},
  "gacha": {"pityHigh":17, "pityPickup":4},
  "settings": {"lang":"ko","bgm":0.7,"sfx":1,"guide":"normal","reduceMotion":false},
  "meta": {"lastSeen":1760001000, "playTime":5400}
}
```
- `version` 필드 기반 **순차 마이그레이션 함수** 체인(v1→v2→v3). 유닛 테스트 필수.

### 5.3 내보내기/가져오기 (기기 이전)

- 계정이 없으므로 **세이브 코드 내보내기**: JSON → 압축(lz-string/CompressionStream) → Base64 → 클립보드/파일 다운로드.
- 가져오기: 코드 붙여넣기/파일 선택 → 검증 → 덮어쓰기 전 확인 모달.
- QR 코드로 PC↔모바일 이전 지원(옵션).
- 브라우저 데이터 삭제 위험을 로그인 직후 및 주기적으로 안내: "가끔 백업해 주세요".

### 5.4 치팅(변조) 대응 정책

- 순수 클라이언트 게임이므로 **완전 방지는 불가** 임을 인정. 싱글 플레이 변조는 허용 범위.
- 세이브 체크섬(HMAC 키는 클라이언트에 존재하므로 약한 방어)으로 우발적 손상만 감지.
- 랭킹 도입 시 서버(Workers 등)에서 **리플레이 재시뮬레이션 검증**으로 대응(시드 + 입력 로그 제출).

## 6. 선택적 백엔드 (2단계)

정적 호스팅과 병행 가능한 서버리스 옵션:

| 서비스 | 용도 | 비고 |
|---|---|---|
| Firebase (Auth/Firestore) | 클라우드 세이브, 랭킹 | 무료 한도 내 운영 가능 |
| Supabase | 랭킹, 고스트 데이터, 인증 | Postgres 기반 |
| Cloudflare Workers + KV/D1 | 경량 랭킹 API, 리플레이 검증 | 요청당 저렴 |
| PeerJS/WebRTC | P2P 실시간 대전 | 시그널링 서버 필요 |

설계 원칙: **백엔드 없이도 게임이 완전히 동작**하고, 백엔드가 있으면 기능이 추가되는 점진적 향상(Progressive Enhancement).

## 7. 보안 / 개인정보

- 외부 스크립트 최소화(공급망 위험 감소). 의존성은 `package-lock.json` 고정, Dependabot 활성화.
- CSP 메타 태그로 인라인 스크립트/외부 도메인 제한.
- 사용자 입력(닉네임, 세이브 코드)은 항상 이스케이프/검증(XSS 방지).
- 개인정보 수집 없음 원칙. 분석(선택) 도입 시 익명 + 동의 기반.
- 쿠키 미사용. 필요한 저장은 로컬 저장소만.

## 8. 테스트 전략

| 종류 | 도구 | 대상 |
|---|---|---|
| 단위 테스트 | Vitest | 데미지 공식, 확률/천장, 세이브 마이그레이션, 스탯 계산 |
| 시뮬레이션 테스트 | Vitest + 헤드리스 | 동일 시드 재현성, 물리 정지 판정, 낙사/따먹기 판정 |
| 데이터 검증 | AJV 스크립트 | JSON 스키마, 참조 무결성(스킬 ID 존재 등) |
| E2E | Playwright | 타이틀→전투→결과 플로우, 터치 에뮬레이션 |
| 성능 | Lighthouse CI, 수동 | 로딩 시간, FPS |
| 크로스 디바이스 | BrowserStack/실기기 | iOS Safari, 삼성 인터넷, Chrome |

밸런스 테스트: 헤드리스 시뮬레이터로 수천 판 자동 대전을 돌려 승률 분포를 검증하는 **밸런스 봇** 을 `tools/` 에 구현.

## 9. 분석 / 계측 (선택)

- 프라이버시 친화적 방식(로컬 계측 + 사용자가 원하면 익명 업로드).
- 주요 이벤트: 튜토리얼 이탈 지점, 스테이지별 클리어율/평균 시도 수, 뽑기 사용 빈도, 평균 세션 길이.
- 이를 기반으로 DDA 및 스테이지 난이도 튜닝에 반영.
