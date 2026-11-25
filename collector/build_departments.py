"""02-1 학과 전수표(markdown)에서 학과 목록 JSON 을 만든다.

python3 collector/build_departments.py  →  site/data/departments.json
학교 사이트에 접속하지 않는다. 표만 읽는다.
"""
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "제주_웹서비스_MVP/정보원_조사/02-1_학과_전수표.md"
OUT = ROOT / "site/data/departments.json"

GRAD = {"일반대학원", "전문대학원", "특수대학원"}
SARA = {"교육대학"}

rows, last_host = [], {}
for line in SRC.read_text(encoding="utf-8").splitlines():
    if not line.startswith("| ") or line.startswith("| 단과대") or line.startswith("|---"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 7:
        continue
    college, name, host, path, ok = cells[:5]
    m = re.search(r"`([^`]+)`", path)
    if host in ("단과대와 같음",) or path.startswith("위와 같음"):
        host, board = last_host.get(college, ("", ""))
    else:
        board = m.group(1) if m else ""
        if college and host and "." in host:
            last_host.setdefault(college, (host, board))
    if not college or college.startswith("**"):
        continue
    name = {"의예과·의학과 (단과대 겸용)": "의예과·의학과",
            "12개 초등교육 전공 공통": "초등교육 (12개 전공 공통)"}.get(name, name)
    url = f"https://{host}{board}" if host and board else ""
    site_id = board.strip("/").split("/")[0] if board else re.sub(r"\W", "", name)
    rows.append({
        "id": site_id,
        "college": college,
        "name": college if name == "(단과대)" else name,
        "is_college_board": name == "(단과대)",
        "board": url,
        "level": "대학원" if college in GRAD else "학부",
        "campus": "사라" if college in SARA else "아라",
        "has_board": bool(url) and "❌" not in ok,
    })

# 같은 게시판을 쓰는 학과(간호학과=간호대학 등)는 id 가 겹친다. 학과 쪽 id 에 이름을 붙여 구분한다.
seen = {}
for r in rows:
    if r["id"] in seen:
        r["id"] = r["id"] + "-" + str(seen[r["id"]])
        seen[r["id"].rsplit("-", 1)[0]] += 1
    else:
        seen[r["id"]] = 1
OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(rows), "rows →", OUT.relative_to(ROOT))
