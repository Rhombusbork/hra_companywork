// 상세 창(글 하나)과 북마크 서랍
import { useEffect, useRef, useState } from "react";
import { useApp } from "./ctx.js";
import { diffDays, md, mdw, addDays } from "../lib/util.js";

function useFocusClose() {
  const ref = useRef(null);
  useEffect(() => { const x = ref.current && ref.current.querySelector(".x"); if (x) x.focus(); }, []);
  return ref;
}

export function DetailSheet({ id }) {
  const { L, P, toggleBm, closeSheet, update, hideSource } = useApp();
  const ref = useFocusClose();
  const [shareMsg, setShareMsg] = useState("");
  const it = L.findItem(id);
  if (!it) return null;
  const bm = P.bm[it.id];
  const srcLabel = { field: "게시판의 접수 마감 칸", title: "제목에 적힌 날짜", ai: "AI 추정 · 첨부 문서에서 읽음, 원문에서 꼭 확인" }[it.deadline_src] || "";
  const hasAtt = it.attachments && it.attachments.length > 0;
  let due = hasAtt ? <>첨부에서 확인<small>제목·게시판 칸에 없어요. 마감일은 대개 첨부 공고문에 있어요</small></> : "알 수 없음 (제목·칸에 없음)";
  if (it.deadline) {
    const d = diffDays(it.deadline, L.TODAY);
    due = <>{mdw(it.deadline)} · {d < 0 ? "마감됨" : d === 0 ? "오늘 마감" : "D-" + d}<small>{srcLabel}</small></>;
  }
  const src = it.source === "dept" ? (it._who || "학과") + " 게시판" : it.source_name + (it.dept ? " · " + it.dept : "");
  return (
    <>
      <div className="scrim" data-close onClick={closeSheet} />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-title" ref={ref}>
        <div className="sheet-head"><span className="sub">{src}</span><button className="x" data-close aria-label="닫기" onClick={closeSheet}>×</button></div>
        <h2 id="sh-title">{it.title}</h2>
        <dl className="facts">
          <div><dt>게시일</dt><dd>{mdw(it.date)}</dd></div>
          <div><dt>마감</dt><dd>{due}</dd></div>
          {it.also_posted && it.also_posted.length > 0 && <div><dt>함께 게시</dt><dd>{it.also_posted.join(", ")}</dd></div>}
          <div><dt>첨부</dt><dd>{it.attachments && it.attachments.length ? <><ul className="att">{it.attachments.map((a, i) => <li key={i}>{a.name}</li>)}</ul><small>파일은 원문 게시판에서 받아요</small></> : "없음"}</dd></div>
        </dl>
        <div className="ai-box"><b>AI 요약</b> · 다음 단계 기능이에요. 첨부(PDF·이미지)를 읽어 신청 기간, 대상, 제출 방법을 세 줄로 보여 줄 자리예요. 결과·명단·합격 글은 읽지 않아요.</div>
        {bm && !it.deadline && (
          <label className="bm-date">달력에 넣을 날짜 <input type="date" id={"shd-" + it.id} value={bm.date || ""} onChange={(e) => update((p) => { if (p.bm[it.id]) p.bm[it.id].date = e.target.value || null; })} /></label>
        )}
        <div className="actions">
          <button className={"btn" + (bm ? " on" : "")} data-bm={it.id} aria-pressed={!!bm} onClick={() => toggleBm(it.id)}>{bm ? "★ 북마크함" : "☆ 북마크"}</button>
          <button className="btn" data-act="share" onClick={() => shareLink(it, setShareMsg)}>공유</button>
          <a className="btn primary" href={it.url} target="_blank" rel="noopener">원문 열기 ↗</a>
        </div>
        {shareMsg && <p className="hint share-msg" role="status">{shareMsg}</p>}
        {it.source !== "dept" && <button className="btn link" data-hide={it.source} onClick={() => hideSource(it.source)}>{it.source_name} 글 숨기기</button>}
      </section>
    </>
  );
}

// 공유: 학교 원문 링크를 보낸다 (11/28 사용자 결정). 휴대폰은 공유 창, 아니면 복사.
function shareLink(it, setMsg) {
  const text = `${it.title}\n${it.url}`;
  if (navigator.share) {
    navigator.share({ title: it.title, url: it.url }).then(() => setMsg(""), (e) => { if (e && e.name !== "AbortError") copy(); });
    return;
  }
  copy();
  function copy() {
    try {
      navigator.clipboard.writeText(text).then(() => setMsg("제목과 원문 링크를 복사했어요. 단톡방에 붙여 넣으세요."), () => setMsg("복사가 막혔어요. 원문 열기에서 주소를 복사해 주세요."));
    } catch (e) { setMsg("복사가 막혔어요. 원문 열기에서 주소를 복사해 주세요."); }
  }
}

function icsFile(D, P) {
  const byId = new Map(D.items.map((it) => [it.id, it]));
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//jnu-moa//KO", "CALSCALE:GREGORIAN"];
  const escI = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, " ");
  for (const [id, b] of Object.entries(P.bm)) {
    const it = byId.get(id);
    const date = (it && it.deadline) || b.date; if (!date) continue;
    const d0 = date.replace(/-/g, ""), d1 = addDays(date, 1).replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:${id}@jnu-moa`, `DTSTAMP:${D.meta.generated_at.replace(/[-:]/g, "").slice(0, 15)}`,
      `DTSTART;VALUE=DATE:${d0}`, `DTEND;VALUE=DATE:${d1}`, `SUMMARY:${escI(((it && it.title) || b.title) + " 마감")}`,
      `URL:${(it && it.url) || b.url}`, `DESCRIPTION:${escI("원문에서 마감일을 확인하세요")}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-P1D", `DESCRIPTION:${escI("내일 마감")}`, "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// 구독 주소 (북마크 창에서만 보여 준다. 예전엔 바닥글에 따로 있었다)
export function subLinks(D, L) {
  const base = new URL("data/feeds/", location.href).href;
  const got = new Set(D.meta.dept_boards || []);
  const mine = L.myBoards().find((b) => b.board && got.has(b.board));
  const rss = [[base + "all.xml", "전체"], [base + "scholar.xml", "장학"]];
  if (mine) rss.push([base + "dept-" + mine.board.replace(/^https?:\/\/([^./]+).*/, "$1") + ".xml", mine.label]);
  return { cal: base.replace(/^https?:/, "webcal:") + "deadlines.ics", rss };
}

export function BmDrawer() {
  const { D, P, L, closeSheet, toggleBm, openItem } = useApp();
  const subs = subLinks(D, L);
  const ref = useFocusClose();
  const [msg, setMsg] = useState("");
  const byId = new Map(D.items.map((it) => [it.id, it]));
  const rows = Object.entries(P.bm).map(([id, b]) => {
    const it = byId.get(id);
    return { id, date: (it && it.deadline) || b.date || null, title: (it && it.title) || b.title, ai: it && it.deadline && it.deadline_src === "ai" };
  }).sort((a, b) => (a.date && b.date ? (a.date < b.date ? -1 : 1) : a.date ? -1 : b.date ? 1 : 0));
  const withDate = rows.filter((r) => r.date), noDate = rows.filter((r) => !r.date);
  const li = (r) => {
    const d = r.date ? diffDays(r.date, L.TODAY) : null;
    return (
      <li key={r.id}>
        {r.date && <span className="bm-when">{md(r.date)}{d >= 0 && d <= 7 && <span className="badge due">{d === 0 ? "오늘" : "D-" + d}</span>}{r.ai && <span className="badge ai">AI 추정</span>}</span>}
        <a href="#" data-open={r.id} onClick={(e) => { e.preventDefault(); openItem(r.id, true); }}>{r.title}</a>
        <button className="x small" data-bm={r.id} aria-label="북마크 빼기" onClick={() => toggleBm(r.id)}>×</button>
      </li>
    );
  };
  const ics = () => {
    try {
      const url = URL.createObjectURL(new Blob([icsFile(D, P)], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = "jnu-bookmarks.ics";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMsg("파일을 만들었어요. 내려받기가 안 되면 GitHub Pages 주소에서 다시 눌러 주세요.");
    } catch (err) { setMsg("파일을 만들지 못했어요."); }
  };
  return (
    <>
      <div className="scrim" data-close onClick={closeSheet} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title" ref={ref}>
        <div className="sheet-head"><h2 id="dr-title">북마크 {rows.length}</h2><button className="x" data-close aria-label="닫기" onClick={closeSheet}>×</button></div>
        {rows.length ? (
          <>
            {withDate.length > 0 && <ul className="bm-list">{withDate.map(li)}</ul>}
            {noDate.length > 0 && <><h3 className="bm-sub">날짜 없는 북마크 {noDate.length}</h3><p className="hint">제목을 눌러 달력에 넣을 날짜를 고를 수 있어요.</p><ul className="bm-list">{noDate.map(li)}</ul></>}
          </>
        ) : <p className="empty">글의 ☆ 를 누르면 여기에 모여요.</p>}
        <section className="drawer-actions subs" id="subs" aria-labelledby="subs-title">
          <h3 className="bm-sub" id="subs-title">캘린더·피드로 받기</h3>
          <ul className="sub-list">
            <li><button className="btn" data-act="ics" disabled={!withDate.length} onClick={ics}>내 북마크 → 휴대폰 캘린더 (.ics)</button>
              <small>{msg || `날짜가 있는 북마크 ${withDate.length}개를 파일로 한 번 받아요. 하루 전 알림이 와요.`}</small></li>
            <li><a className="btn" href={subs.cal}>장학·마감·학사일정 → 캘린더 구독</a>
              <small>구독하면 하루 4번 갱신될 때마다 캘린더가 알아서 따라와요.</small></li>
            <li><span className="sub-rss">RSS: {subs.rss.map(([href, label], i) => <span key={href}>{i > 0 && " · "}<a href={href} target="_blank" rel="noopener">{label}</a></span>)}</span>
              <small>RSS 앱으로 새 글을 받아 봐요.</small></li>
          </ul>
        </section>
        <nav className="drawer-nav"><a href="#schedule">일정 탭에서 달력으로 보기</a><a href="#setup">설정</a></nav>
      </aside>
    </>
  );
}
