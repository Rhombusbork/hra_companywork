// 홈 칸(위젯) 목록과 기본 배치.
// react-grid-layout 단위: 한 줄 높이 ROW px, 칸 사이 GAP px. 칸 높이(px) = h*ROW + (h-1)*GAP.
// 폭: 좁은 화면(sm) 2열, 넓은 화면(lg) 4열.

export const ROW = 44;
export const GAP = 8;
export const BREAKPOINTS = { lg: 600, sm: 0 };
export const COLS = { lg: 4, sm: 2 };
export const px = (h) => h * ROW + (h - 1) * GAP;

// 크기 고르기: 아이폰 위젯처럼 몇 가지 정해 둔 크기. 1칸 = 폭 1, 높이 3줄
export const SIZES = [
  { id: "s", label: "작게", w: 1, h: 3 },
  { id: "m", label: "넓게", w: 2, h: 3 },
  { id: "l", label: "크게", w: 2, h: 6 },
  { id: "xl", label: "길게", w: 2, h: 9 },
  { id: "full", label: "가로 가득", w: 4, h: 6, lgOnly: true },
];

// 칸 색: 학교 색 안에서만 고른다
export const TONES = [
  { id: "auto", label: "기본" },
  { id: "white", label: "흰색" },
  { id: "sky", label: "연하늘" },
  { id: "blue", label: "파랑" },
  { id: "navy", label: "남색" },
];
export const SHAPES = [
  { id: "round", label: "둥글게" },
  { id: "square", label: "각지게" },
];

// 이 사람에게 지금 보여 줄 수 있는 칸들 (숨긴 칸 포함)
export function catalog(D, P, L) {
  const w = [
    { id: "date", title: "오늘 날짜", min: { w: 1, h: 2 }, def: { sm: [2, 3], lg: [4, 3] } },
    { id: "urgent", title: "가장 먼저 마감", min: { w: 1, h: 3 }, def: { sm: [2, 5], lg: [2, 6] } },
    { id: "count", title: "이번 주 마감 수", min: { w: 1, h: 2 }, def: { sm: [1, 3], lg: [1, 3] } },
  ];
  if (P.rest.length) w.push({ id: "meal", title: "오늘 학식", min: { w: 1, h: 2 }, def: { sm: [1, 3], lg: [1, 3] } });
  w.push({ id: "next", title: "그다음 마감", min: { w: 1, h: 3 }, def: { sm: [2, 5], lg: [2, 3] } });
  w.push({ id: "week", title: "이번 주", min: { w: 1, h: 3 }, def: { sm: [2, 4], lg: [4, 4] } });
  if (P.depts.length) w.push({ id: "dept", title: "내 학과", min: { w: 1, h: 4 }, def: { sm: [2, 12], lg: [4, 12] } });
  if (P.kwIn.length) w.push({ id: "kw", title: "내 키워드", min: { w: 1, h: 3 }, def: { sm: [2, 7], lg: [2, 7] } });
  for (const c of L.shownCats()) {
    const h = c.chips ? 8 : 7;
    w.push({ id: "c-" + c.id, cat: c, title: c.label, min: { w: 1, h: 3 }, def: { sm: [2, h], lg: [2, h] } });
  }
  return w;
}

// 기본 배치: 위쪽은 벤토(날짜·마감·학식·이번 주), 아래는 분류 칸. 넓은 화면에선 분류 칸을 두 줄로 나란히
export function defaultLayout(widgets, bp) {
  const cols = COLS[bp];
  const colY = Array(cols).fill(0);
  const out = [];
  const place = (id, w, h, x) => {
    // x 를 정하면 그 자리(가능한 가장 위)에, 안 정하면 가장 낮은 열에
    if (x === undefined) {
      let best = 0;
      for (let i = 0; i + w <= cols; i++) if (Math.max(...colY.slice(i, i + w)) < Math.max(...colY.slice(best, best + w))) best = i;
      x = best;
    }
    const y = Math.max(...colY.slice(x, x + w));
    out.push({ i: id, x, y, w, h });
    for (let i = x; i < x + w; i++) colY[i] = y + h;
  };
  const by = Object.fromEntries(widgets.map((x) => [x.id, x]));
  const sz = (id) => by[id].def[bp];
  const order = ["date", "urgent", "next", "count", "meal", "week", "dept", "kw"];
  if (bp === "lg") {
    // 날짜 / [마감 큰 칸 | 그다음 마감, 수·학식] / 이번 주 / 학과
    if (by.date) place("date", ...sz("date"), 0);
    if (by.urgent) place("urgent", ...sz("urgent"), 0);
    if (by.next) place("next", ...sz("next"), 2);
    if (by.count) place("count", ...sz("count"), 2);
    if (by.meal) place("meal", ...sz("meal"), 3);
    // 오른쪽이 비면 왼쪽 높이에 맞춘다
    const top = Math.max(...colY); for (let i = 0; i < cols; i++) colY[i] = top;
    for (const id of ["week", "dept"]) if (by[id]) place(id, ...sz(id), 0);
    for (const x of widgets) if (!out.some((o) => o.i === x.id)) place(x.id, ...sz(x.id));
  } else {
    for (const id of order) {
      if (!by[id]) continue;
      if (id === "count") place(id, ...sz(id), 0);
      else if (id === "meal") place(id, ...sz(id), by.count ? 1 : 0);
      else { const top = Math.max(...colY); for (let i = 0; i < cols; i++) colY[i] = top; place(id, ...sz(id), 0); }
    }
    for (const x of widgets) if (!out.some((o) => o.i === x.id)) { const top = Math.max(...colY); for (let i = 0; i < cols; i++) colY[i] = top; place(x.id, ...sz(x.id), 0); }
  }
  return out;
}

// 저장된 배치 + 새로 생긴 칸(맨 아래에) - 숨긴 칸
export function mergedLayouts(widgets, saved, hidden) {
  const show = widgets.filter((w) => !hidden.includes(w.id));
  const res = {};
  for (const bp of Object.keys(COLS)) {
    const def = defaultLayout(show, bp);
    const s = saved && saved[bp];
    if (!s) { res[bp] = def; continue; }
    const keep = s.filter((l) => show.some((w) => w.id === l.i)).map((l) => ({ i: l.i, x: l.x, y: l.y, w: Math.min(l.w, COLS[bp]), h: l.h }));
    for (const w of show) if (!keep.some((l) => l.i === w.id)) { const d = def.find((l) => l.i === w.id); keep.push({ ...d, y: 9999 }); }
    res[bp] = keep;
  }
  // 최소 크기
  for (const bp of Object.keys(res)) res[bp] = res[bp].map((l) => { const w = widgets.find((x) => x.id === l.i); return { ...l, minW: w.min.w, minH: w.min.h }; });
  return res;
}
