// 학식 메뉴를 학교 '오늘의 식단' 창처럼 끼니별 탭으로 나누기 위한 도우미.
// 학교·업체마다 끼니 이름이 제각각(조식(천원의 아침밥), 조식(간편식), 중식1, 석식 …)이라 아침·점심·저녁으로 맞춘다.

// 끼니 이름 → { slot: 0 아침 | 1 점심 | 2 저녁, label: 탭 이름, tags: [천원 …] }
export function mealInfo(m) {
  const name = m.meal || "";
  const tags = [];
  if (/천원/.test(name + " " + (m.note || ""))) tags.push("천원");
  if (/한정/.test(name + " " + (m.note || ""))) tags.push("한정");
  if (m.note === "인스타 글") tags.push("인스타");
  const quick = /간편/.test(name);
  let slot = 1, base = "점심";
  if (/조식|아침/.test(name) || quick) { slot = 0; base = "아침"; }
  else if (/석식|저녁/.test(name)) { slot = 2; base = "저녁"; }
  else if (/스페셜|이벤트/.test(name)) { slot = 1; base = "스페셜"; }
  const n = (name.match(/(\d)\s*$/) || [])[1];
  const label = base + (quick ? " 간편" : "") + (n ? n : "");
  return { slot, label, tags, quick };
}

// 메뉴 칸에 섞인 ★·※ 같은 기호만 있는 줄은 뺀다
export const cleanMenu = (menu) => (menu || []).filter((x) => /[가-힣A-Za-z0-9]/.test(x));

// 지금 몇 시인지 (한국 시간)
export function seoulHour() {
  try { return +new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(new Date()); }
  catch (e) { return new Date().getHours(); }
}

// 시간에 맞는 끼니: 10시 전 아침, 15시 전 점심, 15시부터 저녁.
// 그 끼니가 없으면 바로 앞 끼니(저녁이 없으면 점심), 그것도 없으면 첫 끼니. 같은 끼니가 여럿이면 간편식이 아닌 것 먼저.
export const slotNow = () => { const h = seoulHour(); return h < 10 ? 0 : h < 15 ? 1 : 2; };
export function defaultMealIndex(meals) {
  if (!meals || !meals.length) return 0;
  const want = slotNow();
  const info = meals.map((m, i) => ({ i, ...mealInfo(m) }));
  const pick = (arr) => arr.sort((a, b) => a.quick - b.quick)[0].i;
  const exact = info.filter((x) => x.slot === want);
  if (exact.length) return pick(exact);
  const before = info.filter((x) => x.slot < want);
  if (before.length) { const s = Math.max(...before.map((x) => x.slot)); return pick(before.filter((x) => x.slot === s)); }
  return pick(info.filter((x) => x.slot === Math.min(...info.map((y) => y.slot))));
}
