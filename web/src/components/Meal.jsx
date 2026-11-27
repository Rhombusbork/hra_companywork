// 학식 판: 학교 '오늘의 식단' 창처럼 [식당 고르기] → [끼니 탭] → [메뉴 상자] 하나씩만 보여 준다.
// 홈 칸(작게 접힘)과 학식 화면(날짜 넘기기까지)에서 같이 쓴다.
import { useEffect, useMemo, useState } from "react";
import { useApp } from "./ctx.js";
import { mealInfo, cleanMenu, defaultMealIndex } from "../lib/meals.js";
import { mdw, WD } from "../lib/util.js";

export function useFavRest() {
  const { D, P, update } = useApp();
  const list = P.rest.filter((id) => D.meals.restaurants[id]);
  const fav = list.includes(P.mealFav) ? P.mealFav : list[0];
  const setFav = (id) => update((p) => { p.mealFav = id; });
  return { list, fav, setFav };
}

export function MealBoard({ day, compact, hPx }) {
  const { D, L } = useApp();
  const { list, fav, setFav } = useFavRest();
  const r = fav && D.meals.restaurants[fav];
  const iso = day || L.T;
  const meals = (r && r.days[iso]) || [];
  const [tab, setTab] = useState(null);
  // 식당·날짜가 바뀌면 시간에 맞는 끼니로 돌아간다
  const def = useMemo(() => defaultMealIndex(meals), [fav, iso, meals.length]);
  useEffect(() => { setTab(null); }, [fav, iso]);
  const cur = tab == null || tab >= meals.length ? def : tab;
  const m = meals[cur];
  const info = m && mealInfo(m);
  const menu = m ? cleanMenu(m.menu) : [];
  const roomy = !compact || (hPx || 0) >= 250;

  if (!list.length) return <p className="empty">설정에서 학식 식당을 골라 주세요.</p>;
  return (
    <div className={"mealb" + (compact ? " compact" : "")}>
      <div className="mb-rest">
        {compact ? (
          <label className="mb-select">
            <span className="sr">식당</span>
            <select value={fav} onChange={(e) => setFav(e.target.value)} onClick={(e) => e.stopPropagation()} aria-label="자주 가는 식당">
              {list.map((id) => <option key={id} value={id}>{D.meals.restaurants[id].label}</option>)}
            </select>
          </label>
        ) : (
          <div className="seg mb-seg" role="tablist" aria-label="식당">
            {list.map((id) => <button key={id} role="tab" aria-selected={id === fav} className={id === fav ? "on" : ""} onClick={() => setFav(id)}>{D.meals.restaurants[id].label}</button>)}
          </div>
        )}
      </div>
      {meals.length ? (
        <>
          <div className="mb-tabs" role="tablist" aria-label="끼니">
            {meals.map((x, i) => {
              const inf = mealInfo(x);
              return <button key={i} role="tab" aria-selected={i === cur} className={i === cur ? "on" : ""} onClick={() => setTab(i)}>{inf.label}</button>;
            })}
          </div>
          <div className="mb-box" role="tabpanel">
            <b className="mb-main">{menu[0] || "메뉴 없음"}</b>
            {roomy && menu.length > 1 && <p className="mb-rest-list">{menu.slice(1).join(" , ")}</p>}
            {(info.tags.length > 0 || m.url) && (
              <p className="mb-tags">
                {info.tags.filter((t) => t !== "인스타").map((t) => <em key={t} className="mt-tag">{t === "천원" ? "천원의 아침밥" : t}</em>)}
                {m.url && <a className="meal-src" href={m.url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>인스타 원문 ↗</a>}
              </p>
            )}
            {m.note && !/천원|인스타/.test(m.note) && <small className="mb-note">{m.note}</small>}
          </div>
        </>
      ) : (
        <p className="empty mb-empty">
          {r.stale ? <>{r.stale_note} <a href={r.fallback} target="_blank" rel="noopener">업체 게시판</a></>
            : r.link_only ? <>{r.link_note} <a href={r.source} target="_blank" rel="noopener">업체 사이트</a></>
            : `${mdw(iso)}은 식단이 없어요.`}
        </p>
      )}
    </div>
  );
}

// 학식 화면: 날짜 넘기기 + 판
export function MealPage() {
  const { D, L } = useApp();
  const { fav } = useFavRest();
  const [day, setDay] = useState(L.T);
  const r = fav && D.meals.restaurants[fav];
  const days = r ? Object.keys(r.days).sort() : [];
  const prev = days.filter((d) => d < day).pop(), next = days.find((d) => d > day);
  const [y, m] = day.split("-");
  return (
    <section className="card meal-page">
      <div className="mp-date">
        <span className="mp-ym mono">{y}.{m}</span>
        <button className="mp-nav" aria-label="이전 날" disabled={!prev} onClick={() => prev && setDay(prev)}>‹</button>
        <b className="mp-d">{+day.slice(8)}<small>({WD[new Date(day + "T12:00:00Z").getUTCDay()]})</small></b>
        <button className="mp-nav" aria-label="다음 날" disabled={!next} onClick={() => next && setDay(next)}>›</button>
        {day !== L.T && <button className="btn link" onClick={() => setDay(L.T)}>오늘</button>}
        {r && <a className="mp-src" href={r.source} target="_blank" rel="noopener">원문</a>}
      </div>
      <MealBoard day={day} />
    </section>
  );
}
