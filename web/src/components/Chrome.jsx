// 화면 테두리: 머리(제목·북마크·검색·설정), 분류 탭, 바닥
import { useApp } from "./ctx.js";
import { md } from "../lib/util.js";
import { Star, Search, Gear } from "./icons.jsx";

const FEEDBACK_URL = ""; // 의견 받을 구글 폼 주소. 비어 있으면 "의견 보내기" 링크를 숨긴다

export function Header({ title }) {
  const { D, P, openBm } = useApp();
  const g = D.meta.generated_at;
  const n = Object.keys(P.bm || {}).length;
  return (
    <header className="top">
      <div className="brand"><h1>{title || "제주대 모아보기"}</h1><small>마지막 갱신 <span className="mono">{md(g)} {g.slice(11, 16)}</span></small></div>
      <div className="top-btns">
        <button className="icon-btn" data-act="bm-open" aria-haspopup="dialog" aria-label={`북마크 ${n}개`} onClick={openBm}>
          <Star on={false} /><span className="lbl-sm">북마크</span> <span className="num">{n}</span>
        </button>
        <a className="icon-btn sq" href="#search" aria-label="검색" title="검색"><Search /></a>
        <a className="icon-btn sq" href="#setup" aria-label="설정" title="설정"><Gear /></a>
      </div>
    </header>
  );
}

export function Catbar({ current }) {
  const { D, P } = useApp();
  const tabs = [["home", "홈"], ["schedule", "일정"], ["c-dept", "내 학과"]];
  if (P.kwIn.length) tabs.push(["c-kw", "내 키워드"]);
  D.cfg.categories.forEach((c) => { if (P.cats.includes(c.id)) tabs.push(["c-" + c.id, c.label]); });
  tabs.push(["c-meal", "학식"]);
  return (
    <nav className="catbar" aria-label="분류">
      {tabs.map(([h, l]) => <a key={h} className="chip" href={"#" + h} aria-current={h === current ? "page" : undefined}>{l}</a>)}
    </nav>
  );
}

export function StaleNote() {
  const { D } = useApp();
  const h = (Date.now() - new Date(D.meta.generated_at).getTime()) / 3600000;
  if (!(h > 36)) return null;
  const ago = h >= 48 ? Math.floor(h / 24) + "일" : Math.floor(h) + "시간";
  return <p className="stale-note">마지막 갱신이 {ago} 전이에요. 갱신이 멈췄을 수 있어요. 급한 건 원문 게시판에서 확인해 주세요.</p>;
}

export function Footer() {
  const { D, L } = useApp();
  const at = (iso) => (iso ? `${md(iso)} ${iso.slice(11, 16)}` : "아직 없음");
  const base = new URL("data/feeds/", location.href).href;
  const cal = base.replace(/^https?:/, "webcal:") + "deadlines.ics";
  const got = new Set(D.meta.dept_boards || []);
  const mine = L.myBoards().find((b) => b.board && got.has(b.board));
  const slug = mine ? "dept-" + mine.board.replace(/^https?:\/\/([^./]+).*/, "$1") : null;
  return (
    <footer className="foot">
      <span>제주대학교 공식 서비스가 아닙니다. 글 제목과 날짜만 모으고, 내용은 모두 원문 게시판 링크로 봅니다.</span>
      <span className="sub-links">
        구독: <a href={cal}>휴대폰 캘린더(마감·학사일정)</a> · <a href={base + "all.xml"} target="_blank" rel="noopener">RSS 전체</a>
        {slug && <> · <a href={base + slug + ".xml"} target="_blank" rel="noopener">RSS {mine.label}</a></>}
        {" · "}<a href={base + "scholar.xml"} target="_blank" rel="noopener">RSS 장학</a>
      </span>
      <span className="src">정보원별 갱신: {Object.values(D.meta.sources).map((s) => `${s.name} ${at(s.updated)}`).join(" · ")}</span>
      {FEEDBACK_URL && <a className="feedback" href={FEEDBACK_URL} target="_blank" rel="noopener">의견 보내기</a>}
    </footer>
  );
}

export const SampleNote = () => <p className="sample-note"><span className="pill">비공식</span>학교 게시판 제목·날짜만 모았어요. 마감은 원문에서 꼭 확인하세요.</p>;
export const Back = ({ children }) => <div className="view-head"><a className="back" href="#home">← 홈</a>{children}</div>;
