import { migrate } from "./layout.js";
// 사용자 설정. 서버·로그인이 없어서 이 브라우저(localStorage)에만 둔다.
// 옛 판(v1 app.js)과 같은 키를 써서, 이미 쓰던 사람의 학과·북마크가 그대로 이어진다.

const KEY = "jnu-moa-prefs-v1";
const SEEN_KEY = "jnu-moa-lastvisit";

export function loadPrefs() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
export function savePrefs(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* 저장이 막혀도 화면은 돈다 */ } }
export function clearPrefs() { try { localStorage.removeItem(KEY); } catch (e) {} }
export function lastVisit() { try { return localStorage.getItem(SEEN_KEY); } catch (e) { return null; } }
export function markVisit(at) { try { localStorage.setItem(SEEN_KEY, at); } catch (e) {} }

export function blankPrefs() {
  return {
    v: 1, depts: [], level: "학부", campus: "아라", dorm: false, teach: false, cats: [], rest: [],
    marks: { newOn: true, dueOn: true, off: [] }, kwIn: [], kwOut: [], hidden: [], bm: {}, gradInDept: true, chips: {},
    // 홈 화면 꾸미기: 칸 배치(화면 폭별), 숨긴 칸, 칸 색·모양
    home: { layouts: null, hidden: ["count"], look: {} },  // 이번 주 마감 수는 오늘·달력 칸에도 있어서 처음엔 숨김
    touched: false, done: false,
  };
}

// 저장돼 있던 값을 지금 모양에 맞춘다 (빠진 칸 채우기, 옛 분류 이름 바꾸기)
export function upgrade(p) {
  const b = blankPrefs();
  const out = { ...b, ...p, bm: p.bm || {}, chips: p.chips || {}, gradInDept: p.gradInDept !== false,
    marks: { ...b.marks, ...(p.marks || {}) }, home: { ...b.home, ...(p.home || {}) } };
  if (out.cats.some((c) => c === "jedaero" || c === "event")) out.cats = [...new Set(out.cats.filter((c) => c !== "jedaero" && c !== "event").concat("program"))];
  out.home = migrate(out.home);
  return out;
}
