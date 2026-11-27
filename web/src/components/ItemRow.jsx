import { useApp } from "./ctx.js";
import { diffDays, md, cleanTitle } from "../lib/util.js";
import { Star, Clip } from "./icons.jsx";

// 글 한 줄: [언제 칸] 제목 2줄 / 출처. 마감이 있으면 D-day, 없으면 게시일.
export function ItemRow({ it, catId }) {
  const { D, P, L, openItem, toggleBm } = useApp();
  const marksOff = P.marks.off.includes(catId);
  const dueOn = it.deadline && P.marks.dueOn && !marksOff;
  const d = it.deadline ? diffDays(it.deadline, L.TODAY) : null;
  let when;
  if (dueOn && d < 0) when = <span className="when closed"><b>마감</b><small>{md(it.deadline)}</small></span>;
  else if (dueOn && d <= 7) when = <span className="when hot"><b>{d === 0 ? "오늘" : "D-" + d}</b><small>마감</small></span>;
  else if (dueOn) when = <span className="when due"><b>{md(it.deadline)}</b><small>마감</small></span>;
  else { const [, m, dd] = it.date.slice(0, 10).split("-"); when = <span className="when"><b>{+dd}</b><small>{+m}월</small></span>; }
  const fresh = P.marks.newOn && !marksOff && L.isNew(it);
  const multi = it._tags && P.depts.length > 1 && !["교직", "졸업요건"].includes(it._who);
  const tag = it._tags && D.cfg.dept_tags.find((t) => t.id === it._tags[0]);
  const src = it.source === "dept" ? it._who || "학과 게시판" : it.dept || it.source_name;
  const bm = !!P.bm[it.id];
  return (
    <li className="item">
      {when}
      <div className="item-body">
        <div className="t-row">
          <a className={"t" + (fresh ? " fresh" : "")} href={it.url} data-open={it.id} onClick={(e) => { e.preventDefault(); openItem(it.id); }}>
            {fresh && <i className="new-dot" aria-label="새 글" />}{cleanTitle(it.title)}
          </a>
          <button className={"star" + (bm ? " on" : "")} data-bm={it.id} aria-pressed={bm} aria-label={bm ? "북마크 빼기" : "북마크"} title={bm ? "북마크 빼기" : "북마크해서 달력에 넣기"} onClick={() => toggleBm(it.id)}>
            <Star on={bm} />
          </button>
        </div>
        <div className="meta">
          {it.deadline && it.deadline_src === "ai" && dueOn && <span className="badge ai" title="첨부 문서를 AI 가 읽어 추정한 마감일이에요. 원문에서 꼭 확인하세요">AI 추정</span>}
          {multi && <span className="badge tag">{it._who}</span>}
          {tag && <span className="badge tag">{tag.label}</span>}
          <span className="src">{src}</span>
          {it.attachments && it.attachments.length > 0 && <span className="att-n" title={it.attachments.map((a) => a.name).join(", ")}><Clip />{it.attachments.length}</span>}
        </div>
      </div>
    </li>
  );
}

export function AcadRow({ e }) {
  const { D } = useApp();
  return (
    <li className="item item-acad">
      <div className="item-body">
        <div className="t-row"><a className="t" href={D.academic.source} target="_blank" rel="noopener">{e.title}</a></div>
        <div className="meta"><span className="badge k-acad">학사일정</span><span>{md(e.start)}{e.end !== e.start ? "~" + md(e.end) : ""}</span></div>
      </div>
    </li>
  );
}
