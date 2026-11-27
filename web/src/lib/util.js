// 날짜·글자 도우미. 날짜는 모두 한국 시간(+09:00) 기준 "YYYY-MM-DD..." 문자열로 다룬다.

export const WD = ["일", "월", "화", "수", "목", "금", "토"];
export const WD_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const day = (iso) => new Date(iso.slice(0, 10) + "T00:00:00+09:00");
export const diffDays = (a, b) => Math.round((day(a) - day(b)) / 86400000);
export const md = (iso) => { const [, m, d] = iso.slice(0, 10).split("-"); return `${+m}/${+d}`; };
export const weekday = (iso) => new Date(iso.slice(0, 10) + "T12:00:00Z").getUTCDay();
export const mdw = (iso) => `${md(iso)}(${WD[weekday(iso)]})`;
export const ymd = (dt) => dt.toISOString().slice(0, 10);
export const addDays = (iso, n) => { const d = new Date(iso.slice(0, 10) + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
export const has = (title, words) => words.some((w) => title.toLowerCase().includes(w.toLowerCase()));
export const dLabel = (d) => (d === 0 ? "D-DAY" : "D-" + d);

// 제목 앞뒤의 ★·■ 같은 장식은 덜어 낸다 (원문 제목은 상세 창에 그대로)
export const cleanTitle = (t) => t.replace(/^[\s★☆■□◆◇●○※]+|[\s★☆■□◆◇●○※]+$/g, "").replace(/^\[예시\]\s*/, "");

// 학과 찾기: 띄어쓰기 무시, 초성(ㄱㅇ → 경영학과)
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const choseong = (s) => [...s].map((c) => { const k = c.charCodeAt(0) - 0xac00; return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c; }).join("");
const squash = (s) => s.replace(/\s+/g, "").toLowerCase();
export function deptMatch(d, q) {
  const n = squash(q), hay = squash(d.name + " " + d.college);
  if (hay.includes(n)) return true;
  // 초성만 쳤을 때는 학과 이름 앞부분만 본다 (독일'학과 인'문… 같은 엉뚱한 걸림 막기)
  if (/^[ㄱ-ㅎ]+$/.test(n)) return choseong(squash(d.name)).startsWith(n);
  return n.length > 1 && squash(d.name).includes(n.replace(/(학과|학부|전공)$/, ""));
}

export const clone = (x) => JSON.parse(JSON.stringify(x));
