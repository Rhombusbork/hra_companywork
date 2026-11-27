// 홈: 사용자가 칸을 옮기고·키우고·숨기고·색을 바꾸는 화면 (react-grid-layout)
// - "홈 편집" 을 누르거나 칸을 길게 누르면 편집 모드. 칸을 끌어 옮기고, 오른쪽 아래 모서리를 끌어 크기를 바꾼다.
// - 휴대폰에서 모서리 끌기가 번거로우면 칸의 "⋯" 에서 작게·넓게·크게·길게를 고른다.
// - 배치는 이 브라우저에만 저장된다 (설정과 같은 곳). "기본으로" 로 처음 배치로 돌린다.
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { useApp } from "./ctx.js";
import { catalog, mergedLayouts, BREAKPOINTS, COLS, ROW, GAP, px, SIZES, TONES, SHAPES } from "../lib/layout.js";
import { TileBody } from "./Tiles.jsx";
import { Header, Catbar, StaleNote, Footer, SampleNote } from "./Chrome.jsx";
import { Grid as GridIcon, Dots, Minus, Plus } from "./icons.jsx";

const RGL = WidthProvider(Responsive);
const strip = (ls) => Object.fromEntries(Object.entries(ls).map(([bp, l]) => [bp, l.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))]));

// 칸마다 기본 색: 마감은 파랑, 이번 주 수는 연하늘, 나머지는 흰색
const AUTO_TONE = { urgent: "blue", count: "sky" };

export function Home() {
  const { D, P, L, update } = useApp();
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(null);      // 옵션을 연 칸 id
  const [adding, setAdding] = useState(false); // 숨긴 칸 꺼내기 창
  const [bp, setBp] = useState("sm");
  const home = P.home || { layouts: null, hidden: [], look: {} };

  const widgets = useMemo(() => catalog(D, P, L), [D, P, L]);
  const layouts = useMemo(() => mergedLayouts(widgets, home.layouts, home.hidden), [widgets, home.layouts, home.hidden]);
  const shown = widgets.filter((w) => !home.hidden.includes(w.id));
  const hiddenW = widgets.filter((w) => home.hidden.includes(w.id));
  // 학과 칸에 이미 나온 글은 분류 칸에서 빼서 같은 글이 두 번 안 보이게
  const used = useMemo(() => new Set(home.hidden.includes("dept") ? [] : L.deptItems().map((it) => it.id)), [L, home.hidden]);

  const saveLayouts = (all) => update((p) => { p.home = { ...p.home, layouts: strip(all) }; });
  // 사용자가 끌기·크기 바꾸기를 마쳤을 때만 저장한다 (화면이 스스로 다시 맞출 때는 저장하지 않음 → '기본으로'가 유지됨)
  const onStop = (layout) => saveLayouts({ ...layouts, [bp]: layout });

  const setSize = (id, s) => {
    const all = { ...layouts };
    all[bp] = all[bp].map((l) => (l.i === id ? { ...l, w: Math.min(s.w, COLS[bp]), h: s.h } : l));
    saveLayouts(all); setMenu(null);
  };
  const hide = (id) => { update((p) => { p.home = { ...p.home, hidden: [...new Set([...(p.home.hidden || []), id])] }; }); setMenu(null); };
  const unhide = (id) => update((p) => { p.home = { ...p.home, hidden: (p.home.hidden || []).filter((x) => x !== id) }; });
  const setLook = (id, k, v) => update((p) => { const look = { ...(p.home.look || {}) }; look[id] = { ...(look[id] || {}), [k]: v }; p.home = { ...p.home, look }; });
  const reset = () => { update((p) => { p.home = { layouts: null, hidden: ["count"], look: {} }; }); setMenu(null); };

  // 칸을 길게 누르면 편집 모드 (아이폰처럼)
  const press = useRef(null);
  const swallowClick = useRef(false);
  const onDown = (e) => {
    if (editing || e.button > 0) return;
    const sx = e.clientX, sy = e.clientY;
    press.current = { sx, sy, t: setTimeout(() => { press.current = null; swallowClick.current = true; setEditing(true); try { navigator.vibrate && navigator.vibrate(12); } catch (err) {} }, 550) };
  };
  const cancelPress = (e) => {
    if (!press.current) return;
    if (e && e.type === "pointermove" && Math.hypot(e.clientX - press.current.sx, e.clientY - press.current.sy) < 8) return;
    clearTimeout(press.current.t); press.current = null;
  };
  const onClickCapture = (e) => { if (swallowClick.current) { e.preventDefault(); e.stopPropagation(); swallowClick.current = false; } };

  useEffect(() => {
    if (!editing) { setMenu(null); setAdding(false); }
    const k = (e) => { if (e.key === "Escape" && editing) { if (menu) setMenu(null); else setEditing(false); } };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [editing, menu]);

  const cur = layouts[bp] || [];
  const lookOf = (id) => ({ tone: "auto", shape: "round", ...(home.look[id] || {}) });

  return (
    <>
      <Header />
      <StaleNote />
      <Catbar current="home" />
      {!P.depts.length && <div className="dept-banner"><span>내 학과를 넣으면 학과 공지가 맨 위에 떠요</span><a className="btn primary" href="#dept">학과 넣기</a></div>}

      <div className={"edit-bar" + (editing ? " on" : "")}>
        {editing ? (
          <>
            <span className="edit-msg">칸을 끌어 옮기고, 오른쪽 아래 모서리를 끌어 크기를 바꿔요</span>
            <span className="edit-acts">
              <button className="btn" onClick={() => setAdding((v) => !v)} aria-expanded={adding}><Plus /> 칸 추가{hiddenW.length ? ` ${hiddenW.length}` : ""}</button>
              <button className="btn link" onClick={reset}>기본으로</button>
              <button className="btn primary" onClick={() => setEditing(false)}>완료</button>
            </span>
          </>
        ) : (
          <button className="edit-open" onClick={() => setEditing(true)}><GridIcon /> 홈 편집</button>
        )}
      </div>
      {editing && adding && (
        <div className="add-panel" role="region" aria-label="숨긴 칸">
          {hiddenW.length ? hiddenW.map((w) => <button key={w.id} className="chip" onClick={() => unhide(w.id)}><Plus /> {w.title}</button>)
            : <p className="hint">숨긴 칸이 없어요. 칸 왼쪽 위의 − 를 누르면 여기로 와요.</p>}
        </div>
      )}

      <div className={"home-grid" + (editing ? " editing" : "")} onClickCapture={onClickCapture}>
        <RGL
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW}
          margin={[GAP, GAP]}
          containerPadding={[0, 0]}
          compactType="vertical"
          isDraggable={editing}
          isResizable={editing}
          resizeHandles={["se"]}
          draggableCancel=".tile-ctl, .tile-menu"
          onDragStop={onStop}
          onResizeStop={onStop}
          onBreakpointChange={(b) => setBp(b)}
          useCSSTransforms
        >
          {shown.map((w) => {
            const l = cur.find((x) => x.i === w.id) || { w: 2, h: 3 };
            const lk = lookOf(w.id);
            const tone = lk.tone === "auto" ? AUTO_TONE[w.id] || "white" : lk.tone;
            const list = w.id === "dept" || w.id === "kw" || !!w.cat;
            return (
              <div key={w.id} className="g-item" onPointerDown={onDown} onPointerMove={cancelPress} onPointerUp={cancelPress} onPointerCancel={cancelPress}>
                <section className={`b-tile tile-${w.cat ? "cat" : w.id} tone-${tone} shape-${lk.shape}${list ? " is-list" : ""}${w.id === "dept" ? " is-main" : ""} w${l.w}`} aria-label={w.title}>
                  <TileBody w={w} hPx={px(l.h)} used={used} />
                </section>
                {editing && <div className="edit-cover" aria-hidden="true" />}
                {editing && (
                  <>
                    <button className="tile-ctl tile-hide" aria-label={`${w.title} 칸 숨기기`} onClick={() => hide(w.id)}><Minus /></button>
                    <button className="tile-ctl tile-more" aria-label={`${w.title} 칸 크기·색`} aria-expanded={menu === w.id} onClick={() => setMenu(menu === w.id ? null : w.id)}><Dots /></button>
                  </>
                )}
                {editing && menu === w.id && (
                  <div className="tile-menu" role="dialog" aria-label={`${w.title} 꾸미기`}>
                    <p className="tm-t">{w.title}<small>{w.size}</small></p>
                    {w.hint && <p className="tm-hint">{w.hint}</p>}
                    <div className="tm-row"><span>크기</span><div className="tm-opts">
                      {SIZES.filter((s) => !s.lgOnly || bp === "lg").filter((s) => s.w >= w.min.w && s.h >= w.min.h).map((s) => (
                        <button key={s.id} className={l.w === Math.min(s.w, COLS[bp]) && l.h === s.h ? "on" : ""} onClick={() => setSize(w.id, s)}>{s.label}</button>
                      ))}
                    </div></div>
                    <div className="tm-row"><span>색</span><div className="tm-opts">
                      {TONES.map((t) => <button key={t.id} className={lk.tone === t.id ? "on" : ""} onClick={() => setLook(w.id, "tone", t.id)}><i className={"sw sw-" + (t.id === "auto" ? AUTO_TONE[w.id] || "white" : t.id)} />{t.label}</button>)}
                    </div></div>
                    <div className="tm-row"><span>모양</span><div className="tm-opts">
                      {SHAPES.map((s) => <button key={s.id} className={lk.shape === s.id ? "on" : ""} onClick={() => setLook(w.id, "shape", s.id)}>{s.label}</button>)}
                    </div></div>
                    <div className="tm-foot"><button className="btn link" onClick={() => hide(w.id)}>이 칸 숨기기</button><button className="btn" onClick={() => setMenu(null)}>닫기</button></div>
                  </div>
                )}
              </div>
            );
          })}
        </RGL>
        {!shown.length && <p className="empty">모든 칸을 숨겼어요. 위의 ‘칸 추가’에서 다시 꺼낼 수 있어요.</p>}
      </div>
      <SampleNote />
      <Footer />
    </>
  );
}
