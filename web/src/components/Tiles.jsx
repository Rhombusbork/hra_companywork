// 홈 칸 하나하나의 내용. 칸 크기(폭 w칸, 높이 px)에 맞춰 보여 줄 양을 바꾼다:
// 작게 하면 숫자·제목만, 키우면 글이 더 많이 보인다.
import { useApp } from "./ctx.js";
import { ItemRow, AcadRow } from "./ItemRow.jsx";
import { WD, diffDays, mdw, dLabel, cleanTitle, weekday } from "../lib/util.js";

const ROW_PX = 92;   // 글 한 줄 높이(제목 2줄 + 출처, 대략)

function listLimit(hPx, overhead) { return Math.max(1, Math.floor((hPx - overhead) / ROW_PX)); }

// 오늘·달력 칸 (옛 '날짜'와 '이번 주'를 합침). 아이폰 캘린더 위젯처럼 왼쪽은 오늘, 오른쪽은 이달 달력.
// 칸을 키울수록 아래로 정보가 자세해진다: 달(한눈에) → 이번 주(하루씩) → 이번 주 일정 목록.
//   작게(1×1)  : 요일·날짜·오늘 마감 수
//   넓게(2×1~) : 왼쪽 오늘 + 일정 2개 | 오른쪽 이달 달력
//   크게(높이 6줄~): + 이번 주 7일 줄
//   길게(높이 9줄~): + 이번 주 일정 목록
const KIND_LBL = { due: "마감", acad: "학사", bm: "북마크" };
export function CalTile({ hPx }) {
  const { L, goDay } = useApp();
  const t = L.T, [y, m, d] = t.split("-").map(Number), wd = weekday(t);
  const todayEv = L.eventsOn(t);
  const soon = L.soonList();
  const todayDue = soon.filter((it) => diffDays(it.deadline, L.TODAY) === 0).length;
  // 이달 달력
  const ym = t.slice(0, 7), lead = weekday(ym + "-01"), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`)];
  const week = L.weekDays();
  const weekEv = week.flatMap((day) => L.eventsOn(day).filter((e) => !L.isLong(e) || e.date === day).map((e) => ({ ...e, day })))
    .filter((e, i, arr) => arr.findIndex((x) => x.title === e.title && x.kind === e.kind) === i);
  const showWeek = hPx >= 340, showAgenda = hPx >= 440;
  const agendaN = Math.max(0, Math.floor((hPx - 380) / 30));
  return (
    <div className="t-cal">
      <div className="cal-top">
        <div className="cal-today">
          <span className="ct-wd">{WD[wd]}요일</span>
          <button className="ct-day mono" onClick={() => goDay(t)} aria-label={`${m}월 ${d}일 일정 보기`}>{d}</button>
          <span className="ct-sub">오늘 마감 <b>{todayDue}</b> · 이번 주 <b>{soon.length}</b></span>
          <ul className="ct-ev">
            {todayEv.length ? todayEv.slice(0, 2).map((e, i) => (
              <li key={i} className={"k-" + e.kind}><b>{KIND_LBL[e.kind]}</b><span>{e.title.replace(/^\[예시\]\s*/, "")}</span></li>
            )) : <li className="none"><span>오늘 일정 없음</span></li>}
          </ul>
        </div>
        <div className="cal-month" aria-label={`${m}월 달력`}>
          <span className="cm-title">{m}월</span>
          <div className="cm-grid cm-wd">{WD.map((w, i) => <span key={w} className={i === 0 ? "sun" : i === 6 ? "sat" : ""}>{w}</span>)}</div>
          <div className="cm-grid">
            {cells.map((c, i) => {
              if (!c) return <span key={"p" + i} />;
              const k = L.dotKinds(L.eventsOn(c), c);
              return (
                <button key={c} className={"cm-d" + (c === t ? " today" : "") + (i % 7 === 0 ? " sun" : i % 7 === 6 ? " sat" : "")} onClick={() => goDay(c)} aria-label={`${mdw(c)} 일정 ${k.length ? "있음" : "없음"}`}>
                  {+c.slice(8)}{k.length > 0 && <i className={"cm-dot " + k[0]} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {showWeek && (
        <div className="cal-week">
          <div className="b-head"><span className="b-k"><span className="mono">THIS WEEK</span> 이번 주</span><a href="#schedule">일정 ›</a></div>
          <div className="wk">
            {week.map((day) => {
              const es = L.eventsOn(day);
              return (
                <button key={day} className={"wk-day" + (day === t ? " today" : "")} data-day={day} aria-label={`${mdw(day)} 일정 ${es.length}개`} onClick={() => goDay(day)}>
                  <span className="wd">{WD[weekday(day)]}</span><span className="dn">{+day.slice(8)}</span>
                  <span className="dots">{L.dotKinds(es, day).map((k) => k === "bm" ? <i key={k} className="dot bm">★</i> : <i key={k} className={"dot " + k} />)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {showAgenda && agendaN > 0 && (
        <ul className="cal-agenda">
          {weekEv.slice(0, agendaN).map((e, i) => (
            <li key={i} className={"k-" + e.kind}><span className="ca-d mono">{mdw(e.day)}</span><b>{KIND_LBL[e.kind]}</b><a href={e.url} target="_blank" rel="noopener">{e.title.replace(/^\[예시\]\s*/, "")}</a></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UrgentTile() {
  const { L, openItem } = useApp();
  const top = L.soonList()[0];
  if (!top) return <div className="t-urgent calm"><span className="b-k"><span className="mono">DUE</span> 마감</span><span className="b-big mono">0</span><span className="b-title">7일 안에 마감되는 글이 없어요</span></div>;
  const d = diffDays(top.deadline, L.TODAY);
  return (
    <a className="t-urgent" href={top.url} data-open={top.id} onClick={(e) => { e.preventDefault(); openItem(top.id); }}>
      <span className="b-k"><span className="mono">DUE</span> 가장 먼저 마감</span>
      <span className="b-big mono">{dLabel(d)}</span>
      <span className="b-title">{cleanTitle(top.title)}</span>
      <span className="b-foot"><span>{L.srcOf(top)}</span><span className="mono">{mdw(top.deadline)}</span></span>
    </a>
  );
}

export function CountTile() {
  const { L } = useApp();
  return (
    <a className="t-count" href="#schedule">
      <span className="b-k"><span className="mono">WEEK</span> 이번 주 마감</span>
      <span className="b-big mono">{L.soonList().length}</span>
      <span className="b-foot"><span>건</span><span>일정 ›</span></span>
    </a>
  );
}

// 지금 시간에 맞는 끼니 (10시 전 조식, 14시 전 중식, 그 뒤 석식). 그 끼니가 없으면 가장 가까운 끼니
const MEAL_ORDER = ["조식", "중식", "석식"];
function seoulHour() {
  try { return +new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(new Date()); } catch (e) { return new Date().getHours(); }
}
export function pickMeal(meals) {
  const h = seoulHour();
  const want = h < 10 ? 0 : h < 14 ? 1 : 2;
  const kind = (m) => MEAL_ORDER.findIndex((k) => m.meal.startsWith(k) || m.meal.includes(k));
  const scored = meals.map((m) => ({ m, k: kind(m) })).filter((x) => x.k >= 0);
  const exact = scored.filter((x) => x.k === want);
  if (exact.length) return exact.map((x) => x.m).sort((a, b) => /간편/.test(a.meal) - /간편/.test(b.meal));
  const before = scored.filter((x) => x.k < want).sort((a, b) => b.k - a.k);
  if (before.length) return [before[0].m];
  return meals.slice(0, 1);
}

export function MealTile({ hPx, wCols }) {
  const { L } = useApp();
  const ms = L.todayMeals().filter((x) => x.state === "menu");
  if (!ms.length) return <a className="t-meal" href="#c-meal"><span className="b-k"><span className="mono">MENU</span> 오늘 학식</span><span className="b-title">식단 보기</span></a>;
  const rows = Math.max(1, Math.floor((hPx - 46) / 52));
  // 메뉴 칸에 섞인 ★·※ 같은 기호만 있는 줄은 뺀다
  const clean = (m) => ({ ...m, menu: m.menu.filter((x) => /[가-힣A-Za-z0-9]/.test(x)) });
  const items = ms.flatMap(({ r, meals }) => pickMeal(meals).slice(0, 1).map((m) => ({ r, m: clean(m) }))).filter((x) => x.m.menu.length);
  return (
    <a className="t-meal" href="#c-meal">
      <span className="b-k"><span className="mono">MENU</span> 오늘 학식</span>
      <ul className="meal-mini">
        {items.slice(0, rows).map(({ r, m }) => {
          const cheap = /천원/.test(m.meal + " " + (m.note || ""));
          const insta = m.note === "인스타 글";
          return (
            <li key={r.label}>
              <small>{r.label} · {m.meal.replace(/\(천원의 아침밥\)/, "")}{cheap && <em className="mt-tag">천원</em>}{insta && <em className="mt-tag insta">인스타</em>}</small>
              <b>{m.menu[0]}</b>
              {m.menu.length > 1 && <span>{m.menu.slice(1, 4).join(" · ")}</span>}
            </li>
          );
        })}
      </ul>
    </a>
  );
}

export function NextTile({ hPx }) {
  const { L, openItem } = useApp();
  const n = Math.max(1, Math.floor((hPx - 60) / 41));
  const next = L.soonList().slice(1, 1 + n);
  return (
    <div className="t-next">
      <div className="b-head"><span className="b-k"><span className="mono">NEXT</span> 그다음 마감</span><a href="#schedule">달력 ›</a></div>
      {next.length ? (
        <ol className="b-list">{next.map((it) => (
          <li key={it.id}><a href={it.url} data-open={it.id} onClick={(e) => { e.preventDefault(); openItem(it.id); }}><b className="mono">{dLabel(diffDays(it.deadline, L.TODAY))}</b><span>{cleanTitle(it.title)}</span></a></li>
        ))}</ol>
      ) : <p className="empty">이번 주는 여기까지예요.</p>}
    </div>
  );
}

// 내 학과: 학과 게시판 글 + 칩(졸업·학사, 장학 …)
export function DeptBlock({ limit, full }) {
  const { D, P, L, update } = useApp();
  const items = L.deptItems();
  const boards = L.myBoards();
  const tagSel = L.chipSel("dept");
  const name = boards.length ? boards.map((b) => b.label).join(" · ") : "학과를 아직 고르지 않았어요";
  const counts = {};
  items.forEach((it) => it._tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  const shown = tagSel !== "all" ? items.filter((it) => it._tags.includes(tagSel)) : items;
  const tags = D.cfg.dept_tags.filter((t) => counts[t.id] || (t.id === "teach" && P.teach));
  const got = new Set(D.meta.dept_boards || []);
  const notYet = D.meta.dept_boards ? boards.filter((b) => b.board && !got.has(b.board)) : [];
  const pick = (id) => update((p) => { p.chips = { ...(p.chips || {}), dept: id }; });
  let empty = null;
  if (!boards.length) empty = <p className="empty">설정에서 학과를 고르면 학과 게시판 글을 여기에 모아 보여 드려요. <a href="#dept">학과 넣기</a></p>;
  else if (!shown.length) empty = <p className="empty">최근 글이 없어요. 아직 수집하지 않는 학과일 수 있어요. {boards.map((b, i) => <span key={b.id}>{i > 0 && " · "}{b.board ? <a href={b.board} target="_blank" rel="noopener">{b.label} 게시판</a> : b.label}</span>)}</p>;
  return (
    <>
      <div className="card-head">
        <div><h2>내 학과</h2><div className="sub">{name}</div></div>
        {!full && items.length > limit && <a href="#c-dept">전체 {items.length} ›</a>}
      </div>
      {notYet.length > 0 && (
        <p className="hint not-yet">{notYet.map((b) => b.label).join("·")} 게시판은 아직 모으지 않아요. 본부·센터 글 중 학과와 관련된 것만 보여요. {notYet.map((b, i) => <span key={b.id}>{i > 0 && " · "}<a href={b.board} target="_blank" rel="noopener">{b.label} 게시판 열기</a></span>)}</p>
      )}
      {tags.length > 0 && (
        <div className="tagrow">
          <button className={"chip" + (tagSel === "all" ? " on" : "")} data-tag="all" onClick={() => pick("all")}>전체<span className="n">{items.length}</span></button>
          {tags.map((t) => <button key={t.id} className={"chip" + (tagSel === t.id ? " on" : "")} data-tag={t.id} onClick={() => pick(t.id)}>{t.label}<span className="n">{counts[t.id] || 0}</span></button>)}
        </div>
      )}
      {empty || <ul className="items">{shown.slice(0, limit).map((it) => <ItemRow key={it.id} it={it} catId="dept" />)}</ul>}
    </>
  );
}

// 분류 하나 (학사·장학 …). 학사처럼 칩이 있는 분류는 칩으로 나눠 본다
export function CatBlock({ cat, items, limit, catId, title, href, full }) {
  const { L, update } = useApp();
  const sel = cat && cat.chips ? L.chipSel(cat.id) : "all";
  const ch = sel !== "all" && cat && cat.chips.find((x) => x.id === sel);
  let n, body;
  if (ch && ch.academic) {
    const ev = L.acadUpcoming(); n = ev.length;
    body = <ul className="items">{ev.slice(0, limit).map((e, i) => <AcadRow key={i} e={e} />)}</ul>;
  } else {
    const shown = ch ? items.filter((it) => L.chipHit(ch, it, cat)) : items; n = shown.length;
    body = shown.length ? <ul className="items">{shown.slice(0, limit).map((it) => <ItemRow key={it.id} it={it} catId={catId} />)}</ul> : <p className="empty">{cat && cat.chips ? "이 유형의 글이 없어요." : "글이 없어요."}</p>;
  }
  const pick = (v) => update((p) => { p.chips = { ...(p.chips || {}), [cat.id]: v }; });
  return (
    <>
      {title && <div className="card-head"><h2>{title}</h2>{!full && n > limit && <a href={"#" + href}>전체 {n} ›</a>}</div>}
      {cat && cat.chips && (
        <div className="tagrow">
          <button className={"chip" + (sel === "all" ? " on" : "")} data-chip={cat.id} data-val="all" onClick={() => pick("all")}>전체<span className="n">{items.length}</span></button>
          {cat.chips.map((c) => [c, c.academic ? L.acadUpcoming().length : items.filter((it) => L.chipHit(c, it, cat)).length]).filter(([, k]) => k).map(([c, k]) => (
            <button key={c.id} className={"chip" + (sel === c.id ? " on" : "")} data-chip={cat.id} data-val={c.id} onClick={() => pick(c.id)}>{c.label}<span className="n">{k}</span></button>
          ))}
        </div>
      )}
      {body}
    </>
  );
}

export function TileBody({ w, hPx, used }) {
  const { L, P } = useApp();
  switch (w.id) {
    case "cal": return <CalTile hPx={hPx} />;
    case "urgent": return <UrgentTile />;
    case "count": return <CountTile />;
    case "meal": return <MealTile hPx={hPx} />;
    case "next": return <NextTile hPx={hPx} />;
    case "dept": return <div className="t-list"><DeptBlock limit={listLimit(hPx, L.myBoards().length ? 150 : 90)} /></div>;
    case "kw": return <div className="t-list"><CatBlock items={L.kwItems(used)} limit={listLimit(hPx, 80)} catId="kw" title={"내 키워드 · " + P.kwIn.join(", ")} href="c-kw" /></div>;
    default:
      if (w.cat) return <div className="t-list"><CatBlock cat={w.cat} items={L.catItems(w.cat, used)} limit={listLimit(hPx, w.cat.chips ? 130 : 80)} catId={w.cat.id} title={w.cat.label} href={"c-" + w.cat.id} /></div>;
      return null;
  }
}
