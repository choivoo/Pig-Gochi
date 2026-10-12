# 🧽 지우개 RPG — 책상 위의 전쟁

학교 책상 위에서 지우개를 손가락으로 튕겨 싸우는 추억의 **지우개 따먹기**를 RPG로 만든 웹 게임입니다.
설치 없이 **모바일·PC 브라우저**에서 바로 플레이할 수 있고, **GitHub Pages**로 호스팅됩니다.

- 지우개를 뒤로 당겼다 놓아 발사 → 부딪혀 피해를 주고, 책상 밖으로 밀어내면 **낙사**!
- 적에게 살짝 닿은 채로 멈추면 **따먹기** (큰 피해)
- 지우개 17종 · 스킬 8종 · 장비 10종 · 스테이지 63개 · 보스 12종 · 무한 책상(로그라이크) · 친구 대결(한 화면 2인) · 고스트 대결
- 문방구 뽑기, 도감, 업적, 일일 미션, 출석, 백업 코드(기기 이전), PWA(오프라인)

## 플레이

GitHub Pages 주소: `https://choivoo.github.io/Pig-Gochi/` (아래 "배포" 참고)

로컬 실행 (빌드 도구 필요 없음, 순수 정적 파일):

```bash
npm run serve        # http://localhost:8080
npm test             # 게임 로직 테스트 (Node 18+)
npm run balance      # 자동 대전으로 스테이지 난이도 확인
```

## 배포 (GitHub Pages)

1. 이 저장소의 `main` 브랜치에 병합
2. **Settings → Pages → Build and deployment → Source: `GitHub Actions`** 선택
3. `main`에 push 하면 `.github/workflows/pages.yml` 이 테스트 후 자동 배포합니다.

(Actions 없이 쓰려면 Source 를 `Deploy from a branch → main / (root)` 로 해도 동작합니다. 모든 경로가 상대 경로입니다.)

## 폴더 구조

```
index.html / style.css          화면 뼈대와 스타일
manifest.webmanifest / sw.js    PWA (설치·오프라인)
js/
  physics.js    2D 물리 (원 충돌, 마찰, 낙사) — DOM 무관, 결정론적
  combat.js     데미지·발사 속도 공식
  battle.js     전투 규칙 (턴, 스킬, 따먹기, 보스, 추가턴)
  ai.js         적 AI (후보 샷을 시뮬레이션으로 평가)
  render.js     캔버스 렌더링, 드래그 입력, 이펙트
  rpg.js        스탯·경험치·장비·뽑기·스테이지 생성
  data.js       지우개/스킬/적/장비/챕터/업적 데이터
  save.js       저장(localStorage)·마이그레이션·백업 코드
  state.js / fight.js / screens.js / modes.js   UI 화면과 흐름
  audio.js      WebAudio 로 합성한 효과음·BGM (외부 음원 없음)
tests/          Node 테스트와 밸런스 봇
docs/기획서/    상세 기획서 (01~09)
legacy/         이 저장소의 이전 페이지(트램펄린 카운터)
```

## 기획서

[`docs/기획서/`](docs/기획서/) 에 세계관·시스템·콘텐츠·기술 설계가 정리되어 있고, 실제 구현 범위는
[`09_구현현황.md`](docs/기획서/09_구현현황.md) 에 있습니다.
