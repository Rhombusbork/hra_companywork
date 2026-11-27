// 볼 것 고르기 카드 (맥킨지 뉴스레터 고르기 화면처럼):
// 제목 · (얼마나 자주 올라오는지) · 한 줄 설명 · 오른쪽 위 ✓/+ · "미리보기 →" 로 최근 글 세 개.
// 처음 설정과 설정 화면에서 같이 쓴다.
import { useState } from "react";
import { useApp } from "./ctx.js";
import { inCatAny } from "../lib/logic.js";
import { diffDays, cleanTitle, md } from "../lib/util.js";
import { catalog } from "../lib/layout.js";

function freq(n) {
  // 최근 2주 글 수로 대략의 주기
  if (n === 0) return "요즘 글 없음";
  if (n >= 14) return `하루 ${Math.round(n / 14)}건 꼴`;
  if (n >= 4) return `주 ${Math.round(n / 2)}건 꼴`;
  return `2주에 ${n}건`;
}

export function PickCard({ on, onToggle, title, sub, desc, badge, preview, id }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"pick-card" + (on ? " on" : "")}>
      <div className="pc-head">
        <div className="pc-t">
          <h3>{title}{badge && <span className="rec">{badge}</span>}</h3>
          {sub && <span className="pc-sub">({sub})</span>}
        </div>
        <button className="pc-toggle" role="switch" aria-checked={on} id={id} aria-label={`${title} ${on ? "빼기" : "넣기"}`} onClick={onToggle}>
          {on ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
        </button>
      </div>
      {desc && <p className="pc-desc">{desc}</p>}
      {preview && preview.length > 0 && (
        <>
          <button className="pc-prev" aria-expanded={open} onClick={() => setOpen((v) => !v)}>미리보기 <span aria-hidden="true">{open ? "↑" : "→"}</span></button>
          {open && <ul className="pc-list">{preview.map((p, i) => <li key={i}><span className="mono">{p.d}</span>{p.t}</li>)}</ul>}
        </>
      )}
    </div>
  );
}

export function CategoryCards({ layer, title }) {
  const { D, draft, setDraft } = useApp();
  const T = D.meta.generated_at;
  const rec = {};
  for (const id of draft.depts) {
    const d = D.deps.find((x) => x.id === id); const r = d && D.cfg.recommend[d.college];
    if (r) r.add.forEach((c) => { (rec[c] = rec[c] || []).includes(d.college) || rec[c].push(d.college); });
  }
  const cs = D.cfg.categories.filter((c) => c.layer === layer && (!c.dorm_only || draft.dorm));
  if (!cs.length) return null;
  const toggle = (id) => setDraft((dr) => { const s = new Set(dr.cats); s.has(id) ? s.delete(id) : s.add(id); return { ...dr, cats: [...s], touched: true }; });
  return (
    <section className="pick-sec">
      <h3 className="pick-h">{title}</h3>
      <div className="pick-grid">
        {cs.map((c) => {
          const items = D.items.filter((it) => inCatAny(c, it)).sort((a, b) => (a.date < b.date ? 1 : -1));
          const recent = items.filter((it) => diffDays(T, it.date) <= 14).length;
          return (
            <PickCard key={c.id} id={"cat-" + c.id} on={draft.cats.includes(c.id)} onToggle={() => toggle(c.id)}
              title={c.label} sub={freq(recent)} desc={c.desc} badge={rec[c.id] ? rec[c.id].join("·") + " 추천" : null}
              preview={items.slice(0, 3).map((it) => ({ d: md(it.date), t: cleanTitle(it.title) }))} />
          );
        })}
      </div>
    </section>
  );
}

export function RestaurantCards() {
  const { D, draft, setDraft } = useApp();
  const T = D.meta.generated_at.slice(0, 10);
  const toggle = (id) => setDraft((dr) => { const s = new Set(dr.rest); s.has(id) ? s.delete(id) : s.add(id); return { ...dr, rest: [...s], touched: true }; });
  return (
    <section className="pick-sec">
      <h3 className="pick-h">학식 식당</h3>
      <div className="pick-grid">
        {D.cfg.restaurants.map((r) => {
          const m = D.meals.restaurants[r.id];
          const today = m && m.days && m.days[T];
          const desc = today && today.length ? `오늘 ${today.map((x) => x.menu[0]).slice(0, 2).join(" · ")}` : r.id === "one" ? "천원의 아침밥 + 점심·저녁(업체 인스타 글)" : "오늘 식단 없음";
          return <PickCard key={r.id} id={"rest-" + r.id} on={draft.rest.includes(r.id)} onToggle={() => toggle(r.id)} title={r.label} sub={r.campus + "캠퍼스"} desc={desc} />;
        })}
      </div>
    </section>
  );
}

// 홈에 둘 칸 고르기 (끄면 숨겨 두고, 홈의 '칸 추가'로 다시 꺼낼 수 있다)
export function TileCards() {
  const { D, L, draft, setDraft } = useApp();
  const ws = catalog(D, draft, L).filter((w) => !w.cat);
  const hidden = (draft.home && draft.home.hidden) || [];
  const toggle = (id) => setDraft((dr) => {
    const h = new Set((dr.home && dr.home.hidden) || []); h.has(id) ? h.delete(id) : h.add(id);
    return { ...dr, home: { ...(dr.home || {}), hidden: [...h] } };
  });
  return (
    <section className="pick-sec">
      <h3 className="pick-h">홈에 둘 칸</h3>
      <div className="pick-grid">
        {ws.map((w) => <PickCard key={w.id} id={"tile-" + w.id} on={!hidden.includes(w.id)} onToggle={() => toggle(w.id)} title={w.title} sub={w.size} desc={w.desc} />)}
      </div>
      <p className="hint">분류 칸(학사·장학 …)은 위에서 고른 대로 들어가요. 자리·크기·색은 홈의 ‘홈 편집’에서 바꿔요.</p>
    </section>
  );
}
