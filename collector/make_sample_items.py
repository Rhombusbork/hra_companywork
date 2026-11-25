"""화면 시안용 예시 items.json 을 만든다. 실제 수집기가 생기면 지운다.

제목은 07(11/21 수집 기록)과 02-1(학과 전수표)에 적힌 것을 썼다.
날짜·마감일 일부와 [예시] 가 붙은 글은 화면 시험용으로 넣은 값이다.
"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
deps = {d["id"]: d["board"] for d in json.load(open(ROOT / "site/data/departments.json", encoding="utf-8"))}

JNU = "https://www.jejunu.ac.kr/ara/noticesurvey/outEvent.htm"
SRC = {
    "jnu":       ("본부 공지사항", JNU),
    "dormitory": ("학생생활관", "https://dormitory.jejunu.ac.kr/dormitory/notice/notice.htm"),
    "intl":      ("국제교류", "https://intl.jejunu.ac.kr/intl/community/notice2.htm"),
    "clip":      ("진로취업 clip", "https://clip.jejunu.ac.kr/clip/community/notice.htm"),
    "jedaero":   ("제대로 산학1번지", "https://jedaero.jejunu.ac.kr/Platform/prm/list/total.do"),
    "library":   ("중앙도서관", "https://lib.jejunu.ac.kr/"),
}
CAT = {"장학": 323, "학사": 320, "수업": 321, "등록": 322, "행사": 200, "봉사": 197, "일반": 203}

items = []
ATT = {
    "2027년 1학기 국가장학금 1차 신청 안내": ["2027-1 국가장학금 1차 신청 안내문.jpg"],
    "자매국수 장학생 선발 안내": ["자매국수 장학생 선발 공고.pdf", "추천서 양식.hwp"],
    "관정이종환교육재단 장학생 선발 안내": ["선발 요강.pdf", "지원서.hwp"],
    "호주 글로벌 인턴십 참가자 모집": ["모집 공고.pdf", "포스터.jpg"],
    "자가 점검표 제출 안내": ["자가 점검표.hwp", "안내문.pdf"],
    "학과 국가근로장학생 모집": ["모집 안내.pdf", "신청서.hwp"],
}

def add(src, title, date, cat=None, deadline=None, dept=None, also=None, seen=None, url=None, office=None):
    if dept:
        name, base = "학과 게시판", deps[dept]
    else:
        name, base = SRC[src]
    if not url:
        url = base + (f"?category={CAT[cat]}" if src == "jnu" and cat else "")
    # 마감일을 어디서 얻었나: 칸(jedaero) / 제목의 (~M.D.) / 첨부를 AI 가 읽은 추정
    src_dl = None
    if deadline:
        src_dl = "field" if src == "jedaero" else "title" if "(~" in title else "ai"
    att = [{"name": n, "url": base} for n in ATT.get(title, [])]
    items.append({
        "id": f"{src}:{len(items)+1}", "source": src, "source_name": name,
        "category": cat, "title": title, "url": url, "date": date,
        "dept": office, "dept_board": base if dept else None,
        "deadline": deadline, "deadline_src": src_dl, "attachments": att, "also_posted": also or [],
        "first_seen": (seen or date) + "T07:17:00+09:00",
    })

# 본부 — 07 7절 [확인] 제목
add("jnu", "2027년 1학기 국가장학금 1차 신청 안내", "2026-11-18", "장학", office="학생복지과(장학)", deadline="2026-12-29")
add("jnu", "자매국수 장학생 선발 안내", "2026-11-03", "장학", office="학생복지과(장학)",
    also=["약학대학", "간호대학"], url=JNU + "?act=view&seq=282814", deadline="2026-11-28")
add("jnu", "자립준비청년 장학 안내", "2026-11-12", "장학", office="학생복지과(장학)")
add("jnu", "관정이종환교육재단 장학생 선발 안내", "2026-11-04", "장학", office="학생복지과(장학)", deadline="2026-11-26")
add("jnu", "동기 계절수업 폐강 교과목 안내", "2026-11-20", "학사", office="학사과", seen="2026-11-22")
# 본부 — [예시]
add("jnu", "[예시] 2027학년도 1학기 휴학·복학 신청 안내", "2026-11-21", "학사", office="학사과", deadline="2027-01-30", seen="2026-11-22")
add("jnu", "[예시] 동기 계절수업 등록금 납부 안내(~11.27.)", "2026-11-19", "등록", office="재무과", deadline="2026-11-27")
add("jnu", "[예시] 2027학년도 교직과정 이수 예정자 선발 안내(~12.5.)", "2026-11-13", "학사", office="학사과", deadline="2026-12-05")
add("jnu", "[예시] 교내 TOEIC 정기시험 응시 신청 안내", "2026-11-17", "일반", office="학생지원과", deadline="2026-12-01")
add("jnu", "[예시] 겨울방학 해외봉사단 단원 모집(~11.28.)", "2026-11-14", "봉사", office="학생지원과", deadline="2026-11-28")
add("jnu", "[예시] 2026 제주대학교 학생 성과 공유회 개최", "2026-11-16", "행사", office="학생지원과")
add("jnu", "[예시] 아라캠퍼스 정문 일대 도로 공사 안내", "2026-11-10", "일반", office="시설과")

add("dormitory", "자가 점검표 제출 안내", "2026-11-17", deadline="2026-11-24")
add("dormitory", "[예시] 2027학년도 1학기 생활관 입사 신청 안내(~12.3.)", "2026-11-22", deadline="2026-12-03", seen="2026-11-22")
add("intl", "남유타대 동계 단기 교류수학 선발 결과", "2026-11-19")
add("intl", "[예시] 2027학년도 1학기 교환학생 파견 모집", "2026-11-10", deadline="2026-11-30")
add("clip", "호주 글로벌 인턴십 참가자 모집", "2026-11-12", deadline="2026-11-29")
add("clip", "[예시] 공기업 NCS 모의고사 신청", "2026-11-18", deadline="2026-11-26")
add("jedaero", "[예시] 겨울방학 기업 현장실습 참여 학생 모집", "2026-11-15", deadline="2026-11-28")
add("jedaero", "[예시] 2026 창업 아이디어 경진대회", "2026-11-09", deadline="2026-12-05")
add("library", "독서챌린지 조기 종료 안내", "2026-11-18")

# 학과 — 02-1 [확인] 제목 (날짜는 일부 [예시])
add("dept", "삼성서울병원 전공약사 채용", "2026-11-03", dept="pharmacy")
add("dept", "약학 전문가 특강", "2026-10-28", dept="pharmacy")
add("dept", "[예시] 약학대학 튜터링 프로그램 튜터 모집(~11.30.)", "2026-11-21", dept="pharmacy", deadline="2026-11-30", seen="2026-11-22")
add("dept", "2027년 국립중앙의료원 채용", "2026-11-17", dept="nursing")
add("dept", "2026학년도 2학기 졸업시험 결과", "2026-11-10", dept="chinese")
add("dept", "2027 WINTER 대만 단기연수 선발 결과", "2026-11-05", dept="chinese")
add("dept", "제31회 전도중국어말하기대회", "2026-10-30", dept="chinese")
add("dept", "학과 국가근로장학생 모집", "2026-11-15", dept="archieng", deadline="2026-11-24")
add("dept", "(주)행림건축사사무소 신입 공채", "2026-11-08", dept="archieng")
add("dept", "2026.2학기 재학생 진로상담 실시 알림", "2026-11-02", dept="dba")
add("dept", "[예시] 경영학과 국가근로장학생 추가 모집(~11.25.)", "2026-11-20", dept="dba", deadline="2026-11-25", seen="2026-11-22")
add("dept", "2027년 「지방 국립대학 전액 장학금」 알림", "2026-11-11", dept="tourism")
add("dept", "예비 중등교원 지역연계 현장역량 강화 프로그램", "2026-11-06", dept="bioedu")
add("dept", "[졸업] 졸업대상자 이수 현황 확인 안내", "2026-11-12", dept="history")
add("dept", "교류수학 신청 관련 안내(필독)", "2026-10-20", dept="politics")
add("dept", "[프로그램] 2027학년도 제1학기 해외파견 교류수학", "2026-11-14", dept="fineart")
add("dept", "교내 근로장학생 공고", "2026-11-09", dept="physics")
add("dept", "국가근로장학생(학과) 선발계획", "2026-11-07", dept="chemeng")

out = {
    "_note": "예시 데이터. 제목은 07·02-1 기록에서 가져왔고, [예시] 글과 날짜·마감일 일부는 화면 시험용 값이다.",
    "generated_at": "2026-11-23T07:17:00+09:00",
    "sources": {k: {"name": v[0], "updated": "2026-11-23T07:17:00+09:00"} for k, v in SRC.items()} | {"dept": {"name": "학과 게시판", "updated": "2026-11-22T19:41:00+09:00"}},
    "items": items,
}
(ROOT / "site/data/items.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(items), "items")
