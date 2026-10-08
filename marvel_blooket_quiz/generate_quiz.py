# -*- coding: utf-8 -*-
"""quiz_data.py 의 문항을 섞어 배치하고 CSV / answer_key.md / source_notes.md 를 생성한다.
사용: python3 generate_quiz.py   (시드 고정 → 항상 같은 결과)
"""
import csv
import os
import random

from quiz_data import ITEMS

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = 20261008
TIME = {"e": 15, "n": 20, "h": 30}
TYPING_TIME = 30
DIFF_KO = {"e": "쉬움", "n": "보통", "h": "어려움"}
TYPE_KO = {"M": "4지선다", "O": "OX", "T": "직접입력"}
CAT_KO = {1: "MCU 영화", 2: "MCU 디즈니+ 시리즈", 3: "코믹스 원작·탄생 배경", 4: "능력·장비·정체",
          5: "빌런과 조직", 6: "스톤·장소·핵심 개념", 7: "배우·감독·제작 뒷이야기",
          8: "이스터에그·카메오·쿠키", 9: "MCU 바깥 마블 작품"}
HEADER = ["Question #", "Question Text", "Answer 1", "Answer 2", "Answer 3 (Optional)",
          "Answer 4 (Optional)", "Time Limit (sec)", "Correct Answer(s)", "", "Question Type"]


def ordered(items):
    """제약: 첫 3문항 쉬움, 앞 8문항 어려움 없음, 같은 유형 4연속 금지, 어려움 연속 금지,
    비(非)쉬움 4연속 금지, 같은 카테고리 연속 금지."""
    for attempt in range(20000):
        rnd = random.Random(SEED + attempt)
        pool = items[:]
        out = []
        ok = True
        while pool:
            n = len(out)
            cands = []
            for it in pool:
                if n < 3 and it["diff"] != "e":
                    continue
                if n < 8 and it["diff"] == "h":
                    continue
                if len(out) >= 3 and all(o["type"] == it["type"] for o in out[-3:]):
                    continue
                if out and it["diff"] == "h" and out[-1]["diff"] == "h":
                    continue
                if len(out) >= 3 and it["diff"] != "e" and all(o["diff"] != "e" for o in out[-3:]):
                    continue
                if out and out[-1]["cat"] == it["cat"]:
                    continue
                cands.append(it)
            if not cands:
                ok = False
                break
            # 남은 개수에 비례해 난이도를 고르게 분산
            w = []
            rem = len(pool)
            for it in cands:
                cnt_d = sum(1 for p in pool if p["diff"] == it["diff"])
                w.append(cnt_d)
            pick = rnd.choices(cands, weights=w, k=1)[0]
            out.append(pick)
            pool.remove(pick)
        if ok:
            return out
    raise RuntimeError("배치 실패")


def assign_positions(mc_count, seed):
    """정답 위치 1~4를 균등 분산(18/18/17/17), 3연속 금지."""
    base = [1, 2, 3, 4] * (mc_count // 4) + [1, 2][: mc_count % 4]
    for attempt in range(100000):
        rnd = random.Random(seed + attempt)
        seq = base[:]
        rnd.shuffle(seq)
        if all(not (seq[i] == seq[i + 1] == seq[i + 2]) for i in range(len(seq) - 2)):
            return seq
    raise RuntimeError("정답 위치 배정 실패")


def build():
    seq = ordered(ITEMS)
    positions = assign_positions(sum(1 for s in seq if s["type"] == "M"), SEED)
    pi = 0
    rows = []
    for no, it in enumerate(seq, 1):
        t = it["type"]
        limit = TYPING_TIME if t == "T" else TIME[it["diff"]]
        if t == "M":
            p = positions[pi]
            pi += 1
            opts = it["wrong"][:]
            opts.insert(p - 1, it["ans"])
            correct = str(p)
            ans_text = it["ans"]
            typ = ""
        elif t == "O":
            opts = ["O", "X", "", ""]
            correct = "1" if it["ans"] == "O" else "2"
            ans_text = it["ans"]
            typ = ""
        else:
            opts = (it["ans"] + ["", "", "", ""])[:4]
            correct = ",".join(str(i + 1) for i in range(len(it["ans"])))
            ans_text = " / ".join(it["ans"])
            typ = "typing"
        opts = (opts + ["", "", "", ""])[:4]
        rows.append(dict(no=no, item=it, limit=limit, opts=opts, correct=correct, ans_text=ans_text, typ=typ))
    return rows


def write_all(rows):
    path = os.path.join(HERE, "marvel_quiz_blooket.csv")
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
        w.writerow(HEADER)
        for r in rows:
            w.writerow([r["no"], r["item"]["q"], *r["opts"], r["limit"], r["correct"], "", r["typ"]])

    with open(os.path.join(HERE, "answer_key.md"), "w", encoding="utf-8") as f:
        f.write("# 정답표 (플레이 후 설명용)\n\n")
        f.write("| 번호 | 유형 | 난이도 | 카테고리 | 질문 | 정답 | 한 줄 해설 |\n|---|---|---|---|---|---|---|\n")
        for r in rows:
            it = r["item"]
            ans = r["ans_text"]
            if it["type"] == "M":
                ans = f"{r['correct']}번 {ans}"
            f.write(f"| {r['no']} | {TYPE_KO[it['type']]} | {DIFF_KO[it['diff']]} | {CAT_KO[it['cat']]} | "
                    f"{it['q']} | {ans} | {it['exp']} |\n")

    with open(os.path.join(HERE, "source_notes.md"), "w", encoding="utf-8") as f:
        f.write("# 근거 기록 (source_notes)\n\n")
        f.write("## 검증 수준 (솔직한 안내)\n")
        f.write("- **R**: 개봉 연도·순서 항목. 웹 검색으로 개봉 연도 목록을 보조 확인했으나, 검색 결과 품질이 낮아 "
                "원문 페이지를 직접 열어 대조하지는 못함.\n")
        f.write("- **K**: 널리 알려진 공식 설정·캐스팅·코믹스 사실. 항목별로 웹 원문을 열어 확인하지 못했고, "
                "기존 지식 기준으로 확신도 80% 이상인 것만 사용함. **업로드 전 팬/나무위키/마블 공식 사이트로 표본 확인 권장.**\n\n")
        f.write("## 참고한 검색 결과 링크\n")
        f.write("- MCU 영화 개봉 순서(보조): https://editorial.rottentomatoes.com/guide/marvel-movie-release-timeline/\n")
        f.write("- 디즈니+ 마블 시리즈 목록(보조): https://www.brickfanatics.com/?p=92793\n")
        f.write("- Blooket 형식: 00_format_notes.md 참조\n\n")
        f.write("## 문항별 기록\n\n| 번호 | 정답 | 근거 요약(자체 요약) | 검증 수준 | 링크 |\n|---|---|---|---|---|\n")
        for r in rows:
            it = r["item"]
            link = "위 보조 링크 참조" if it["src"] == "R" else "항목별 링크 없음(기존 지식)"
            f.write(f"| {r['no']} | {r['ans_text']} | {it['exp']} | {it['src']} | {link} |\n")


if __name__ == "__main__":
    rows = build()
    write_all(rows)
    print(f"생성 완료: {len(rows)}문항")
