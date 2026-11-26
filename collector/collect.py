#!/usr/bin/env python3
"""제주대 공지·학식 수집기.

sources.json 에 적힌 곳의 첫 페이지만 받아 site/data/items.json, meals.json 을 만든다.

- 학교 사이트는 robots.txt 가 전체 차단이다. 첫 페이지만, 요청 사이 2~3초, 원문 링크 필수 (07 5절).
- 학교 서버가 중간 인증서를 보내지 않아서 certs/ 의 중간 인증서를 시스템 루트와 합쳐 검증한다.
  verify=False 는 쓰지 않는다.
- 한 곳이 실패해도 나머지는 계속한다. 실패했거나 0건이면 그곳의 이전 데이터를 그대로 둔다.
- 이전 items.json 과 합쳐서 first_seen(처음 본 시각)을 지키고, 최근 60일 글만 남긴다.

쓰는 법:
  python collector/collect.py            # 수집해서 site/data 에 씀
  python collector/collect.py --cache D  # 받은 원본을 D 에 저장하고, 있으면 다시 받지 않음 (개발용)
끝날 때 실패한 곳이 있으면 종료 코드 1 (Actions 가 실패 메일을 보내게).
"""
import argparse
import hashlib
import html
import json
import os
import re
import ssl
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from urllib.parse import urljoin

import certifi
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter

ROOT = Path(__file__).resolve().parent.parent
OUT_DIRS = [ROOT / "site" / "data"]
KST = timezone(timedelta(hours=9))
UA = "jnu-moa/0.1 (HRA student project; +https://github.com/Rhombusbork/hra_companywork)"
KEEP_DAYS = 60
PAUSE = 2.5

NOW = datetime.now(KST).replace(microsecond=0)
NOW_S = NOW.isoformat()
TODAY = NOW.date()


# ---------- 받기 ----------

def ca_bundle():
    """시스템(certifi) 루트 + 학교 중간 인증서를 합친 임시 번들 경로."""
    parts = [Path(certifi.where()).read_text()]
    for pem in sorted((ROOT / "certs").glob("*.pem")):
        parts.append(pem.read_text())
    f = tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False)
    f.write("\n".join(parts))
    f.close()
    return f.name


class LegacyTLS(HTTPAdapter):
    """jedaero 는 DH 키가 작은 구형 TLS 라서 SECLEVEL=0. 인증서 검증은 켜 둔다."""

    def __init__(self, cafile, **kw):
        self.cafile = cafile
        super().__init__(**kw)

    def init_poolmanager(self, *a, **kw):
        ctx = ssl.create_default_context(cafile=self.cafile)
        ctx.set_ciphers("DEFAULT@SECLEVEL=0")
        kw["ssl_context"] = ctx
        return super().init_poolmanager(*a, **kw)


class Fetcher:
    def __init__(self, cache_dir=None):
        self.bundle = ca_bundle()
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self.s.verify = self.bundle
        self.s.mount("https://jedaero.", LegacyTLS(self.bundle))
        self.cache = Path(cache_dir) if cache_dir else None
        self.last = 0.0
        self.count = 0

    def get(self, url):
        if self.cache:
            p = self.cache / (hashlib.md5(url.encode()).hexdigest() + ".txt")
            if p.exists():
                return p.read_text(encoding="utf-8")
        wait = PAUSE - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        for attempt in (1, 2):  # 연결이 끊기면 10초 쉬고 한 번만 다시
            try:
                r = self.s.get(url, timeout=30)
                break
            except (requests.ConnectionError, requests.Timeout):
                if attempt == 2:
                    raise
                time.sleep(10)
            finally:
                self.last = time.time()
                self.count += 1
        r.raise_for_status()
        if not r.encoding or r.encoding.lower() == "iso-8859-1":
            r.encoding = r.apparent_encoding
        text = r.text
        if self.cache:
            self.cache.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")
        return text


# ---------- 도움 ----------

DATE_RE = re.compile(r"(20\d\d)[.\-/](\d{1,2})[.\-/](\d{1,2})")


def find_date(text):
    m = DATE_RE.search(text or "")
    if not m:
        return None
    try:
        return date(int(m[1]), int(m[2]), int(m[3])).isoformat()
    except ValueError:
        return None


def seq_of(href):
    m = re.search(r"seq=(\d+)", href or "")
    return m[1] if m else None


def norm_title(t):
    """중복 찾기용: [11.26. 내용추가] 같은 머리말, 공백·기호를 지운다."""
    t = re.sub(r"^\s*(\[[^\]]*(수정|추가|재공고|연장|변경)[^\]]*\]\s*)+", "", t)
    return re.sub(r"[\s\W_]+", "", t).lower()


# 제목 속 마감일: "(~11.18.)", "~12. 5.(금)", "12.5.까지", "마감 12/5"
DEADLINE_RES = [
    re.compile(r"~\s*(?:(20\d\d)\s*[.\-/]\s*)?(\d{1,2})\s*[.\-/]\s*(\d{1,2})"),
    re.compile(r"(?:(20\d\d)\s*[.\-/]\s*)?(\d{1,2})\s*[.\-/]\s*(\d{1,2})\.?\s*(?:\([월화수목금토일]\))?\s*까지"),
    re.compile(r"마감\s*:?\s*(?:(20\d\d)\s*[.\-/]\s*)?(\d{1,2})\s*[.\-/]\s*(\d{1,2})"),
]


PERIOD_WORDS = ("개방", "운영 안내", "운행", "휴관", "점검", "공사", "단수", "정전")


def deadline_from_title(title, posted):
    """제목에 적힌 마감일. 글 날짜보다 앞이면 버린다. 연도가 없으면 글 날짜 기준으로 정한다.
    '열람실 개방 [12.2~12.21]' 처럼 신청 마감이 아니라 운영 기간인 글은 뺀다."""
    if any(w in title for w in PERIOD_WORDS):
        return None
    try:
        p = date.fromisoformat(posted) if posted else TODAY
    except ValueError:
        p = TODAY
    for rx in DEADLINE_RES:
        for m in rx.finditer(title):
            y, mo, d = m.group(1), int(m.group(2)), int(m.group(3))
            if not (1 <= mo <= 12 and 1 <= d <= 31):
                continue
            year = int(y) if y else p.year
            try:
                dl = date(year, mo, d)
            except ValueError:
                continue
            if not y and dl < p - timedelta(days=7):
                try:
                    dl = date(year + 1, mo, d)
                except ValueError:
                    continue
            if p <= dl <= p + timedelta(days=200):
                return dl.isoformat()
    return None


def item(source, source_name, title, url, posted, **kw):
    it = {
        "id": kw.pop("id"),
        "source": source,
        "source_name": source_name,
        "category": kw.pop("category", None),
        "title": title,
        "url": url,
        "date": posted,
        "dept": kw.pop("dept", None),
        "dept_board": kw.pop("dept_board", None),
        "deadline": kw.pop("deadline", None),
        "deadline_src": kw.pop("deadline_src", None),
        "attachments": kw.pop("attachments", []),
        "also_posted": [],
        "first_seen": NOW_S,
    }
    if not it["deadline"]:
        dl = deadline_from_title(title, posted)
        if dl:
            it["deadline"], it["deadline_src"] = dl, "title"
    it.update(kw)
    return it


# ---------- 파서 ----------

def parse_artpq_table(text, base, source, source_name, has_category=False, dept_board=None):
    """artpq CMS 표형 게시판 (본부·생활관·국제교류·clip·학과). 셀렉터는 01 2-1절."""
    soup = BeautifulSoup(text, "html.parser")
    out, seen = [], set()
    for tr in soup.select("table tbody tr"):
        a = tr.select_one("td.title a") or tr.select_one("td a[href*='act=view']")
        if not a:
            continue
        href = urljoin(base, a.get("href", ""))
        seq = seq_of(href)
        if not seq or seq in seen:
            continue
        seen.add(seq)
        title = (a.get("title") or a.get_text(" ", strip=True)).strip()
        title = re.sub(r"\s+", " ", title)
        nd = tr.select_one("td.nowrap")
        posted = find_date(nd.get_text() if nd else tr.get_text(" "))
        cat = None
        if has_category:
            c = tr.select_one("span.article-category")
            cat = c.get_text(strip=True) if c else None
        atts = []
        badge = tr.select_one("a.badge")
        if badge:
            names = BeautifulSoup(html.unescape(badge.get("title", "")), "html.parser").get_text("\n")
            names = [n.strip() for n in names.split("\n") if n.strip()]
            dl = urljoin(base, badge.get("href", ""))
            dl = re.sub(r"pageSize=\d+&(amp;)?", "", dl)
            for i, n in enumerate(names, 1):
                atts.append({"name": n, "url": re.sub(r"no=\d+", f"no={i}", dl)})
        tds = tr.find_all("td")
        writer = None
        # 작성부서: 날짜 칸 바로 앞 칸
        for i, td in enumerate(tds):
            if td is nd and i > 0:
                writer = tds[i - 1].get_text(" ", strip=True) or None
        view = re.sub(r"[?&]pageSize=\d+", "", href).replace(".htm&", ".htm?")
        out.append(item(source, source_name, title, view, posted, id=f"{source}:{seq}",
                        category=cat, dept=writer, dept_board=dept_board, attachments=atts,
                        pinned=("info" in (tr.get("class") or [])) or None))
    for it in out:
        if not it.get("pinned"):
            it.pop("pinned", None)
    return out


def parse_jedaero(text, cfg):
    soup = BeautifulSoup(text, "html.parser")
    out = []
    for tr in soup.select("table tbody tr"):
        tds = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(tds) < 7:
            continue
        kind, title, dept, start, end, state = tds[:6]
        if kind in cfg["skip_types"]:
            continue
        m = re.search(r"'(PRM_\d+)'", tr.get("onclick", ""))
        pid = m[1] if m else hashlib.md5(title.encode()).hexdigest()[:10]
        out.append(item("jedaero", cfg["name"], title, cfg["url"], find_date(start), id=f"jedaero:{pid}",
                        dept=dept, deadline=find_date(end), deadline_src="field" if find_date(end) else None,
                        kind=kind, state=state))
    return out


def parse_library(text, cfg):
    d = json.loads(text)
    out = []
    for b in d["data"]["list"]:
        posted = find_date(b.get("dateCreated", ""))
        atts = [{"name": a.get("logicalName"), "url": cfg["link"]} for a in (b.get("attachments") or []) if a.get("logicalName")]
        out.append(item("library", cfg["name"], b["title"].strip(), cfg["link"], posted,
                        id=f"library:{b['id']}", attachments=atts))
    return out


def parse_meals(text, cfg, year):
    """caption 이 식당 이름인 표. 메뉴 사이가 </br> 라서 html.parser 가 구분을 버린다 → 셀 원문을 먼저 자른다 (07 4-1절)."""
    raw = re.sub(r"</?br\s*/?>", "\n", text, flags=re.I)
    soup = BeautifulSoup(raw, "html.parser")
    table = None
    for t in soup.select("table"):
        cap = t.find("caption")
        if cap and cfg["label"][:2] in cap.get_text() and "시간" not in cap.get_text():
            table = t
            break
    if table is None:
        return {}
    meals = [th.get_text(strip=True) for th in table.select("thead th")][1:]
    days = {}
    for tr in table.select("tbody tr"):
        th = tr.find("th")
        m = re.search(r"(\d{1,2})\s*/\s*(\d{1,2})", th.get_text() if th else "")
        if not m:
            continue
        mo, d = int(m[1]), int(m[2])
        y = year + 1 if (TODAY.month == 12 and mo == 1) else year - 1 if (TODAY.month == 1 and mo == 12) else year
        try:
            key = date(y, mo, d).isoformat()
        except ValueError:
            continue
        rows = []
        for name, td in zip(meals, tr.find_all("td")):
            lines = [l.strip() for l in td.get_text("\n").split("\n") if l.strip()]
            note = None
            menu = []
            for l in lines:
                n = re.match(r"^[*★♥☆♡]+\s*(.+?)\s*[*★♥☆♡]+$", l)
                if n:
                    t = n[1].replace("1일 ", "")
                    note = f"{note} · {t}" if note else t
                else:
                    menu.append(l)
            if not menu or menu in (["미운영"], ["휴무"], ["-"]):
                continue
            r = {"meal": name, "menu": menu}
            if note:
                r["note"] = note
            rows.append(r)
        if rows:
            days[key] = rows
    return days


ACAD_URL = "https://www.jejunu.ac.kr/admission/eduguide/degree/academyschedule/academic.htm?year={y}"
ACAD_RE = re.compile(r"^(\d{1,2})\.\s*(\d{1,2})\s*\([^)]*\)(?:\s*~\s*(\d{1,2})\.\s*(\d{1,2})\s*\([^)]*\))?$")


def parse_academic(text, year):
    """학사일정 (달력 연도 1~12월). "MM.DD(요) ~ MM. DD(요)" 줄 다음 줄이 내용 (01 2-3절)."""
    soup = BeautifulSoup(text, "html.parser")
    lines = (soup.select_one("#sub-main-contents") or soup).get_text("\n", strip=True).split("\n")
    out = []
    for i, l in enumerate(lines[:-1]):
        m = ACAD_RE.match(l.strip())
        if not m:
            continue
        title = lines[i + 1].strip()
        if ACAD_RE.match(title) or not title:
            continue
        try:
            start = date(year, int(m[1]), int(m[2]))
            end = start
            if m[3]:
                ey = year + 1 if int(m[3]) < int(m[1]) else year
                end = date(ey, int(m[3]), int(m[4]))
        except ValueError:
            continue
        out.append({"start": start.isoformat(), "end": end.isoformat(), "title": title})
    return out


# ---------- 합치기 ----------

def load_prev(name):
    p = OUT_DIRS[0] / name
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None
    if "예시" in (d.get("_note") or ""):
        return None  # 시안용 예시 데이터는 이어 쓰지 않는다
    return d


def merge_dupes(items, dept_names):
    """학과가 본부 글을 다시 올리면 seq 가 달라서 제목으로 찾는다 (07 7절). 본부 글에 '함께 게시'로 붙이고 학과 글은 뺀다."""
    by_title = {}
    for it in items:
        if it["source"] != "dept":
            by_title.setdefault(norm_title(it["title"]), it)
    # 본부 글과 전용 게시판(국제교류·생활관·clip·도서관) 글이 같으면 하나만 남긴다.
    # 본부 분류가 '일반'이면 전용 게시판 쪽을, 장학·학사처럼 분류가 있으면 본부 쪽을 남긴다.
    jnu = {norm_title(it["title"]): it for it in items if it["source"] == "jnu"}
    drop = set()
    for it in items:
        if it["source"] in ("jnu", "dept"):
            continue
        j = jnu.get(norm_title(it["title"]))
        if j:
            drop.add(id(j) if (j.get("category") in (None, "일반")) else id(it))
    items = [it for it in items if id(it) not in drop]
    # 전용 게시판끼리 같은 글(예: 생활관·국제교류에 같이 올린 글)은 먼저 나온 하나만 남긴다
    seen_t, keep = set(), []
    for it in items:
        if it["source"] not in ("jnu", "dept"):
            k = norm_title(it["title"])
            if k in seen_t:
                continue
            seen_t.add(k)
        keep.append(it)
    items = keep
    by_title = {}
    for it in items:
        if it["source"] != "dept":
            by_title.setdefault(norm_title(it["title"]), it)
    out = []
    for it in items:
        if it["source"] == "dept":
            main = by_title.get(norm_title(it["title"]))
            if main:
                who = dept_names.get(it["dept_board"])
                if who and who not in main["also_posted"]:
                    main["also_posted"].append(who)
                continue
        out.append(it)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache")
    args = ap.parse_args()

    cfg = json.loads((ROOT / "collector" / "sources.json").read_text(encoding="utf-8"))
    deps = json.loads((OUT_DIRS[0] / "departments.json").read_text(encoding="utf-8"))
    f = Fetcher(args.cache)

    prev = load_prev("items.json") or {"items": [], "sources": {}}
    prev_items = {it["id"]: it for it in prev["items"]}
    prev_src = prev.get("sources", {})
    sources, fresh, failed = {}, {}, []

    def run(sid, name, fn, label=None):
        """label 은 학과처럼 한 정보원(dept)에 게시판이 여럿일 때 어느 것인지."""
        who = f"{sid}({label})" if label else sid
        cur = sources.get(sid)
        try:
            got = fn()
            if not got:
                raise RuntimeError("0건 (구조가 바뀌었을 수 있음)")
            fresh.setdefault(sid, []).extend(got)
            if cur and not cur["ok"]:
                cur["count"] = len(fresh[sid])
            else:
                sources[sid] = {"name": name, "updated": NOW_S, "ok": True, "count": len(fresh[sid])}
            print(f"  {who}: {len(got)}건")
        except Exception as e:  # 한 곳이 실패해도 나머지는 계속
            failed.append(who)
            err = f"{label + ': ' if label else ''}{type(e).__name__}: {e}"[:200]
            if cur:
                cur["ok"] = False
                cur["error"] = (cur.get("error", "") + " / " + err).strip(" /")
            else:
                old = prev_src.get(sid, {})
                sources[sid] = {"name": name, "updated": old.get("updated"), "ok": False, "error": err,
                                "count": len(fresh.get(sid, []))}
            print(f"  {who}: 실패 {e}", file=sys.stderr)

    print("공지")
    for b in cfg["boards"]:
        run(b["id"], b["name"], lambda b=b: parse_artpq_table(f.get(b["url"]), b["url"], b["id"], b["name"], b.get("has_category", False)))

    # 학과: 같은 게시판을 쓰는 학과(약학대학·약학과)는 한 번만 받는다
    dept_names, boards_done = {}, set()
    for did in cfg["departments"]:
        d = next((x for x in deps if x["id"] == did), None)
        if not d or not d.get("board") or d["board"] in boards_done:
            continue
        boards_done.add(d["board"])
        dept_names[d["board"]] = d["name"]
        run("dept", "학과 게시판", lambda d=d: parse_artpq_table(f.get(d["board"]), d["board"], "dept", "학과 게시판", dept_board=d["board"]), d["name"])

    # jedaero 는 robots.txt 가 없다(404, 11/26 확인). 한 쪽 10건 중 교수·기업용이 많아 3쪽까지 본다.
    j = cfg["jedaero"]
    run("jedaero", j["name"], lambda: [x for n in range(1, j.get("pages", 1) + 1)
                                       for x in parse_jedaero(f.get(j["url"] + (f"?pageIndex={n}" if n > 1 else "")), j)])
    lb = cfg["library"]
    run("library", lb["name"], lambda: parse_library(f.get(lb["url"]), lb))

    # 실패한 곳은 이전 글을 그대로 쓴다
    all_items = []
    for sid, info in sources.items():
        if info["ok"] or sid in fresh:
            all_items += fresh.get(sid, [])
        if not info["ok"]:
            have = {it["id"] for it in fresh.get(sid, [])}
            all_items += [it for it in prev["items"] if it["source"] == sid and it["id"] not in have
                          and (sid != "dept" or it.get("dept_board") not in {x.get("dept_board") for x in fresh.get(sid, [])})]
    # 이번에 안 보였어도 60일 안의 글은 남긴다 (첫 페이지만 받으니 밀려난 글)
    have = {it["id"] for it in all_items}
    cutoff = (TODAY - timedelta(days=KEEP_DAYS)).isoformat()
    for it in prev["items"]:
        if it["id"] not in have and it["source"] in sources and sources[it["source"]]["ok"]:
            it.pop("pinned", None)
            all_items.append(it)
    # first_seen 지키기
    for it in all_items:
        old = prev_items.get(it["id"])
        if old:
            it["first_seen"] = old.get("first_seen", it["first_seen"])
        # 오래된 글을 처음 본 것(첫 수집, 학과 추가, 첫 페이지에 다시 올라온 고정 글)은 '새 글'이 아니다.
        # 처음 본 시각은 게시일 + 2일을 넘지 않게 한다.
        if it.get("date"):
            cap = (date.fromisoformat(it["date"]) + timedelta(days=2)).isoformat() + "T09:00:00+09:00"
            if it["first_seen"] > cap:
                it["first_seen"] = cap
    # 마감일이 남은 글은 오래돼도 남긴다 (jedaero 는 접수 시작일이 날짜라서)
    keep_key = lambda it: max(it["date"] or "9999", it.get("deadline") or "")
    all_items = [it for it in all_items if it.get("pinned") or keep_key(it) >= cutoff]
    # 고정 공지라도 아주 오래된 건 뺀다
    all_items = [it for it in all_items if (it["date"] or "9999") >= (TODAY - timedelta(days=365)).isoformat()]
    all_items = merge_dupes(all_items, dept_names)
    seen, uniq = set(), []
    for it in all_items:
        if it["id"] not in seen:
            seen.add(it["id"])
            uniq.append(it)
    uniq.sort(key=lambda x: (x["date"] or "", x["first_seen"]), reverse=True)

    items_out = {
        "_note": "collector/collect.py 가 만든 실제 수집 데이터. 제목·날짜·링크만 저장한다. 원문은 링크에서.",
        "generated_at": NOW_S,
        "sources": sources,
        "dept_boards": sorted(dept_names),  # 글을 모으는 학과 게시판 (화면이 '아직 안 모음' 안내에 씀)
        "items": uniq,
    }

    print("학식")
    prev_meals = load_prev("meals.json") or {"restaurants": {}}
    rest = {}
    monday = TODAY - timedelta(days=TODAY.weekday())
    for m in cfg["meals"]:
        r = {"label": m["label"], "source": m["url"]}
        if m.get("fallback"):
            r["fallback"] = m["fallback"]
        try:
            days = parse_meals(f.get(m["url"]), m, TODAY.year)
            if not days:
                raise RuntimeError("0일")
            r["days"] = days
            r["updated"] = NOW_S
            if max(days) < monday.isoformat():
                r["stale"] = True
                r["stale_note"] = m.get("stale_note") or "학교 페이지가 아직 이번 주 식단이 아니에요."
            print(f"  {m['id']}: {len(days)}일")
        except Exception as e:
            failed.append("meal:" + m["id"])
            old = prev_meals["restaurants"].get(m["id"], {})
            r["days"] = old.get("days", {})
            r["updated"] = old.get("updated")
            r["error"] = f"{type(e).__name__}: {e}"[:200]
            print(f"  {m['id']}: 실패 {e}", file=sys.stderr)
        rest[m["id"]] = r
    for k, v in cfg["meals_link_only"].items():
        rest[k] = dict(v, days={})
    order = ["baekdu", "six", "one", "sara"]
    meals_out = {
        "_note": "collector/collect.py 가 학교 식단 페이지에서 만든 데이터.",
        "generated_at": NOW_S,
        "week": monday.isoformat(),
        "restaurants": {k: rest[k] for k in order if k in rest} | {k: v for k, v in rest.items() if k not in order},
    }

    print("학사일정")
    acad_out = None
    prev_acad = load_prev("academic.json")
    if not prev_acad or (prev_acad.get("generated_at") or "")[:10] != TODAY.isoformat():  # 하루 한 번만 받는다
        years = [TODAY.year] + ([TODAY.year + 1] if TODAY.month >= 11 else [])
        events = []
        try:
            for y in years:
                try:
                    events += parse_academic(f.get(ACAD_URL.format(y=y)), y)
                except Exception as e:
                    if y == TODAY.year:
                        raise
                    print(f"  {y}: 아직 없음 ({e})")
            if len(events) < 10:
                raise RuntimeError(f"{len(events)}건뿐 (구조가 바뀌었을 수 있음)")
            seen_e, uniq_e = set(), []
            for e in sorted(events, key=lambda e: (e["start"], e["title"])):
                k = (e["start"], e["title"])
                if k not in seen_e:
                    seen_e.add(k)
                    uniq_e.append(e)
            acad_out = {"_note": "collector/collect.py 가 학교 학사일정 페이지에서 하루 한 번 만든 데이터.",
                        "generated_at": NOW_S, "source": ACAD_URL.format(y=TODAY.year), "events": uniq_e}
            print(f"  {len(uniq_e)}건")
        except Exception as e:
            failed.append("academic")
            print(f"  실패 {e}", file=sys.stderr)
    else:
        print("  오늘 이미 받음")

    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        if acad_out:
            (d / "academic.json").write_text(json.dumps(acad_out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        (d / "items.json").write_text(json.dumps(items_out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        (d / "meals.json").write_text(json.dumps(meals_out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"글 {len(uniq)}건, 요청 {f.count}번, 실패 {failed or '없음'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
