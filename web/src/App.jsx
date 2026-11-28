// 제주대 모아보기 (React 판). 서버·로그인 없음: data/*.json 을 받아 브라우저에서 거르고, 설정은 이 브라우저에만 둔다.
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Ctx } from "./components/ctx.js";
import { makeLogic, quickPrefs, fitDepts, urlDept, applyDefaults, reclass } from "./lib/logic.js";
import { loadPrefs, savePrefs, clearPrefs, markVisit, upgrade, blankPrefs } from "./lib/prefs.js";
import { clone } from "./lib/util.js";
import { Home } from "./components/Home.jsx";
import { Schedule, ListView, MealView, SearchView } from "./components/Views.jsx";
import { DeptPick, SetupView } from "./components/Setup.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { DetailSheet, BmDrawer } from "./components/Sheets.jsx";

const route = () => (location.hash || "").replace(/^#/, "");
const NAMES = ["config", "departments", "items", "meals", "academic"];

export default function App() {
  const [D, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [P, setP] = useState(null);
  const [draft, setDraft] = useState(null);
  const [r, setR] = useState(route());
  const [sheet, setSheet] = useState(null);         // null | {type:"item", id} | {type:"bm"}
  const [sheetReturn, setSheetReturn] = useState(null);
  const [ui, setUiState] = useState({ searchQ: "", secQ: "", secOpen: false, secNew: false, deptQuery: "", deptQuery2: "", open2: false, selDay: null, calMonth: null, obStep: 0 });
  const setUi = useCallback((patch) => setUiState((u) => ({ ...u, ...patch })), []);
  const pRef = useRef(null);
  pRef.current = P;

  // ---------- 시작: 데이터 받기 ----------
  useEffect(() => {
    Promise.all(NAMES.map((n) => fetch(`data/${n}.json`).then((res) => { if (!res.ok) throw new Error(n); return res.json(); })))
      .then(([cfg, deps, items, meals, academic]) => {
        items.items.forEach((it) => { it._rc = reclass(cfg, it); });
        const data = { cfg, deps, items: items.items, meals, academic, meta: items };
        let p = loadPrefs();
        p = p ? upgrade(p) : null;
        // 처음 온 사람은 세 단계(나 → 볼 것 → 홈 화면)를 묻는다. 다시 오면 저장된 값으로 바로 홈.
        // ?dept= 링크로 온 사람은 묻지 않고 바로 홈 (학과가 정해져 있으니까)
        const qd = urlDept(data);
        if (!p) p = qd ? quickPrefs(data) : applyDefaults(data, blankPrefs());
        if (qd) {
          p.depts = [qd].concat(p.depts.filter((x) => x !== qd)); fitDepts(data, p); p.done = true;
          try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
        }
        savePrefs(p);
        setD(data); setP(p); setDraft(clone(p));
        // 다음에 올 때 '새 글' 표시를 위해 이번 데이터 시각을 기억한다
        window.addEventListener("pagehide", () => markVisit(items.generated_at));
      })
      .catch((e) => setErr(e.message));
  }, []);

  // ---------- 주소(#) 바뀔 때 ----------
  useEffect(() => {
    const on = () => {
      const nr = route();
      setR(nr); setSheet(null); setSheetReturn(null);
      setUi({ secQ: "", secOpen: false, secNew: false });
      if ((nr === "setup" || nr === "dept") && pRef.current) { setDraft(clone(pRef.current)); setUi({ open2: false, deptQuery: "", deptQuery2: "" }); }
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [setUi]);

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && sheet) { setSheet(sheetReturn); setSheetReturn(null); } };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [sheet, sheetReturn]);

  useEffect(() => { document.body.classList.toggle("locked", !!sheet); }, [sheet]);
  // 일정 탭만 넓게 (달력 + 옆 목록)
  useEffect(() => { const a = document.getElementById("app"); if (a) a.className = r === "schedule" ? "wide" : ""; }, [r]);

  const L = useMemo(() => (D && P ? makeLogic(D, P) : null), [D, P]);

  // ---------- 동작 ----------
  const update = useCallback((fn) => setP((cur) => { const n = clone(cur); fn(n); savePrefs(n); return n; }), []);
  const go = (h) => { if (route() === h) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = h; };
  const actions = {
    update,
    openItem: (id, fromBm) => { setSheetReturn(fromBm ? { type: "bm" } : null); setSheet({ type: "item", id }); },
    openBm: () => { setSheetReturn(null); setSheet({ type: "bm" }); },
    closeSheet: () => { setSheet(sheetReturn); setSheetReturn(null); },
    toggleBm: (id) => update((p) => {
      if (p.bm[id]) delete p.bm[id];
      else { const it = D.items.find((x) => x.id === id); p.bm[id] = { date: null, title: it ? it.title : "", url: it ? it.url : "" }; }
    }),
    hideSource: (src) => { setSheet(null); update((p) => { p.hidden = [...new Set(p.hidden.concat(src))]; }); },
    goDay: (d) => { setUi({ selDay: d, calMonth: d.slice(0, 7) }); if (route() !== "schedule") location.hash = "schedule"; },
    saveDept: () => { const p = clone(P); p.depts = draft.depts.slice(); fitDepts(D, p); savePrefs(p); setP(p); setDraft(clone(p)); go("home"); },
    // 코드로 불러온 설정이면 홈 배치·색도 그 코드의 것을 쓴다 ("홈 칸 배치도 같이 옮겨져요")
    saveSetup: () => {
      const { _imported, ...d } = clone(draft);
      const home = _imported && d.home ? d.home : { ...P.home, hidden: (d.home && d.home.hidden) || P.home.hidden };
      const p = { ...d, done: true, home }; savePrefs(p); setP(p); go("home");
    },
    resetAll: () => { clearPrefs(); const p = applyDefaults(D, blankPrefs()); setP(p); setDraft(clone(p)); setUi({ obStep: 0 }); go("home"); },
    finishOnboarding: () => { const p = { ...clone(draft), done: true }; fitDepts(D, p); p.cats = draft.cats.slice(); savePrefs(p); setP(p); setDraft(clone(p)); go("home"); },
    skipOnboarding: () => { const p = quickPrefs(D); p.depts = draft.depts.slice(); if (p.depts.length) fitDepts(D, p); savePrefs(p); setP(p); setDraft(clone(p)); go("home"); },
  };

  if (err) return <p className="loading">데이터를 불러오지 못했어요 ({err}). 잠시 뒤 새로 고쳐 주세요.</p>;
  if (!D || !P || !L) return <p className="loading">불러오는 중…</p>;

  let view;
  if (!P.done) view = <Onboarding />;
  else if (r === "setup") view = <SetupView />;
  else if (r === "dept") view = <DeptPick />;
  else if (r === "c-meal") view = <MealView />;
  else if (r === "schedule") view = <Schedule />;
  else if (r === "search") view = <SearchView />;
  else if (r.startsWith("c-")) view = <ListView id={r.slice(2)} />;
  else view = <Home />;

  return (
    <Ctx.Provider value={{ D, P, L, draft, setDraft, ui, setUi, ...actions }}>
      {view}
      {sheet && (sheet.type === "bm" ? <BmDrawer /> : <DetailSheet id={sheet.id} />)}
    </Ctx.Provider>
  );
}
