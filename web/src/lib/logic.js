// 데이터(D)와 설정(P)으로 "이 사람에게 보일 글"을 고르는 규칙. 화면과 따로 두어 어느 칸에서든 같이 쓴다.
// 옛 app.js 의 규칙을 그대로 옮겼다 (분류·학과 글 모으기·정렬·일정).
import { diffDays, has, addDays, weekday } from "./util.js";
import { blankPrefs, lastVisit } from "./prefs.js";

// 학교가 '일반'(203)으로 올린 본부 글을 제목으로 다시 나눈다. 처음 맞는 규칙 하나 (collect.py general_reclass 와 같음).
// 불러올 때 한 번 계산해 it._rc 에 둔다 (App.jsx).
export function reclass(cfg, it) {
  if (it.source !== "jnu" || it.category !== "일반") return null;
  for (const r of cfg.general_rules || []) if (has(it.title, r.keywords)) return r.to;
  return null;
}

// 분류에 드는 글인지 (설정과 상관없이)
export function inCatAny(cat, it) {
  const m = cat.match;
  if (it.source === "dept") return false;
  if (it._rc) return cat.id === it._rc;
  if (m.source && m.source.includes(it.source)) return true;
  if (m.source_category && it.source === "jnu" && m.source_category.includes(it.category)) return true;
  if (m.keywords && has(it.title, m.keywords)) return true;
  return false;
}

export function makeLogic(D, P) {
  const TODAY = D.meta.generated_at;
  const T = TODAY.slice(0, 10);
  const depById = (id) => D.deps.find((d) => d.id === id);
  const catById = (id) => D.cfg.categories.find((c) => c.id === id);

  function deptTags(title) {
    const out = [];
    for (const t of D.cfg.dept_tags) {
      if (t.id === "etc") continue;
      if (has(title, t.include) && !has(title, t.exclude)) out.push(t.id);
    }
    return out.length ? out : ["etc"];
  }

  function inCat(cat, it) {
    const m = cat.match;
    if (it.source === "dept") return false;
    if (it._rc) return cat.id === it._rc;
    if (m.source && m.source.includes(it.source)) return true;
    if (m.source_category && it.source === "jnu" && m.source_category.includes(it.category)) return true;
    if (m.keywords && has(it.title, m.keywords)) return true;
    return false;
  }

  const visible = (it) => !(P.kwOut.length && has(it.title, P.kwOut)) && !P.hidden.includes(it.source);
  const myBoards = () => P.depts.map(depById).filter(Boolean).map((d) => ({ board: d.board, label: d.name, college: d.college, id: d.id }));

  function sortItems(arr) {
    // 마감이 남은 글을 마감 가까운 순으로 먼저, 나머지는 게시일 최신 순
    const open = (x) => x.deadline && diffDays(x.deadline, TODAY) >= 0;
    return arr.slice().sort((a, b) => {
      const oa = open(a), ob = open(b);
      if (oa && ob) return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
      if (oa !== ob) return oa ? -1 : 1;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
  }

  // 분류 화면 안(전체 목록)에서만: 북마크한 글을 맨 위로. 마감이 지난 북마크는 올리지 않는다(11/28).
  // 홈 칸은 순서를 바꾸지 않는다(새 글이 밀려나지 않게).
  const pinnable = (it) => !!P.bm[it.id] && !(it.deadline && diffDays(it.deadline, TODAY) < 0);
  const pinBm = (arr) => [...arr.filter(pinnable), ...arr.filter((it) => !pinnable(it))];

  let _dept = null;
  function deptItems() {
    // 내 학과 게시판 글 + 내 학과가 다시 올린 본부 글 + (교직 이수면) 교직 글 + 졸업요건·자격 글
    if (_dept) return _dept;
    const boards = myBoards();
    const teachWords = D.cfg.dept_tags.find((t) => t.id === "teach").include;
    const gradTag = D.cfg.dept_tags.find((t) => t.id === "gradreq");
    const gradWords = gradTag.include, gradNot = gradTag.exclude || [];
    const out = [];
    for (const it of D.items) {
      if (!visible(it)) continue;
      let who = null, tags = null, note = null;
      if (it.source === "dept") {
        const b = boards.find((x) => x.board === it.dept_board);
        if (b) { who = b.label; tags = deptTags(it.title); }
      } else if (it.also_posted.length) {
        const b = boards.find((x) => it.also_posted.includes(x.college) || it.also_posted.includes(x.label));
        if (b) { who = b.label; tags = deptTags(it.title); note = "본부 글 · " + it.also_posted.join("·") + "에도 게시"; }
      }
      if (!who && P.teach && it.source !== "dept" && has(it.title, teachWords)) { who = "교직"; tags = ["teach"]; note = "본부 글"; }
      if (!who && P.gradInDept !== false && it.source !== "dept" && has(it.title, gradWords) && !has(it.title, gradNot)) { who = "졸업요건"; tags = ["gradreq"]; note = it.source_name + " 글"; }
      if (who) out.push({ ...it, _who: who, _tags: tags, _note: note });
    }
    return (_dept = sortItems(out));
  }

  const catItems = (cat, exclude) => sortItems(D.items.filter((it) => visible(it) && inCat(cat, it) && !(exclude && exclude.has(it.id))));
  const kwItems = (exclude) => (P.kwIn.length ? sortItems(D.items.filter((it) => visible(it) && has(it.title, P.kwIn) && !(exclude && exclude.has(it.id)))) : []);
  const shownCats = () => D.cfg.categories.filter((c) => P.cats.includes(c.id) && !(c.dorm_only && !P.dorm));

  let _mine = null;
  function myItems() {
    // 지금 설정으로 이 사람에게 보이는 글 전부 (중복 없이)
    if (_mine) return _mine;
    const seen = new Map();
    deptItems().forEach((it) => seen.set(it.id, it));
    kwItems().forEach((it) => seen.has(it.id) || seen.set(it.id, it));
    shownCats().forEach((c) => catItems(c).forEach((it) => seen.has(it.id) || seen.set(it.id, it)));
    return (_mine = [...seen.values()]);
  }

  const lv = lastVisit();
  const isNew = (it) => (lv ? it.first_seen > lv : diffDays(TODAY, it.first_seen) <= 1);

  const soonList = () => myItems().filter((it) => it.deadline && diffDays(it.deadline, TODAY) >= 0 && diffDays(it.deadline, TODAY) <= 7)
    .sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0));
  const srcOf = (it) => (it.source === "dept" ? it._who || "학과" : it.dept || it.source_name);

  let _ev = null;
  function events() {
    // { date, end?, kind: due|acad|bm, title, url, src, ai }
    if (_ev) return _ev;
    const out = [];
    const mine = myItems();
    const byId = new Map(D.items.map((it) => [it.id, it]));
    const mineIds = new Set(mine.map((it) => it.id));
    for (const it of mine) {
      if (it.deadline) out.push({ date: it.deadline, kind: P.bm[it.id] ? "bm" : "due", title: it.title, url: it.url, src: it.source === "dept" ? it._who || "학과" : it.source_name, ai: it.deadline_src === "ai" });
    }
    for (const [id, b] of Object.entries(P.bm)) {
      const it = byId.get(id);
      if (it && it.deadline && mineIds.has(id)) continue;
      const date = (it && it.deadline) || b.date;
      if (date) out.push({ date, kind: "bm", title: (it && it.title) || b.title, url: (it && it.url) || b.url, src: "북마크", ai: it && it.deadline_src === "ai" });
    }
    for (const e of D.academic.events) out.push({ date: e.start, end: e.end, kind: "acad", title: e.title, url: D.academic.source, src: "학사일정" });
    return (_ev = out);
  }
  const kindOrder = { due: 0, bm: 1, acad: 2 };
  const onDay = (e, iso) => (e.end ? e.date <= iso && iso <= e.end : e.date === iso);
  // 14일 넘게 이어지는 기간은 달력 점을 시작·끝 날에만 찍고, 목록에선 뒤로 보낸다
  const isLong = (e) => e.end && e.end !== e.date && diffDays(e.end, e.date) > 14;
  const eventsOn = (iso) => events().filter((e) => onDay(e, iso)).sort((a, b) => (isLong(a) - isLong(b)) || (kindOrder[a.kind] - kindOrder[b.kind]));
  const dotKinds = (evs, iso) => {
    const k = new Set(evs.filter((e) => !iso || !isLong(e) || e.date === iso || e.end === iso).map((e) => e.kind));
    return ["due", "acad", "bm"].filter((x) => k.has(x));
  };
  const weekDays = () => { const start = addDays(T, -((weekday(T) + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); };

  const acadUpcoming = () => D.academic.events.filter((e) => e.end >= T).slice().sort((a, b) => (a.start < b.start ? -1 : 1));
  const chipSel = (id) => (P.chips && P.chips[id]) || "all";
  function chipHit(ch, it, cat) {
    const m = ch.match || {};
    // 학교가 붙인 분류(수업·등록)가 있으면 그걸 따르고, 없을 때만 제목 키워드로 나눈다
    if (m.source && m.source.includes(it.source)) return true;
    const owned = cat ? cat.chips.flatMap((x) => (x.match && x.match.source_category) || []) : [];
    if (it.source === "jnu" && owned.includes(it.category)) return !!(m.source_category && m.source_category.includes(it.category));
    if (m.keywords && has(it.title, m.keywords)) return true;
    return false;
  }

  function todayMeals() {
    // [{ r, meals|null, state: "menu"|"stale"|"link"|"none" }]
    return P.rest.map((id) => D.meals.restaurants[id]).filter(Boolean).map((r) => {
      const meals = r.days[T];
      if (meals && meals.length) return { r, meals, state: "menu" };
      return { r, meals: null, state: r.stale ? "stale" : r.link_only ? "link" : "none" };
    });
  }

  const findItem = (id) => deptItems().find((x) => x.id === id) || D.items.find((x) => x.id === id);

  return {
    TODAY, T, depById, catById, deptTags, inCat, visible, myBoards, sortItems, deptItems, catItems, kwItems, shownCats,
    myItems, isNew, soonList, srcOf, events, eventsOn, dotKinds, isLong, kindOrder, weekDays, acadUpcoming, chipSel, chipHit,
    todayMeals, findItem, visitedBefore: !!lv, pinBm,
  };
}

// ---------- 설정 기본값 (학과에 맞춰 분류·식당 고르기) ----------
export function defaultsFor(D, p) {
  const depById = (id) => D.deps.find((d) => d.id === id);
  const cats = new Set(D.cfg.categories.filter((c) => c.default).map((c) => c.id));
  if (p.level === "대학원") cats.delete("haksa");
  if (p.dorm) cats.add("dorm"); else cats.delete("dorm");
  let teach = false;
  for (const id of p.depts) {
    const d = depById(id); if (!d) continue;
    const r = D.cfg.recommend[d.college]; if (!r) continue;
    r.add.forEach((c) => cats.add(c));
    if (r.teach) teach = true;
  }
  const rest = D.cfg.restaurants.filter((r) => r.campus === p.campus).map((r) => r.id);
  return { cats: [...cats], teachAuto: teach, rest };
}

export function recommendedBy(D, p) {
  const m = {};
  for (const id of p.depts) {
    const d = D.deps.find((x) => x.id === id); if (!d) continue;
    const r = D.cfg.recommend[d.college]; if (!r) continue;
    r.add.forEach((c) => { (m[c] = m[c] || []).includes(d.college) || m[c].push(d.college); });
  }
  return m;
}

export function applyDefaults(D, p) {
  const df = defaultsFor(D, p);
  if (!p.touched) { p.cats = df.cats; p.rest = df.rest; }
  if (df.teachAuto) p.teach = true;
  return p;
}

export function quickPrefs(D) {
  // 처음 온 사람: 묻지 않고 바로 홈. 생활관만 빼고 다 보여 준다
  const p = applyDefaults(D, blankPrefs());
  p.cats = D.cfg.categories.map((c) => c.id).filter((id) => id !== "dorm"); p.done = true;
  return p;
}

export function fitDepts(D, p) {
  // 고른 학과에 맞춰 학부/대학원·캠퍼스·추천 분류·식당을 맞춘다. 이미 고른 분류는 지우지 않는다
  const depById = (id) => D.deps.find((d) => d.id === id);
  const main = p.depts[0] && depById(p.depts[0]);
  if (main) { p.level = main.level; p.campus = main.campus; }
  const cats = new Set(p.cats);
  for (const id of p.depts) {
    const d = depById(id); if (!d) continue;
    const r = D.cfg.recommend[d.college]; if (!r) continue;
    r.add.forEach((c) => cats.add(c));
    if (r.teach) p.teach = true;
  }
  p.cats = [...cats];
  if (!p.touched) p.rest = D.cfg.restaurants.filter((r) => r.campus === p.campus).map((r) => r.id);
  return p;
}

export function urlDept(D) {
  // ?dept=<학과 id 또는 이름>
  let q = null;
  try { q = new URLSearchParams(location.search).get("dept"); } catch (e) {}
  if (!q || !q.trim()) return null;
  const s = q.trim();
  const pool = D.deps.filter((d) => !d.is_college_board);
  const all = D.deps;
  const hit = pool.find((d) => d.id === s) || pool.find((d) => d.name === s) || all.find((d) => d.id === s || d.name === s)
    || pool.find((d) => d.name.includes(s)) || all.find((d) => d.name.includes(s));
  return hit ? hit.id : null;
}
