#!/usr/bin/env python3
"""사이트를 헤드리스 브라우저로 눌러 보는 시험. 루프(16)에서 사이트를 고친 뒤 꼭 돌린다.

  pip install playwright && python -m playwright install chromium
  python tests/ui_check.py            # site/ 와 옛 /v2/ 넘김
  python tests/ui_check.py --shots D  # 화면 캡처를 D 에 저장

JS 오류가 하나라도 나거나 확인이 실패하면 종료 코드 1.
"""
import argparse
import functools
import http.server
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PHONE = {"width": 390, "height": 844}
PC = {"width": 1280, "height": 860}


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    h = functools.partial(Quiet, directory=str(ROOT))
    srv = socketserver.TCPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


class Check:
    def __init__(self):
        self.fails = []
        self.n = 0

    def ok(self, cond, what):
        self.n += 1
        if not cond:
            self.fails.append(what)
            print("  ✗", what)


def run_site(b, base, path, c, shots):
    tag = path.strip("/")
    errs = []

    def page(vp):
        ctx = b.new_context(viewport=vp, accept_downloads=True)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(f"{tag}: {e}"))
        pg.on("console", lambda m: m.type == "error" and "favicon" not in m.text and errs.append(f"{tag} console: {m.text}"))
        return ctx, pg

    def shot(pg, name):
        if shots:
            pg.screenshot(path=f"{shots}/{tag}_{name}.png")

    url = base + path
    # 1. 처음 온 사람: 바로 홈, 학과 넣기 띠, 마지막 갱신
    ctx, pg = page(PHONE)
    pg.goto(url); pg.wait_for_timeout(1200)
    body = pg.inner_text("body")
    c.ok("마지막 갱신" in body, f"{tag}: 마지막 갱신 표시")
    c.ok("학과 넣기" in body, f"{tag}: 처음엔 학과 넣기 띠")
    c.ok("[예시]" not in body, f"{tag}: 홈에 [예시] 데이터 없음")
    c.ok(pg.locator(".item").count() > 3, f"{tag}: 홈에 글 목록")
    shot(pg, "1_home_phone")

    # 2. 학과 넣기 → 약학과 → 저장 → 홈에 내 학과
    pg.get_by_text("학과 넣기").first.click(); pg.wait_for_timeout(400)
    c.ok(pg.url.endswith("#dept"), f"{tag}: 학과 넣기 → #dept")
    search = pg.locator("input[type=search], input[type=text]").first
    if search.count():
        search.fill("약학"); pg.wait_for_timeout(300)
    opt = pg.locator("button.dept-opt", has_text="약학과").first
    c.ok(opt.count() == 1, f"{tag}: 학과 목록에 약학과")
    if opt.count():
        opt.click(); pg.wait_for_timeout(300)
        save = pg.locator("[data-act=dept-save], [data-act=save]").first
        save.click(); pg.wait_for_timeout(600)
        c.ok("약학과" in pg.inner_text("body"), f"{tag}: 저장 뒤 홈에 약학과")
        c.ok("학과 넣기" not in pg.inner_text("body"), f"{tag}: 저장 뒤 학과 넣기 띠 사라짐")
    shot(pg, "2_dept_saved")

    # 3. 분류 탭과 칩
    for label in ["장학", "학사", "학식", "일정"]:
        a = pg.locator("nav.catbar a", has_text=label).first
        if a.count():
            a.click(); pg.wait_for_timeout(400)
            c.ok(len(pg.inner_text("body")) > 200, f"{tag}: '{label}' 탭 열림")
    pg.goto(url + "#schedule"); pg.wait_for_timeout(500)
    c.ok("[예시]" not in pg.inner_text("body"), f"{tag}: 일정 탭에 [예시] 없음")
    shot(pg, "3_schedule")
    pg.goto(url + "#c-haksa"); pg.wait_for_timeout(500)
    chips = pg.locator(".tagrow .chip, .chipbar .chip, button.chip")
    if chips.count() > 1:
        chips.nth(1).click(); pg.wait_for_timeout(300)
        c.ok(True, f"{tag}: 칩 누름")

    # 4. 제목 누르기 (v2: 상세 창 / v1: 새 탭)
    pg.goto(url + "#"); pg.wait_for_timeout(600)
    t = pg.locator(".item a.t[href*='act=view']").first
    if t.count():
        if t.get_attribute("data-open"):
            t.click(); pg.wait_for_timeout(400)
            c.ok(pg.locator(".sheet").count() == 1, f"{tag}: 제목 → 상세 창")
            c.ok("원문" in pg.locator(".sheet").inner_text(), f"{tag}: 상세 창에 원문 버튼")
            shot(pg, "4_detail")
            pg.locator(".sheet [data-close]").first.click(); pg.wait_for_timeout(300)
            c.ok(pg.locator(".sheet").count() == 0, f"{tag}: 상세 창 닫힘")
        else:
            c.ok(t.get_attribute("target") == "_blank", f"{tag}: 제목 → 원문 새 탭")

    # 5. 북마크 → 북마크 창 → .ics
    star = pg.locator(".item button.star").first
    if star.count():
        star.click(); pg.wait_for_timeout(300)
        c.ok(pg.locator(".item button.star.on").count() >= 1, f"{tag}: 북마크 켜짐")
        opener = pg.locator("[data-act=bm-open]").first
        if opener.count():
            opener.click(); pg.wait_for_timeout(400)
            c.ok("북마크 1" in pg.inner_text("body"), f"{tag}: 북마크 창에 1개")
            shot(pg, "5_bookmarks")
            pg.locator("[data-close]").first.click(); pg.wait_for_timeout(300)

    # 6. 설정 열고 저장
    pg.goto(url + "#setup"); pg.wait_for_timeout(500)
    c.ok("저장" in pg.inner_text("body"), f"{tag}: 설정 화면")
    pg.locator("[data-act=save]").first.click(); pg.wait_for_timeout(400)
    c.ok("#setup" not in pg.url, f"{tag}: 설정 저장 → 홈")
    ctx.close()

    # 7. 학과 링크 ?dept=
    for q in ["pharmacy-1", "간호학과", "pharmacy"]:
        ctx, pg = page(PHONE)
        pg.goto(url + "?dept=" + q); pg.wait_for_timeout(1000)
        c.ok("학과 넣기" not in pg.inner_text("body"), f"{tag}: ?dept={q} 로 학과 들어감")
        ctx.close()

    # 7-1. 글을 모으지 않는 학과는 안내가 뜬다
    ctx, pg = page(PHONE)
    pg.goto(url + "?dept=korean"); pg.wait_for_timeout(1000)
    c.ok("아직 모으지 않아요" in pg.inner_text("body"), f"{tag}: 안 모으는 학과(국어국문) 안내")
    ctx.close()
    ctx, pg = page(PHONE)
    pg.goto(url + "#dept"); pg.wait_for_timeout(1000)
    c.ok(pg.locator("button.dept-opt small.got").count() >= 2, f"{tag}: 학과 목록에 '게시판 모음' 표시")
    ctx.close()

    # 8. PC 화면
    ctx, pg = page(PC)
    pg.goto(url + "?dept=nursing-1"); pg.wait_for_timeout(1000)
    c.ok(pg.locator(".item").count() > 3, f"{tag}: PC 홈")
    shot(pg, "8_home_pc")
    ctx.close()

    for e in errs:
        c.ok(False, "JS 오류 " + e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots")
    args = ap.parse_args()
    if args.shots:
        Path(args.shots).mkdir(parents=True, exist_ok=True)
    srv, base = serve()
    c = Check()
    paths = ["/site/"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        for path in paths:
            print(path)
            run_site(b, base, path, c, args.shots)
        # 옛 v2 주소는 학과 링크를 들고 v1 으로 넘어가야 한다
        pg = b.new_page(); pg.goto(base + "/site/v2/?dept=pharmacy-1"); pg.wait_for_timeout(1500)
        c.ok(pg.url.rstrip("/").endswith("/site") or "/site/" in pg.url and "/v2" not in pg.url, "옛 /v2/ → v1 으로 넘김")
        c.ok("학과 넣기" not in pg.inner_text("body"), "옛 /v2/?dept= 학과 들고 넘어감")
        pg.close()
        b.close()
    srv.shutdown()
    print(f"확인 {c.n}개, 실패 {len(c.fails)}개")
    return 1 if c.fails else 0


if __name__ == "__main__":
    sys.exit(main())
