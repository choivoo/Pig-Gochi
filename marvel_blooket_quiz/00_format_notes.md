# Blooket CSV 가져오기 형식 조사 (2026-10-08)

## 조사 한계 (중요)
공식 도움말 https://help.blooket.com/hc/en-us/articles/16002377931543 는 Cloudflare 차단(403)으로 본문을 직접 읽지 못함.
검색 결과 요약 + 서드파티 문서로 교차 확인했으므로 아래 "미확인" 항목은 직접 검증 필요.

## 항목별 결과
| # | 항목 | 결과 | 상태 | 근거 |
|---|------|------|------|------|
| 1 | 컬럼/순서/헤더행 | Question #, Question Text, Answer 1, Answer 2, Answer 3 (Optional), Answer 4 (Optional), Time Limit (sec) (Max: 300 seconds), Correct Answer(s) (Only include Answer #). 헤더는 보호된 셀. 복사본마다 순서가 다름. 헤더 행 위치(1행 vs 안내행 아래)는 미확정 | 부분 확인 | quizgecko 템플릿 사본 검색결과, oreateai 가이드 |
| 2 | 글자 수 제한 | 공식 수치 못 찾음 (서드파티는 서로 불일치) | 미확인 | 검색 결과 |
| 3 | 시간 제한 | 최대 300초(서드파티), 빈칸이면 대개 20초 | 부분 확인 | quizgecko, oreateai |
| 4 | 정답 형식 | 숫자만(1~4), 복수 정답은 쉼표 구분 | 확인 | 공식 도움말 검색 요약 |
| 5 | 세트당 최대 문항 | 명시 없음. 100~150문항 초과 시 지연 가능, 30~60 권장 | 부분 확인 | oreateai |
| 6 | 보기 2개(OX) | Answer 3,4가 Optional 이므로 비워도 가능 | 확인(헤더 표기 기준) | 템플릿 헤더 |
| 7 | 타이핑 문항 | J열에 `typing` 입력, 답안 칸은 "is exactly" 정답 | 확인 | 공식 도움말 검색 요약, Blooket X 공지 |
| 8 | 인코딩 | 한글 등은 UTF-8. BOM 필요 여부는 미확인 (Excel은 BOM 있는 UTF-8이 안전) | 부분 확인 | oreateai |

## 링크
- https://help.blooket.com/hc/en-us/articles/16002377931543
- https://x.com/PlayBlooket/status/1930745037912264811
- https://quizgecko.com/upload/copy-of-blooket-spreadsheet-import-template-sheet1-kybzFC
- https://discover.oreateai.com/discover/how-to-use-the-blooket-csv-template-for-faster-question-set-creation

## 결정
- STEP 2 = (A): 타이핑 문항을 J열 `typing`으로 CSV에 포함.
- 안전책: 글자 수는 질문 ≤ 120자, 보기 ≤ 50자로 자체 제한. UTF-8 with BOM 저장.
- 열 구성: A~H 위 헤더 + I열(빈 열, 헤더 없음) + J열 `Question Type`(값: typing 또는 빈칸). 실제 템플릿과 열 위치가 다를 수 있어, 업로드 전 사용자가 공식 템플릿을 내려받아 열이 맞는지 확인 필요.
