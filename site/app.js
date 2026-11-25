// 제주대 모아보기 — 화면 시안
// 서버·로그인 없음. data/*.json 을 받아 브라우저에서 거른다. 설정은 localStorage 에만 둔다.
(function () {
  "use strict";

  const KEY = "jnu-moa-prefs-v1";
  const SEEN_KEY = "jnu-moa-lastvisit";
  const $app = document.getElementById("app");
  let D = null;        // { cfg, deps, items, meals, meta }
  let P = null;        // 사용자 설정
  let draft = null;    // 처음 설정·설정 화면에서 고치는 중인 값
  let step = 1;
  let deptQuery = "";
  let deptQuery2 = "";
  let deptFilter = "all";
  let confirmReset = false;
  let TODAY = null;

  // ---------- 저장 ----------
  function load() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* 저장이 막혀도 화면은 돈다 */ } }
  function clearSaved() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function lastVisit() { try { return localStorage.getItem(SEEN_KEY); } catch (e) { return null; } }
  function markVisit() { try { localStorage.setItem(SEEN_KEY, D.meta.generated_at); } catch (e) {} }

  // ---------- 도우미 ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const day = (iso) => new Date(iso.slice(0, 10) + "T00:00:00+09:00");
  const diffDays = (a, b) => Math.round((day(a) - day(b)) / 86400000);
  const md = (iso) => { const [, m, d] = iso.slice(0, 10).split("-"); return `${+m}/${+d}`; };
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const mdw = (iso) => `${md(iso)}(${WD[new Date(iso.slice(0, 10) + "T12:00:00+09:00").getUTCDay()]})`;
  const has = (title, words) => words.some((w) => title.toLowerCase().includes(w.toLowerCase()));
  const depById = (id) => D.deps.find((d) => d.id === id);
  const catById = (id) => D.cfg.categories.find((c) => c.id === id);

  function defaultsFor(p) {
    // 학과·기숙사·학부/대학원에 따라 2단계 기본값을 만든다
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

  function recommendedBy(p) {
    // 분류 id → 추천 이유를 낸 단과대 이름
    const m = {};
    for (const id of p.depts) {
      const d = depById(id); if (!d) continue;
      const r = D.cfg.recommend[d.college]; if (!r) continue;
      r.add.forEach((c) => { (m[c] = m[c] || []).includes(d.college) || m[c].push(d.college); });
    }
    return m;
  }

  function blankPrefs() {
    return { v: 1, depts: [], level: "학부", campus: "아라", dorm: false, teach: false, cats: [], rest: [],
      marks: { newOn: true, dueOn: true, off: [] }, kwIn: [], kwOut: [], hidden: [], bm: {}, gradInDept: true, chips: {}, touched: false, done: false };
  }

  function applyDefaults(p) {
    const df = defaultsFor(p);
    if (!p.touched) { p.cats = df.cats; p.rest = df.rest; }
    if (df.teachAuto) p.teach = true;
    return p;
  }

  // ---------- 글 분류 ----------
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
    if (m.source && m.source.includes(it.source)) return true;
    if (m.source_category && it.source === "jnu" && m.source_category.includes(it.category)) return true;
    if (m.keywords && has(it.title, m.keywords)) return true;
    return false;
  }

  function visible(it) {
    if (P.kwOut.length && has(it.title, P.kwOut)) return false;
    if (P.hidden.includes(it.source)) return false;
    return true;
  }

  function myBoards() {
    // 학과 id → { board, label, college }
    return P.depts.map(depById).filter(Boolean).map((d) => ({ board: d.board, label: d.name, college: d.college, id: d.id }));
  }

  function deptItems() {
    // 0층: 내 학과 게시판 글 + 내 학과가 다시 올린 본부 글 + (교직 이수면) 본부 교직 글
    const boards = myBoards();
    const teachWords = D.cfg.dept_tags.find((t) => t.id === "teach").include;
    const gradWords = D.cfg.dept_tags.find((t) => t.id === "gradreq").include;
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
      // 졸업요건·자격: 본부·진로취업 글이라도 내 졸업과 바로 이어지니 학과 카드로 모은다
      if (!who && P.gradInDept !== false && it.source !== "dept" && has(it.title, gradWords)) { who = "졸업요건"; tags = ["gradreq"]; note = it.source_name + " 글"; }
      if (who) out.push({ ...it, _who: who, _tags: tags, _note: note });
    }
    return sortItems(out);
  }

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

  function catItems(cat, exclude) {
    return sortItems(D.items.filter((it) => visible(it) && inCat(cat, it) && !(exclude && exclude.has(it.id))));
  }

  function kwItems(exclude) {
    if (!P.kwIn.length) return [];
    return sortItems(D.items.filter((it) => visible(it) && has(it.title, P.kwIn) && !(exclude && exclude.has(it.id))));
  }

  // ---------- 글 한 줄 ----------
  function isNew(it) {
    const lv = lastVisit();
    if (lv) return it.first_seen > lv;
    return diffDays(TODAY, it.first_seen) <= 1;
  }

  function itemRow(it, catId) {
    const marksOff = P.marks.off.includes(catId);
    const bits = [];
    if (it.deadline && P.marks.dueOn && !marksOff) {
      const d = diffDays(it.deadline, TODAY);
      if (d < 0) bits.push(`<span class="badge closed">마감</span>`);
      else if (d <= 7) bits.push(`<span class="badge due">${d === 0 ? "오늘 마감" : "D-" + d}</span>`);
      else bits.push(`<span class="badge due far">~${md(it.deadline)}</span>`);
    }
    if (it.deadline && it.deadline_src === "ai" && P.marks.dueOn && !marksOff) bits.push(`<span class="badge ai" title="첨부 문서를 AI 가 읽어 추정한 마감일이에요. 원문에서 꼭 확인하세요">AI 추정</span>`);
    if (P.marks.newOn && !marksOff && isNew(it)) bits.push(`<span class="badge new">새 글</span>`);
    if (it._tags) {
      const multi = P.depts.length > 1 && !["교직", "졸업요건"].includes(it._who);
      if (multi) bits.push(`<span class="badge tag">${esc(it._who)}</span>`);
      bits.push(`<span class="badge tag">${esc(D.cfg.dept_tags.find((t) => t.id === it._tags[0]).label)}</span>`);
    }
    const src = it.source === "dept" ? it._who || "학과 게시판" : it.source_name;
    const hide = it.source === "dept" ? "" : `<button class="hide-btn" data-hide="${esc(it.source)}" title="${esc(it.source_name)} 글을 숨깁니다">숨기기</button>`;
    const bm = P.bm[it.id];
    const star = `<button class="star${bm ? " on" : ""}" data-bm="${esc(it.id)}" aria-pressed="${bm ? "true" : "false"}" aria-label="${bm ? "북마크 빼기" : "북마크"}" title="${bm ? "북마크 빼기" : "북마크해서 달력에 넣기"}">${bm ? "★" : "☆"}</button>`;
    const att = it.attachments && it.attachments.length ? `<span title="${esc(it.attachments.map((a) => a.name).join(", "))}">첨부 ${it.attachments.length}</span>` : "";
    const ask = bm && !it.deadline
      ? `<label class="bm-date">달력에 넣을 날짜 <input type="date" data-bmdate="${esc(it.id)}" id="bmd-${esc(it.id)}" value="${esc(bm.date || "")}"></label>` : "";
    return `<li class="item">
      <div class="t-row"><a class="t" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>${star}</div>
      <div class="meta">${bits.join("")}<span>${esc(src)}${it.dept ? " · " + esc(it.dept) : ""}</span><span>${md(it.date)}</span>${att}${it._note ? `<span>${esc(it._note)}</span>` : ""}${hide}</div>
      ${ask}
    </li>`;
  }

  // ---------- 머리·분류 줄 ----------
  function header(title) {
    return `<header class="top">
      <div class="brand"><h1>${esc(title || "제주대 모아보기")}</h1><small>${mdw(D.meta.generated_at)} ${D.meta.generated_at.slice(11, 16)} 갱신</small></div>
      <a class="icon-btn" href="#setup">설정</a>
    </header>`;
  }

  function catbar(current) {
    const tabs = [["home", "홈"], ["schedule", "일정"], ["c-dept", "내 학과"]];
    if (P.kwIn.length) tabs.push(["c-kw", "내 키워드"]);
    D.cfg.categories.forEach((c) => { if (P.cats.includes(c.id)) tabs.push(["c-" + c.id, c.label]); });
    tabs.push(["c-meal", "학식"]);
    return `<nav class="catbar" aria-label="분류">${tabs.map(([h, l]) =>
      `<a class="chip" href="#${h}"${h === current ? ' aria-current="page"' : ""}>${esc(l)}</a>`).join("")}</nav>`;
  }

  function sampleNote() {
    return `<p class="sample-note">시안이에요. 글 제목은 11/21 수집 기록과 학과 조사에서 가져왔고, [예시] 글, 학사일정, 날짜·마감일 일부("AI 추정" 포함)는 화면 시험용으로 넣은 값이에요. 날짜 기준은 ${md(D.meta.generated_at)}입니다.</p>`;
  }

  // ---------- 일정 (마감·학사일정·북마크) ----------
  let selDay = null;   // 일정 탭에서 고른 날
  let calMonth = null; // "YYYY-MM"
  const ymd = (dt) => dt.toISOString().slice(0, 10);
  const addDays = (iso, n) => { const d = new Date(iso.slice(0, 10) + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
  const weekday = (iso) => new Date(iso.slice(0, 10) + "T12:00:00Z").getUTCDay();

  function myItems() {
    // 지금 설정으로 사용자에게 보이는 글 전부 (중복 없이)
    const seen = new Map();
    deptItems().forEach((it) => seen.set(it.id, it));
    kwItems().forEach((it) => seen.has(it.id) || seen.set(it.id, it));
    D.cfg.categories.forEach((c) => {
      if (!P.cats.includes(c.id) || (c.dorm_only && !P.dorm)) return;
      catItems(c).forEach((it) => seen.has(it.id) || seen.set(it.id, it));
    });
    return [...seen.values()];
  }

  function events() {
    // { date, end?, kind: due|acad|bm, title, url, src, it? }
    const out = [];
    const mine = myItems();
    const byId = new Map(D.items.map((it) => [it.id, it]));
    const mineIds = new Set(mine.map((it) => it.id));
    for (const it of mine) {
      if (it.deadline) out.push({ date: it.deadline, kind: P.bm[it.id] ? "bm" : "due", title: it.title, url: it.url, src: it.source === "dept" ? it._who || "학과" : it.source_name, ai: it.deadline_src === "ai" });
    }
    for (const [id, b] of Object.entries(P.bm)) {
      const it = byId.get(id);
      if (it && it.deadline && mineIds.has(id)) continue; // 위에서 이미 넣음
      const date = (it && it.deadline) || b.date;
      if (date) out.push({ date, kind: "bm", title: (it && it.title) || b.title, url: (it && it.url) || b.url, src: "북마크", ai: it && it.deadline_src === "ai" });
    }
    for (const e of D.academic.events) out.push({ date: e.start, end: e.end, kind: "acad", title: e.title, url: D.academic.source, src: "학사일정" });
    return out;
  }

  const onDay = (e, iso) => e.end ? e.date <= iso && iso <= e.end : e.date === iso;
  const kindOrder = { due: 0, bm: 1, acad: 2 };
  function eventsOn(evs, iso) { return evs.filter((e) => onDay(e, iso)).sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]); }

  function dots(evs) {
    const k = new Set(evs.map((e) => e.kind));
    return ["due", "acad", "bm"].filter((x) => k.has(x)).map((x) => x === "bm" ? `<i class="dot bm">★</i>` : `<i class="dot ${x}"></i>`).join("");
  }

  function evRow(e, showDate) {
    const lbl = { due: "마감", acad: "학사", bm: "북마크" }[e.kind];
    const when = showDate ? `<span class="ev-date">${md(e.date)}${e.end && e.end !== e.date ? "~" + md(e.end) : ""}</span>` : "";
    return `<li class="ev">${when}<span class="badge k-${e.kind}">${lbl}</span>${e.ai ? `<span class="badge ai">AI 추정</span>` : ""}
      <a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a><span class="ev-src">${esc(e.src)}</span></li>`;
  }

  function weekStrip() {
    const evs = events();
    const start = addDays(TODAY, -((weekday(TODAY) + 6) % 7)); // 월요일
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i), es = eventsOn(evs, d);
      cells.push(`<button class="wk-day${d === TODAY.slice(0, 10) ? " today" : ""}" data-day="${d}" aria-label="${mdw(d)} 일정 ${es.length}개">
        <span class="wd">${WD[weekday(d)]}</span><span class="dn">${+d.slice(8)}</span><span class="dots">${dots(es)}</span></button>`);
    }
    const today = eventsOn(evs, TODAY.slice(0, 10));
    const line = today.length ? today.slice(0, 2).map((e) => `${{ due: "마감", acad: "학사", bm: "북마크" }[e.kind]} ${esc(e.title.replace(/^\[예시\]\s*/, ""))}`).join(" · ") + (today.length > 2 ? ` 외 ${today.length - 2}` : "") : "오늘 마감·학사일정은 없어요";
    return `<section class="week">
      <div class="card-head"><span class="lbl">이번 주</span><a href="#schedule">일정 탭 →</a></div>
      <div class="wk">${cells.join("")}</div>
      <p class="wk-today"><b>오늘</b> ${line}</p>
    </section>`;
  }

  function viewSchedule() {
    const evs = events();
    const today = TODAY.slice(0, 10);
    const sel = selDay || today;
    const ym = calMonth || sel.slice(0, 7);
    const [y, m] = ym.split("-").map(Number);
    const first = `${ym}-01`;
    const lead = weekday(first);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(`<span class="cd pad"></span>`);
    for (let d = 1; d <= days; d++) {
      const iso = `${ym}-${String(d).padStart(2, "0")}`, es = eventsOn(evs, iso), wd = weekday(iso);
      cells.push(`<button class="cd${iso === today ? " today" : ""}${iso === sel ? " sel" : ""}${wd === 0 ? " sun" : wd === 6 ? " sat" : ""}" data-day="${iso}" aria-label="${mdw(iso)} 일정 ${es.length}개"${iso === sel ? ' aria-current="date"' : ""}>
        <span class="dn">${d}</span><span class="dots">${dots(es)}</span></button>`);
    }
    const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
    const selEvs = eventsOn(evs, sel);
    const mealLines = sel === today ? todayMeals() : [];
    const monthEvs = evs.filter((e) => (e.date.slice(0, 7) === ym) || (e.end && e.date.slice(0, 7) < ym && e.end.slice(0, 7) >= ym))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : kindOrder[a.kind] - kindOrder[b.kind]));
    const bms = Object.entries(P.bm);
    const bmDated = bms.filter(([id, b]) => { const it = D.items.find((x) => x.id === id); return (it && it.deadline) || b.date; }).length;

    return header() + catbar("schedule") + `<div class="sched">
      <section class="card cal">
        <div class="cal-head"><button class="nav" data-month="${prev}" aria-label="이전 달">‹</button><h2>${y}년 ${m}월</h2><button class="nav" data-month="${next}" aria-label="다음 달">›</button></div>
        <div class="cal-grid wdh">${WD.map((w, i) => `<span class="${i === 0 ? "sun" : i === 6 ? "sat" : ""}">${w}</span>`).join("")}</div>
        <div class="cal-grid">${cells.join("")}</div>
        <p class="legend"><span><i class="dot due"></i>마감</span><span><i class="dot acad"></i>학사일정</span><span><i class="dot bm">★</i>북마크</span></p>
      </section>
      <div class="side">
        <section class="card">
          <div class="card-head"><h2>${sel === today ? "오늘" : "고른 날"} · ${mdw(sel)}</h2>${sel !== today ? `<a href="#schedule" data-day="${today}">오늘로</a>` : ""}</div>
          <ul class="evs">
            <li class="ev muted-row"><span class="badge k-tt">시간표</span><span>학생정보 연동 시 여기에 그날 수업이 나와요 (개선 제안)</span></li>
            ${selEvs.map((e) => evRow(e, false)).join("")}
            ${mealLines.length ? `<li class="ev"><span class="badge k-meal">학식</span><a href="#c-meal">${mealLines.length}곳 식단 보기</a></li>` : ""}
          </ul>
          ${!selEvs.length ? `<p class="empty">이날은 마감·학사일정·북마크가 없어요.</p>` : ""}
        </section>
        <section class="card">
          <div class="card-head"><h2>${m}월 안내</h2><span class="sub">${monthEvs.length}건</span></div>
          ${monthEvs.length ? `<ul class="evs">${monthEvs.map((e) => evRow(e, true)).join("")}</ul>` : `<p class="empty">이달 일정이 없어요.</p>`}
        </section>
        <section class="card">
          <div class="card-head"><h2>북마크 ${bms.length}</h2></div>
          <p class="why">글의 ☆ 를 누르면 달력에 들어가요. 마감일을 모르는 글은 날짜를 직접 정해요.</p>
          <div class="actions" style="margin-top:4px"><button class="btn" data-act="ics"${bmDated ? "" : " disabled"}>휴대폰 캘린더에 추가 (.ics)</button></div>
          <p class="hint" id="ics-msg">날짜가 있는 북마크 ${bmDated}개를 파일로 받아요. 휴대폰 캘린더에 넣으면 하루 전 알림이 와요. 미리보기 링크에서는 내려받기가 막혀 있고, GitHub Pages 주소에서 동작해요.</p>
        </section>
      </div>
    </div>` + footer();
  }

  function icsFile() {
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

  function footer() {
    const src = Object.values(D.meta.sources).map((s) => {
      const h = Math.max(0, Math.round((new Date(D.meta.generated_at) - new Date(s.updated)) / 3600000));
      return `${esc(s.name)} ${h === 0 ? "방금" : h + "시간 전"}`;
    }).join(" · ");
    return `<footer class="foot">
      <span>제주대학교 공식 서비스가 아닙니다. 글 제목과 날짜만 모으고, 내용은 모두 원문 게시판 링크로 봅니다.</span>
      <span class="src">갱신: ${src}</span>
    </footer>`;
  }

  // ---------- 학식 ----------
  function todayMeals() {
    const out = [];
    for (const id of P.rest) {
      const r = D.meals.restaurants[id]; if (!r) continue;
      const meals = r.days[TODAY.slice(0, 10)];
      if (meals && meals.length) {
        const first = meals[0];
        out.push(`<div class="meal-line"><b>${esc(r.label)} ${esc(first.meal)}</b><span>${esc(first.menu.slice(0, 3).join(", "))}${first.menu.length > 3 ? " 외" : ""}</span></div>`);
      } else if (r.stale) {
        out.push(`<div class="meal-line"><b>${esc(r.label)}</b><span class="muted">이번 주 식단이 아직 안 올라왔어요</span></div>`);
      } else if (r.link_only) {
        out.push(`<div class="meal-line"><b>${esc(r.label)}</b><span class="muted">업체 사이트에서 보기</span></div>`);
      }
    }
    return out;
  }

  function viewMeal() {
    const blocks = P.rest.map((id) => {
      const r = D.meals.restaurants[id]; if (!r) return "";
      const meals = r.days[TODAY.slice(0, 10)];
      let body;
      if (meals && meals.length) {
        body = meals.map((m) => `<div class="meal-row"><b>${esc(m.meal)}</b><span>${esc(m.menu.join(", "))}${m.note ? ` <small>(${esc(m.note)})</small>` : ""}</span></div>`).join("");
      } else if (r.stale) {
        body = `<p class="empty">${esc(r.stale_note)} <a href="${esc(r.fallback)}" target="_blank" rel="noopener">업체 게시판 열기</a></p>`;
      } else if (r.link_only) {
        body = `<p class="empty">${esc(r.link_note)} <a href="${esc(r.source)}" target="_blank" rel="noopener">업체 사이트 열기</a></p>`;
      } else body = `<p class="empty">오늘은 식단이 없어요.</p>`;
      return `<section class="card meal-card"><div class="card-head"><h2>${esc(r.label)}</h2><a href="${esc(r.source)}" target="_blank" rel="noopener">원문</a></div>${body}</section>`;
    }).join("");
    return header() + catbar("c-meal") +
      `<div class="view-head"><a class="back" href="#home">← 홈</a><h2>오늘 학식 · ${mdw(TODAY)}</h2></div>` +
      `<div class="stack">${blocks || `<p class="empty">설정에서 식당을 골라 주세요.</p>`}</div>` + footer();
  }

  // ---------- 홈 ----------
  function deptCard(items, tagSel, limit) {
    const boards = myBoards();
    const name = boards.length ? boards.map((b) => b.label).join(" · ") : "학과를 아직 고르지 않았어요";
    const counts = {};
    items.forEach((it) => it._tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    const shown = tagSel && tagSel !== "all" ? items.filter((it) => it._tags.includes(tagSel)) : items;
    const tagChips = D.cfg.dept_tags.filter((t) => counts[t.id] || (t.id === "teach" && P.teach)).map((t) =>
      `<button class="chip${tagSel === t.id ? " on" : ""}" data-tag="${t.id}">${esc(t.label)}<span class="n">${counts[t.id] || 0}</span></button>`).join("");
    let empty = "";
    if (!boards.length) empty = `<p class="empty">설정에서 학과를 고르면 학과 게시판 글을 여기에 모아 보여 드려요. <a href="#setup">학과 고르기</a></p>`;
    else if (!shown.length) {
      const links = boards.map((b) => b.board ? `<a href="${esc(b.board)}" target="_blank" rel="noopener">${esc(b.label)} 게시판</a>` : esc(b.label)).join(" · ");
      empty = `<p class="empty">최근 글이 없어요. 아직 수집하지 않는 학과일 수 있어요. ${links}</p>`;
    }
    return `<section class="card main">
      <div class="card-head"><div><h2>내 학과</h2><div class="sub">${esc(name)}</div></div>${items.length > limit ? `<a href="#c-dept">전체 ${items.length}개 보기</a>` : ""}</div>
      ${tagChips ? `<div class="tagrow"><button class="chip${!tagSel || tagSel === "all" ? " on" : ""}" data-tag="all">전체<span class="n">${items.length}</span></button>${tagChips}</div>` : ""}
      ${empty || `<ul class="items">${shown.slice(0, limit).map((it) => itemRow(it, "dept")).join("")}</ul>`}
    </section>`;
  }

  // ---------- 카드 안 칩 (학사: 수업·등록·학적·학사일정) ----------
  const chipSel = (id) => (P.chips && P.chips[id]) || "all";
  function chipHit(ch, it, cat) {
    const m = ch.match || {};
    // 학교가 붙인 분류(수업 321·등록 322)가 있으면 그걸 따르고, 없을 때만 제목 키워드로 나눈다
    if (m.source && m.source.includes(it.source)) return true;
    const owned = cat ? cat.chips.flatMap((x) => (x.match && x.match.source_category) || []) : [];
    if (it.source === "jnu" && owned.includes(it.category)) return !!(m.source_category && m.source_category.includes(it.category));
    if (m.keywords && has(it.title, m.keywords)) return true;
    return false;
  }
  function acadUpcoming() {
    const t = TODAY.slice(0, 10);
    return D.academic.events.filter((e) => e.end >= t).slice().sort((a, b) => (a.start < b.start ? -1 : 1));
  }
  function acadRows(limit) {
    return acadUpcoming().slice(0, limit).map((e) => `<li class="item"><div class="t-row"><a class="t" href="${esc(D.academic.source)}" target="_blank" rel="noopener">${esc(e.title)}</a></div>
      <div class="meta"><span class="badge k-acad">학사일정</span><span>${md(e.start)}${e.end !== e.start ? "~" + md(e.end) : ""}</span></div></li>`).join("");
  }
  function chipBar(cat, items) {
    if (!cat || !cat.chips) return "";
    const sel = chipSel(cat.id);
    const btns = cat.chips.map((ch) => [ch, ch.academic ? acadUpcoming().length : items.filter((it) => chipHit(ch, it, cat)).length])
      .filter(([, n]) => n).map(([ch, n]) => `<button class="chip${sel === ch.id ? " on" : ""}" data-chip="${cat.id}" data-val="${ch.id}">${esc(ch.label)}<span class="n">${n}</span></button>`).join("");
    return `<div class="tagrow"><button class="chip${sel === "all" ? " on" : ""}" data-chip="${cat.id}" data-val="all">전체<span class="n">${items.length}</span></button>${btns}</div>`;
  }
  function chipBody(cat, items, limit, catId) {
    const sel = cat && cat.chips ? chipSel(cat.id) : "all";
    const ch = sel !== "all" && cat.chips.find((x) => x.id === sel);
    if (ch && ch.academic) return { n: acadUpcoming().length, html: `<ul class="items">${acadRows(limit)}</ul>` };
    const shown = ch ? items.filter((it) => chipHit(ch, it, cat)) : items;
    return { n: shown.length, html: shown.length ? `<ul class="items">${shown.slice(0, limit).map((it) => itemRow(it, catId)).join("")}</ul>` : `<p class="empty">이 유형의 글이 없어요.</p>` };
  }

  function smallCard(title, items, href, catId, why, cat) {
    if (!items.length && !(cat && cat.chips)) return "";
    const body = chipBody(cat, items, 3, catId);
    return `<section class="card">
      <div class="card-head"><h2>${esc(title)}</h2>${body.n > 3 ? `<a href="#${href}">더 보기 ${body.n}</a>` : ""}</div>
      ${why ? `<p class="why">${esc(why)}</p>` : ""}
      ${chipBar(cat, items)}
      ${body.html}
    </section>`;
  }

  function viewHome() {
    const used = new Set();
    const di = deptItems();
    di.forEach((it) => used.add(it.id));
    let html = header() + sampleNote() + catbar("home") + weekStrip();
    const ml = todayMeals();
    if (ml.length) html += `<a class="meals" href="#c-meal"><span class="lbl">오늘 학식 · ${mdw(TODAY)}</span>${ml.join("")}</a>`;
    html += `<div class="stack">` + deptCard(di, chipSel("dept"), 5);
    const kw = kwItems(used); kw.forEach((it) => used.add(it.id));
    html += smallCard("내 키워드 · " + P.kwIn.join(", "), kw, "c-kw", "kw");
    const rec = recommendedBy(P);
    let lastLayer = 0;
    for (const c of D.cfg.categories) {
      if (!P.cats.includes(c.id)) continue;
      if (c.dorm_only && !P.dorm) continue;
      const items = catItems(c, used); items.slice(0, 3).forEach((it) => used.add(it.id));
      if (!items.length && !c.chips) continue;
      if (c.layer !== lastLayer) {
        const lbl = { 1: "모두에게 필요한 것", 2: "내 학과와 가까운 것", 3: "그 밖" }[c.layer];
        html += `<p class="layer-label">${lbl}</p>`; lastLayer = c.layer;
      }
      const why = rec[c.id] ? rec[c.id].join("·") + " 추천" : "";
      html += smallCard(c.label, items, "c-" + c.id, c.id, why, c);
    }
    html += `</div>` + footer();
    return html;
  }

  // ---------- 분류 목록 ----------
  function viewList(id) {
    let title, items, catId = id, extra = "";
    if (id === "dept") {
      const di = deptItems();
      return header() + catbar("c-dept") + `<div class="view-head"><a class="back" href="#home">← 홈</a></div><div class="stack">${deptCard(di, chipSel("dept"), 999)}</div>` + footer();
    } else if (id === "kw") {
      title = "내 키워드 · " + P.kwIn.join(", "); items = kwItems();
    } else {
      const c = catById(id); if (!c) return viewHome();
      title = c.label; items = catItems(c); extra = `<p class="why">${esc(c.desc)}</p>`;
      if (c.chips) {
        const body = chipBody(c, items, 999, id);
        return header() + catbar("c-" + id) +
          `<div class="view-head"><a class="back" href="#home">← 홈</a><h2>${esc(title)}</h2></div>${extra}` +
          `<div class="list-card">${chipBar(c, items)}${body.html}</div>` + footer();
      }
    }
    return header() + catbar("c-" + id) +
      `<div class="view-head"><a class="back" href="#home">← 홈</a><h2>${esc(title)}</h2></div>${extra}` +
      `<div class="list-card">${items.length ? `<ul class="items">${items.map((it) => itemRow(it, catId)).join("")}</ul>` : `<p class="empty">글이 없어요.</p>`}</div>` + footer();
  }

  // ---------- 처음 설정 / 설정 ----------
  function deptPicker(which) {
    const q = (which === 2 ? deptQuery2 : deptQuery).trim();
    const taken = new Set(draft.depts);
    const list = D.deps.filter((d) => !d.is_college_board && (!q || (d.name + d.college).includes(q)));
    const groups = {};
    list.forEach((d) => (groups[d.college] = groups[d.college] || []).push(d));
    const body = Object.entries(groups).map(([col, ds]) =>
      `<div class="dept-group">${esc(col)}</div>` + ds.map((d) =>
        `<button class="dept-opt" data-pick="${which}" data-id="${esc(d.id)}"${taken.has(d.id) ? " disabled" : ""}>${esc(d.name)}${taken.has(d.id) ? " · 선택함" : ""}</button>`).join("")).join("");
    return `<input type="search" id="dept-q-${which}" placeholder="학과 이름으로 찾기 (예: 약학, 경영)" value="${esc(q)}" autocomplete="off">
      <div class="dept-list">${body || `<p class="empty" style="padding:10px">찾는 학과가 없어요.</p>`}</div>`;
  }

  function seg(name, options, value) {
    return `<div class="seg" role="group">${options.map((o) => `<button data-seg="${name}" data-val="${esc(o)}" class="${o === value ? "on" : ""}">${esc(o)}</button>`).join("")}</div>`;
  }

  function step1() {
    const main = draft.depts[0] ? depById(draft.depts[0]) : null;
    const extra = draft.depts.slice(1).map(depById).filter(Boolean);
    const teachAuto = defaultsFor(draft).teachAuto;
    return `<div class="field">
        <div class="lbl">주전공 <span class="req">필수</span></div>
        ${main ? `<div class="picked"><span class="chip on">${esc(main.college)} · ${esc(main.name)}<button data-unpick="${esc(main.id)}" aria-label="주전공 지우기">×</button></span></div>` : deptPicker(1)}
      </div>
      <div class="field">
        <div class="lbl">복수전공·부전공 <small>선택, 여러 개</small></div>
        ${extra.length ? `<div class="picked">${extra.map((d) => `<span class="chip on">${esc(d.name)}<button data-unpick="${esc(d.id)}" aria-label="${esc(d.name)} 지우기">×</button></span>`).join("")}</div>` : ""}
        ${main ? (deptFilter === "open2" ? deptPicker(2) : `<button class="btn" data-act="open2" style="margin-top:6px">+ 학과 추가</button>`) : `<p class="hint">주전공을 먼저 골라 주세요.</p>`}
      </div>
      <div class="field">
        <div class="row"><div class="k">학부 / 대학원<small>${main ? "학과에 맞춰 골라 뒀어요. 다르면 바꿔 주세요." : ""}</small></div>${seg("level", ["학부", "대학원"], draft.level)}</div>
        <div class="row"><div class="k">캠퍼스<small>학식 식당을 고르는 데 써요</small></div>${seg("campus", ["아라", "사라"], draft.campus)}</div>
        <div class="row"><div class="k">학생생활관(기숙사)에 사나요?<small>예라고 하면 생활관 공지를 위쪽에 보여 드려요</small></div>${seg("dorm", ["예", "아니오"], draft.dorm ? "예" : "아니오")}</div>
        <div class="row"><div class="k">교직을 이수하나요?<small>${teachAuto ? "사범·교육 계열이라 켜 뒀어요" : "교직 글을 학과 공지에 함께 모아 드려요"}</small></div>${seg("teach", ["예", "아니오"], draft.teach ? "예" : "아니오")}</div>
      </div>`;
  }

  function step2() {
    const rec = recommendedBy(draft);
    const layer = (n, title) => {
      const cs = D.cfg.categories.filter((c) => c.layer === n && (!c.dorm_only || draft.dorm));
      if (!cs.length) return "";
      return `<div class="field"><div class="lbl">${title}</div>${cs.map((c) => `
        <label class="opt"><input type="checkbox" data-cat="${c.id}" id="cat-${c.id}"${draft.cats.includes(c.id) ? " checked" : ""}>
        <span class="k">${esc(c.label)}${rec[c.id] ? `<span class="rec">${esc(rec[c.id].join("·"))} 추천</span>` : ""}<small>${esc(c.desc)}</small></span></label>`).join("")}</div>`;
    };
    const why = draft.depts.map(depById).filter(Boolean).map((d) => D.cfg.recommend[d.college]?.why).filter(Boolean);
    return `<div class="field"><div class="lbl">내 학과 공지 <span class="req">항상 보여요</span></div>
        <div class="opt locked"><input type="checkbox" checked disabled><span class="k">학과 게시판 글<small>졸업·학사, 졸업요건·자격, 근로·학과장학, 교직, 취업·채용, 실습·특강, 행사로 나눠 보여 드려요</small></span></div>
        <label class="opt"><input type="checkbox" id="gradin" data-gradin="1"${draft.gradInDept !== false ? " checked" : ""}><span class="k">졸업요건·자격 글도 함께 보기<small>본부·진로취업에 올라온 토익·자격증·모의고사 글을 학과 카드의 '졸업요건·자격' 칩으로 모아요</small></span></label></div>
      ${layer(1, "모두에게 필요한 것")}
      ${layer(2, "내 학과와 가까운 것")}
      ${why.length ? `<p class="hint" style="margin:-4px 2px 12px">${esc([...new Set(why)].join(" / "))}</p>` : ""}
      ${layer(3, "그 밖")}
      <div class="field"><div class="lbl">학식 식당</div>${D.cfg.restaurants.map((r) => `
        <label class="opt"><input type="checkbox" data-rest="${r.id}" id="rest-${r.id}"${draft.rest.includes(r.id) ? " checked" : ""}><span class="k">${esc(r.label)}<small>${esc(r.campus)}캠퍼스</small></span></label>`).join("")}</div>`;
  }

  function step3() {
    const chosen = [{ id: "dept", label: "내 학과 공지" }].concat(D.cfg.categories.filter((c) => draft.cats.includes(c.id)));
    return `<div class="field">
        <div class="row"><div class="k">새 글 표시<small>지난번에 들어온 뒤 올라온 글에 붙여요</small></div>${seg("newOn", ["켜기", "끄기"], draft.marks.newOn ? "켜기" : "끄기")}</div>
        <div class="row"><div class="k">마감 임박 표시<small>마감 7일 안이면 D-day 를 붙여요</small></div>${seg("dueOn", ["켜기", "끄기"], draft.marks.dueOn ? "켜기" : "끄기")}</div>
      </div>
      <div class="field"><div class="lbl">표시를 붙일 분류 <small>끄면 그 분류엔 표시가 안 붙어요</small></div>${chosen.map((c) => `
        <label class="opt"><input type="checkbox" data-mark="${c.id}" id="mark-${c.id}"${draft.marks.off.includes(c.id) ? "" : " checked"}><span class="k">${esc(c.label)}</span></label>`).join("")}</div>
      <p class="hint">휴대폰 푸시 알림은 보내지 않아요. 서버 없이 돌아가는 서비스라서, 들어왔을 때 화면에서 표시로 알려 드려요.</p>`;
  }

  function viewOnboarding() {
    const titles = { 1: ["나에 대해", "학과만 고르면 나머지는 맞춰 둘게요."], 2: ["볼 것 고르기", "고른 것만 홈에 보여요. 설정에서 언제든 바꿀 수 있어요."], 3: ["표시할 것", "새 글과 마감 임박을 어디에 표시할지 정해요."] };
    const [t, lead] = titles[step];
    const body = step === 1 ? step1() : step === 2 ? step2() : step3();
    const canNext = step !== 1 || draft.depts.length > 0;
    return `<div class="setup">
      <div class="steps" aria-label="${step}/3단계">${[1, 2, 3].map((i) => `<span class="${i <= step ? "on" : ""}"></span>`).join("")}</div>
      <h2>${t}</h2><p class="lead">${lead}</p>
      ${body}
      <div class="actions">
        ${step > 1 ? `<button class="btn" data-act="prev">이전</button>` : `<button class="btn link" data-act="skip">건너뛰고 둘러보기</button>`}
        <button class="btn primary" data-act="${step < 3 ? "next" : "finish"}"${canNext ? "" : " disabled"}>${step < 3 ? "다음" : "시작하기"}</button>
      </div>
      ${step === 1 ? `<p class="hint">이름·학번은 묻지 않아요. 고른 값은 이 브라우저에만 저장돼요.</p>` : ""}
    </div>`;
  }

  function viewSetup() {
    const code = (() => { try { return btoa(unescape(encodeURIComponent(JSON.stringify({ ...draft, touched: true })))); } catch (e) { return ""; } })();
    return header("설정") +
      `<div class="view-head"><a class="back" href="#home">← 홈</a></div>
      <div class="setup" style="padding-top:0">
        <h2>나에 대해</h2><p class="lead">학과를 바꾸면 추천도 다시 맞춰져요.</p>${step1()}
        <h2>볼 것</h2><p class="lead">홈에 보일 분류예요.</p>${step2()}
        <h2>표시할 것</h2><p class="lead">&nbsp;</p>${step3()}
        <h2>키워드</h2><p class="lead">제목에 이 말이 있으면 따로 모으거나, 숨겨요.</p>
        <div class="field"><div class="lbl">모아 볼 키워드</div>
          <div class="kw-add"><input type="text" id="kw-in" placeholder="예: 근로, 튜터링"><button class="btn" data-act="kw-in">추가</button></div>
          <div class="picked">${draft.kwIn.map((w) => `<span class="chip on">${esc(w)}<button data-kwdel-in="${esc(w)}" aria-label="${esc(w)} 지우기">×</button></span>`).join("")}</div></div>
        <div class="field"><div class="lbl">숨길 키워드</div>
          <div class="kw-add"><input type="text" id="kw-out" placeholder="예: 대학원"><button class="btn" data-act="kw-out">추가</button></div>
          <div class="picked">${draft.kwOut.map((w) => `<span class="chip on">${esc(w)}<button data-kwdel-out="${esc(w)}" aria-label="${esc(w)} 지우기">×</button></span>`).join("")}</div></div>
        <div class="field"><div class="lbl">숨긴 정보원</div>
          ${draft.hidden.length ? `<div class="picked">${draft.hidden.map((s) => `<span class="chip">${esc(D.meta.sources[s]?.name || s)}<button data-unhide="${esc(s)}" aria-label="다시 보기">×</button></span>`).join("")}</div>` : `<p class="hint" style="margin:0">글 아래 '이 정보원 숨기기'를 누르면 여기에 모여요.</p>`}</div>
        <h2>다른 기기로 옮기기</h2><p class="lead">로그인이 없어서, 이 코드를 복사해 다른 기기에 붙여 넣어요.</p>
        <div class="field">
          <textarea id="code-out" readonly>${esc(code)}</textarea>
          <div class="actions" style="margin-top:8px"><button class="btn" data-act="copy">코드 복사</button><span class="hint" id="copy-msg"></span></div>
          <textarea id="code-in" placeholder="다른 기기에서 복사한 코드를 붙여 넣으세요" style="margin-top:10px"></textarea>
          <div class="actions" style="margin-top:8px"><button class="btn" data-act="import">코드로 설정 불러오기</button><span class="hint" id="import-msg"></span></div>
        </div>
        <div class="actions">
          ${confirmReset ? `<span class="hint">설정을 모두 지우고 처음 화면으로 갈까요?</span><span><button class="btn" data-act="reset-no">취소</button> <button class="btn danger" data-act="reset-yes">지우기</button></span>`
                         : `<button class="btn link" data-act="reset">설정 초기화</button>`}
          <button class="btn primary" data-act="save" ${draft.depts.length ? "" : "disabled"}>저장하고 홈으로</button>
        </div>
      </div>`;
  }

  // ---------- 그리기 ----------
  function route() { return (location.hash || "").replace(/^#/, ""); }

  function render() {
    const r = route();
    let html;
    if (!P || !P.done) html = viewOnboarding();
    else if (r === "setup") html = viewSetup();
    else if (r === "c-meal") html = viewMeal();
    else if (r === "schedule") html = viewSchedule();
    else if (r.startsWith("c-")) html = viewList(r.slice(2));
    else html = viewHome();
    const keepFocus = document.activeElement && document.activeElement.id;
    const caret = keepFocus && document.activeElement.selectionStart;
    $app.className = r === "schedule" && P && P.done ? "wide" : "";
    $app.innerHTML = html;
    if (keepFocus) {
      const el = document.getElementById(keepFocus);
      if (el && el.tagName === "INPUT") { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} }
    }
  }

  function setDraftDept(changeFn) {
    changeFn();
    const main = draft.depts[0] && depById(draft.depts[0]);
    if (main) { draft.level = main.level; draft.campus = main.campus; }
    applyDefaults(draft);
  }

  // ---------- 이벤트 ----------
  $app.addEventListener("input", (e) => {
    if (e.target.id === "dept-q-1") { deptQuery = e.target.value; render(); }
    if (e.target.id === "dept-q-2") { deptQuery2 = e.target.value; render(); }
  });

  $app.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.cat) { draft.touched = true; const s = new Set(draft.cats); t.checked ? s.add(t.dataset.cat) : s.delete(t.dataset.cat); draft.cats = [...s]; render(); }
    if (t.dataset.rest) { draft.touched = true; const s = new Set(draft.rest); t.checked ? s.add(t.dataset.rest) : s.delete(t.dataset.rest); draft.rest = [...s]; }
    if (t.dataset.bmdate) { const b = P.bm[t.dataset.bmdate]; if (b) { b.date = t.value || null; save(P); render(); } return; }
    if (t.dataset.gradin) { draft.gradInDept = t.checked; return; }
    if (t.dataset.mark) { const s = new Set(draft.marks.off); t.checked ? s.delete(t.dataset.mark) : s.add(t.dataset.mark); draft.marks.off = [...s]; }
  });

  $app.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.target.id === "kw-in" || e.target.id === "kw-out")) { e.preventDefault(); addKw(e.target.id === "kw-in" ? "kwIn" : "kwOut", e.target.id); }
  });

  function addKw(field, inputId) {
    const el = document.getElementById(inputId);
    const words = el.value.split(",").map((w) => w.trim()).filter(Boolean);
    draft[field] = [...new Set(draft[field].concat(words))];
    el.value = ""; render();
  }

  $app.addEventListener("click", (e) => {
    const b = e.target.closest("button, a");
    if (!b) return;
    const ds = b.dataset;
    if (ds.pick) {
      setDraftDept(() => { if (!draft.depts.includes(ds.id)) draft.depts.push(ds.id); });
      deptQuery = ""; deptQuery2 = ""; deptFilter = "all"; render(); return;
    }
    if (ds.unpick) { setDraftDept(() => { draft.depts = draft.depts.filter((x) => x !== ds.unpick); }); render(); return; }
    if (ds.seg) {
      const v = ds.val;
      if (ds.seg === "level") draft.level = v;
      if (ds.seg === "campus") { draft.campus = v; if (!draft.touched) draft.rest = D.cfg.restaurants.filter((r) => r.campus === v).map((r) => r.id); }
      if (ds.seg === "dorm") { draft.dorm = v === "예"; const s = new Set(draft.cats); draft.dorm ? s.add("dorm") : s.delete("dorm"); draft.cats = [...s]; }
      if (ds.seg === "teach") draft.teach = v === "예";
      if (ds.seg === "newOn") draft.marks.newOn = v === "켜기";
      if (ds.seg === "dueOn") draft.marks.dueOn = v === "켜기";
      render(); return;
    }
    if (ds.tag) { P.chips = { ...(P.chips || {}), dept: ds.tag }; save(P); render(); return; }
    if (ds.chip) { P.chips = { ...(P.chips || {}), [ds.chip]: ds.val }; save(P); render(); return; }
    if (ds.bm) {
      e.preventDefault();
      if (P.bm[ds.bm]) delete P.bm[ds.bm];
      else { const it = D.items.find((x) => x.id === ds.bm); P.bm[ds.bm] = { date: null, title: it ? it.title : "", url: it ? it.url : "" }; }
      save(P); render(); return;
    }
    if (ds.day) {
      e.preventDefault();
      selDay = ds.day; calMonth = ds.day.slice(0, 7);
      if (route() !== "schedule") location.hash = "schedule"; else render();
      return;
    }
    if (ds.month) { calMonth = ds.month; render(); return; }
    if (ds.hide) {
      P.hidden = [...new Set(P.hidden.concat(ds.hide))]; save(P); render(); return;
    }
    if (ds.unhide) { draft.hidden = draft.hidden.filter((s) => s !== ds.unhide); render(); return; }
    if (ds.kwdelIn !== undefined) { draft.kwIn = draft.kwIn.filter((w) => w !== ds.kwdelIn); render(); return; }
    if (ds.kwdelOut !== undefined) { draft.kwOut = draft.kwOut.filter((w) => w !== ds.kwdelOut); render(); return; }
    switch (ds.act) {
      case "open2": deptFilter = "open2"; render(); break;
      case "next": step = Math.min(3, step + 1); render(); window.scrollTo(0, 0); break;
      case "prev": step = Math.max(1, step - 1); render(); window.scrollTo(0, 0); break;
      case "skip": {
        const p = applyDefaults(blankPrefs());
        p.cats = D.cfg.categories.map((c) => c.id).filter((id) => id !== "dorm"); p.done = true; P = p; save(P); location.hash = "home"; render(); break;
      }
      case "finish": draft.done = true; P = JSON.parse(JSON.stringify(draft)); save(P); location.hash = "home"; render(); window.scrollTo(0, 0); break;
      case "save": draft.done = true; P = JSON.parse(JSON.stringify(draft)); save(P); location.hash = "home"; break;
      case "ics": {
        const msg = document.getElementById("ics-msg");
        try {
          const url = URL.createObjectURL(new Blob([icsFile()], { type: "text/calendar;charset=utf-8" }));
          const a = document.createElement("a"); a.href = url; a.download = "jnu-bookmarks.ics";
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
          msg.textContent = "파일을 만들었어요. 내려받기가 안 되면 GitHub Pages 주소에서 다시 눌러 주세요.";
        } catch (err) { msg.textContent = "파일을 만들지 못했어요."; }
        break;
      }
      case "kw-in": addKw("kwIn", "kw-in"); break;
      case "kw-out": addKw("kwOut", "kw-out"); break;
      case "copy": {
        const ta = document.getElementById("code-out"); const msg = document.getElementById("copy-msg");
        const done = () => { msg.textContent = "복사했어요"; };
        try { navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); msg.textContent = "선택해 뒀어요. 길게 눌러 복사하세요"; }); }
        catch (err) { ta.select(); msg.textContent = "선택해 뒀어요. 길게 눌러 복사하세요"; }
        break;
      }
      case "import": {
        const msg = document.getElementById("import-msg");
        try {
          const p = JSON.parse(decodeURIComponent(escape(atob(document.getElementById("code-in").value.trim()))));
          if (!Array.isArray(p.depts)) throw new Error("bad");
          draft = { ...blankPrefs(), ...p, done: true }; render();
          document.getElementById("import-msg").textContent = "불러왔어요. 아래 '저장하고 홈으로'를 누르세요.";
        } catch (err) { msg.textContent = "코드를 읽지 못했어요. 처음부터 끝까지 다 복사했는지 확인해 주세요."; }
        break;
      }
      case "reset": confirmReset = true; render(); break;
      case "reset-no": confirmReset = false; render(); break;
      case "reset-yes": confirmReset = false; clearSaved(); P = null; draft = blankPrefs(); step = 1; location.hash = ""; render(); break;
    }
  });

  window.addEventListener("hashchange", () => {
    if (route() === "setup" && P) { draft = JSON.parse(JSON.stringify(P)); confirmReset = false; deptFilter = "all"; }
    render(); window.scrollTo(0, 0);
  });

  // ---------- 시작 ----------
  Promise.all(["config", "departments", "items", "meals", "academic"].map((n) => fetch(`data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })))
    .then(([cfg, deps, items, meals, academic]) => {
      D = { cfg, deps, items: items.items, meals, academic, meta: items };
      TODAY = items.generated_at;
      P = load();
      if (P) P = { ...blankPrefs(), ...P, bm: P.bm || {}, chips: P.chips || {}, gradInDept: P.gradInDept !== false, marks: { ...blankPrefs().marks, ...(P.marks || {}) } };
      if (P && P.cats.some((c) => c === "jedaero" || c === "event")) P.cats = [...new Set(P.cats.filter((c) => c !== "jedaero" && c !== "event").concat("program"))];
      draft = P ? JSON.parse(JSON.stringify(P)) : blankPrefs();
      render();
      // 실제 수집이 붙으면 켠다. 시안은 데이터가 고정이라 켜 두면 '새 글' 표시가 다시는 안 보인다.
      // window.addEventListener("pagehide", markVisit);
    })
    .catch((err) => { $app.innerHTML = `<p class="loading">데이터를 불러오지 못했어요 (${esc(err.message)}). 잠시 뒤 새로 고쳐 주세요.</p>`; });
})();
