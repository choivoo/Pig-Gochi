# -*- coding: utf-8 -*-
"""STEP 7 자동 검증. CSV 를 다시 읽어 설계 대비 검사한다."""
import csv
import difflib
import os
import sys
from collections import Counter

from generate_quiz import build, CAT_KO, DIFF_KO

HERE = os.path.dirname(os.path.abspath(__file__))
rows = build()  # 메타데이터(유형/난이도/카테고리)용
fails = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


raw = open(os.path.join(HERE, "marvel_quiz_blooket.csv"), "rb").read()
check(raw.startswith(b"\xef\xbb\xbf"), "UTF-8 BOM 포함")
text = raw.decode("utf-8-sig")
data = list(csv.reader(text.splitlines(), delimiter=","))
header, body = data[0], data[1:]
check(len(body) == 124, f"총 문항 수 124 (실제 {len(body)})")
check(all(len(r) == len(header) for r in body), f"모든 행 컬럼 수 일치({len(header)})")
check([int(r[0]) for r in body] == list(range(1, 125)), "Question # 1부터 연속")
korean = sum(1 for r in body for c in r[1:4] if any("가" <= ch <= "힣" for ch in c))
check(korean > 100 and "�" not in text, "한글 정상(깨짐 문자 없음)")

QMAX, AMAX = 120, 50
bad = []
for r, meta in zip(body, rows):
    typ = meta["item"]["type"]
    q = r[1]
    opts = r[2:6]
    t = int(r[6])
    corr = [int(x) for x in r[7].split(",")]
    if not q:
        bad.append((r[0], "질문 비어 있음"))
    if len(q) > QMAX:
        bad.append((r[0], "질문 길이 초과"))
    need = 2 if typ == "O" else (4 if typ == "M" else 1)
    if typ != "T" and any(not o for o in opts[:need]):
        bad.append((r[0], "필수 보기 비어 있음"))
    if typ == "T" and not opts[0]:
        bad.append((r[0], "타이핑 정답 비어 있음"))
    if any(len(o) > AMAX for o in opts):
        bad.append((r[0], "보기 길이 초과"))
    filled = [i + 1 for i, o in enumerate(opts) if o]
    if not all(c in filled for c in corr):
        bad.append((r[0], "정답 번호가 보기 범위 밖"))
    if typ in ("M", "O") and len(corr) != 1:
        bad.append((r[0], "정답이 1개가 아님"))
    if not (5 <= t <= 300):
        bad.append((r[0], "시간 제한 범위 밖"))
    if typ == "M" and len(set(opts)) != 4:
        bad.append((r[0], "보기 중복"))
    if typ == "T" and r[9] != "typing":
        bad.append((r[0], "typing 표시 누락"))
    if typ != "T" and r[9] != "":
        bad.append((r[0], "typing 표시 오류"))
check(not bad, f"빈 값/길이/정답범위/시간 검사 (위반 {bad})")

tc = Counter(m["item"]["type"] for m in rows)
dc = Counter(m["item"]["diff"] for m in rows)
cc = Counter(m["item"]["cat"] for m in rows)
check((tc["M"], tc["O"], tc["T"]) == (70, 30, 24), f"유형 70/30/24 (실제 {dict(tc)})")
check((dc["e"], dc["n"], dc["h"]) == (50, 50, 24), f"난이도 50/50/24 (실제 {dict(dc)})")
want = {1: 28, 2: 12, 3: 18, 4: 16, 5: 12, 6: 12, 7: 10, 8: 8, 9: 8}
check(dict(cc) == want, f"카테고리 분포 (실제 {dict(sorted(cc.items()))})")
ox = Counter(m["item"]["ans"] for m in rows if m["item"]["type"] == "O")
check(ox["O"] == 15 and ox["X"] == 15, f"OX 정답 O15/X15 (실제 {dict(ox)})")

# 위치 분포
mc = [(r, m) for r, m in zip(body, rows) if m["item"]["type"] == "M"]
pos = Counter(int(r[7]) for r, _ in mc)
print("정답 위치 분포 표:", " | ".join(f"{k}번={pos[k]}" for k in (1, 2, 3, 4)))
check(all(17 <= pos[k] <= 18 for k in (1, 2, 3, 4)), "정답 위치 각 17~18개")
seq = [int(r[7]) for r, _ in mc]
check(all(not (seq[i] == seq[i + 1] == seq[i + 2]) for i in range(len(seq) - 2)), "같은 정답 번호 3연속 없음")

# 유형 4연속 / 난이도 배치
types = [m["item"]["type"] for m in rows]
check(all(len(set(types[i:i + 4])) > 1 for i in range(len(types) - 3)), "같은 유형 4연속 없음")
diffs = [m["item"]["diff"] for m in rows]
check(all(d == "e" for d in diffs[:3]), "첫 3문항 쉬움")
check(all(not (diffs[i] == diffs[i + 1] == "h") for i in range(len(diffs) - 1)), "어려움 연속 없음")

# 시간 제한 규칙
tm = {"e": 15, "n": 20, "h": 30}
okt = all(int(r[6]) == (30 if m["item"]["type"] == "T" else tm[m["item"]["diff"]]) for r, m in zip(body, rows))
check(okt, "제한 시간 규칙(15/20/30, 타이핑 30)")

# 보기 길이 단서: 정답이 유일 최장/최단인 비율
longest = shortest = 0
for r, _ in mc:
    opts = r[2:6]
    c = opts[int(r[7]) - 1]
    L = [len(o) for o in opts]
    if L.count(len(c)) == 1 and len(c) == max(L):
        longest += 1
    if L.count(len(c)) == 1 and len(c) == min(L):
        shortest += 1
print(f"정답이 유일 최장 {longest}개 / 유일 최단 {shortest}개 (4지선다 70개 중)")
check(longest <= 25 and shortest <= 25, "길이 단서 편중 없음(각 25개 이하; 무작위 기대치 17.5)")

# 중복 질문
qs = [r[1] for r in body]
dup = [(i + 1, j + 1, round(difflib.SequenceMatcher(None, a, b).ratio(), 2))
       for i, a in enumerate(qs) for j, b in enumerate(qs) if j > i and difflib.SequenceMatcher(None, a, b).ratio() > 0.75]
check(not dup, f"유사 질문 없음 (의심 {dup})")
# 금지 보기
check(not any("모두 정답" in c or "정답 없음" in c for r in body for c in r[2:6]), "'모두 정답/정답 없음' 보기 없음")

print("\n카테고리별:", {CAT_KO[k]: v for k, v in sorted(cc.items())})
print("\n결과:", "모두 통과" if not fails else f"실패 {len(fails)}건")
sys.exit(1 if fails else 0)
