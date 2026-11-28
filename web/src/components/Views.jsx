// 홈 말고 다른 화면: 일정 · 분류 목록 · 학식 · 검색
import { useApp } from "./ctx.js";
import { Header, Catbar, Footer, Back } from "./Chrome.jsx";
import { ItemRow, AcadRow } from "./ItemRow.jsx";
import { DeptBlock, CatBlock } from "./Tiles.jsx";
import { MealPage } from "./Meal.jsx";
import { WD, md, mdw } from "../lib/util.js";

const KIND = { due: "마감", acad: "학사", bm: "북마크" };

function Dots({ kinds }) {
  return <span className="dots">{kinds.map((k) => k === "bm" ? <i key={k} className="dot bm">★</i> : <i key={k} className={"dot " + k} />)}</span>;
}

function EvRow({ e, showDate }) {
  return (
    <li className="ev">
      {showDate && <span className="ev-date">{md(e.date)}{e.end && e.end !== e.date ? "~" + md(e.end) : ""}</span>}
      <span className={"badge k-" + e.kind}>{KIND[e.kind]}</span>{e.ai && <span className="badge ai">AI 추정</span>}
      <a href={e.url} target="_blank" rel="noopener">{e.title}</a><span className="ev-src">{e.src}</span>
    </li>
  );
}

export function Schedule() {
  const { L, P, ui, setUi, openBm } = useApp();
  const today = L.T;
  const sel = ui.selDay || today;
  const ym = ui.calMonth || sel.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const lead = new Date(`${ym}-01T12:00:00Z`).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const evs = L.events();
  const selEvs = L.eventsOn(sel);
  const meals = sel === today ? L.todayMeals().filter((x) => x.state !== "none") : [];
  const monthEvs = evs.filter((e) => e.date.slice(0, 7) === ym || (e.end && e.date.slice(0, 7) < ym && e.end.slice(0, 7) >= ym))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : L.kindOrder[a.kind] - L.kindOrder[b.kind]));
  const pickDay = (d) => setUi({ selDay: d, calMonth: d.slice(0, 7) });
  return (
    <>
      <Header />
      <Catbar current="schedule" />
      <div className="sched">
        <section className="card cal">
          <div className="cal-head">
            <button className="nav" data-month={prev} aria-label="이전 달" onClick={() => setUi({ calMonth: prev })}>‹</button>
            <h2>{y}년 {m}월</h2>
            <button className="nav" data-month={next} aria-label="다음 달" onClick={() => setUi({ calMonth: next })}>›</button>
          </div>
          <div className="cal-grid wdh">{WD.map((w, i) => <span key={w} className={i === 0 ? "sun" : i === 6 ? "sat" : ""}>{w}</span>)}</div>
          <div className="cal-grid">
            {Array.from({ length: lead }, (_, i) => <span key={"p" + i} className="cd pad" />)}
            {Array.from({ length: days }, (_, i) => {
              const iso = `${ym}-${String(i + 1).padStart(2, "0")}`, es = L.eventsOn(iso), wd = (lead + i) % 7;
              return (
                <button key={iso} className={"cd" + (iso === today ? " today" : "") + (iso === sel ? " sel" : "") + (wd === 0 ? " sun" : wd === 6 ? " sat" : "")}
                  data-day={iso} aria-label={`${mdw(iso)} 일정 ${es.length}개`} aria-current={iso === sel ? "date" : undefined} onClick={() => pickDay(iso)}>
                  <span className="dn">{i + 1}</span><Dots kinds={L.dotKinds(es, iso)} />
                </button>
              );
            })}
          </div>
          <p className="legend"><span><i className="dot due" />마감</span><span><i className="dot acad" />학사일정</span><span><i className="dot bm">★</i>북마크</span></p>
        </section>
        <div className="side">
          <section className="card">
            <div className="card-head"><h2>{sel === today ? "오늘" : "고른 날"} · {mdw(sel)}</h2>{sel !== today && <a href="#schedule" onClick={(e) => { e.preventDefault(); pickDay(today); }}>오늘로</a>}</div>
            <ul className="evs">
              <li className="ev muted-row"><span className="badge k-tt">시간표</span><span>학생정보 연동 시 여기에 그날 수업이 나와요 (개선 제안)</span></li>
              {selEvs.map((e, i) => <EvRow key={i} e={e} />)}
              {meals.length > 0 && <li className="ev"><span className="badge k-meal">학식</span><a href="#c-meal">{meals.length}곳 식단 보기</a></li>}
            </ul>
            {!selEvs.length && <p className="empty">이날은 마감·학사일정·북마크가 없어요.</p>}
          </section>
          <section className="card">
            <div className="card-head"><h2>{m}월 안내</h2><span className="sub">{monthEvs.length}건</span></div>
            {monthEvs.length ? <ul className="evs">{monthEvs.map((e, i) => <EvRow key={i} e={e} showDate />)}</ul> : <p className="empty">이달 일정이 없어요.</p>}
          </section>
          <section className="card bm-mini">
            <div className="card-head"><h2>북마크 {Object.keys(P.bm).length}</h2><button className="btn" data-act="bm-open" onClick={openBm}>북마크 열기</button></div>
            <p className="why">글의 ☆ 를 누르면 달력에 ★ 로 찍혀요. 목록과 휴대폰 캘린더 내보내기는 북마크 창에 있어요.</p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}

// 분류 화면 우상단: 이 분류에서 찾기 + 마감 남은 것만 + 새 글만 (11/28). 화면을 옮기면 비워진다.
function SecBar({ items }) {
  const { ui, setUi } = useApp();
  const hasDue = items.some((it) => it.deadline);
  return (
    <div className="sec-bar">
      <input type="search" id="sec-q" className="sec-q" placeholder="이 분류에서 찾기" aria-label="이 분류에서 찾기" value={ui.secQ} autoComplete="off" enterKeyHint="search"
        onChange={(e) => setUi({ secQ: e.target.value })} />
      <span className="sec-toggles">
        {hasDue && <button className={"chip" + (ui.secOpen ? " on" : "")} aria-pressed={ui.secOpen} onClick={() => setUi({ secOpen: !ui.secOpen })}>마감 남은 것만</button>}
        <button className={"chip" + (ui.secNew ? " on" : "")} aria-pressed={ui.secNew} onClick={() => setUi({ secNew: !ui.secNew })}>새 글만</button>
      </span>
    </div>
  );
}

export function ListView({ id }) {
  const { L, P } = useApp();
  if (id === "dept") {
    return (<><Header /><Catbar current="c-dept" /><Back><h2>내 학과</h2><SecBar items={L.deptItems()} /></Back><div className="stack"><section className="card main"><DeptBlock limit={999} full /></section></div><Footer /></>);
  }
  let title, items, extra = null, cat = null;
  if (id === "kw") { title = "내 키워드 · " + P.kwIn.join(", "); items = L.kwItems(); }
  else {
    cat = L.catById(id); if (!cat) { location.hash = "home"; return null; }
    title = cat.label; items = L.catItems(cat); extra = <p className="why">{cat.desc}</p>;
  }
  return (
    <>
      <Header /><Catbar current={"c-" + id} />
      <Back><h2>{title}</h2><SecBar items={items} /></Back>{extra}
      <div className="list-card"><CatBlock cat={cat} items={items} limit={999} catId={id} full /></div>
      <Footer />
    </>
  );
}

export function MealView() {
  const { L } = useApp();
  return (
    <>
      <Header /><Catbar current="c-meal" />
      <Back><h2>학식 · {mdw(L.T)}</h2></Back>
      <MealPage />
      <p className="hint" style={{ margin: "12px 4px 0" }}>식당을 누르면 홈의 ‘오늘 학식’ 칸에도 그 식당이 떠요. 끼니는 시간에 맞춰 열려요 (10시 전 아침 · 15시 전 점심 · 15시부터 저녁).</p>
      <Footer />
    </>
  );
}

// 제목·게시판·작성 부서에서 찾는다. 띄어 쓴 낱말이 모두 들어간 글만. 숨긴 정보원·뺄 키워드도 무시하고 전부 찾는다
export function SearchView() {
  const { D, ui, setUi } = useApp();
  const q = ui.searchQ;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (txt) => words.every((w) => txt.toLowerCase().includes(w));
  let body = <p className="hint">제목, 게시판 이름, 작성 부서에서 찾아요. 예: 근로장학, 교환학생, 계절수업</p>;
  if (words.length) {
    const items = D.items.filter((it) => hit([it.title, it.source_name, it.dept || "", it.category || ""].join(" ")))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 100);
    const acad = D.academic.events.filter((e) => hit(e.title + " 학사일정")).slice(0, 20);
    body = (
      <>
        <p className="hint">{items.length}건{items.length === 100 ? " 넘게 (최근 100건만)" : ""}{acad.length ? ` · 학사일정 ${acad.length}건` : ""}</p>
        {acad.length > 0 && <ul className="items">{acad.map((e, i) => <AcadRow key={i} e={e} />)}</ul>}
        {items.length ? <ul className="items">{items.map((it) => <ItemRow key={it.id} it={it} catId="search" />)}</ul> : <p className="empty">찾는 글이 없어요. 낱말을 줄이거나 바꿔 보세요.</p>}
      </>
    );
  }
  return (
    <>
      <Header /><Catbar current="search" />
      <Back><h2>검색</h2></Back>
      <div className="list-card">
        <input type="search" id="search-q" className="search-q" placeholder="찾을 낱말 (예: 근로장학)" value={q} autoComplete="off" enterKeyHint="search" autoFocus
          onChange={(e) => setUi({ searchQ: e.target.value })} />
        {body}
      </div>
      <Footer />
    </>
  );
}
