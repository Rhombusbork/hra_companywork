// 화면 모드: 일반(밝게) / 다크. 고르기 전에는 휴대폰·PC 시스템 설정을 따른다.
// 고른 값은 브라우저에만 저장하고, <html data-theme> 로 붙인다 (CSS 는 이미 data-theme 를 본다).
const KEY = "jnu-moa-theme";
const COLOR = { light: "#f2f5f9", dark: "#0c1422" };

export function storedTheme() {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : null; } catch (e) { return null; }
}
export function systemTheme() {
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; }
}
export const currentTheme = () => storedTheme() || systemTheme();

export function setTheme(t) {
  try { localStorage.setItem(KEY, t); } catch (e) { /* 저장이 막혀도 이번 화면엔 적용 */ }
  document.documentElement.setAttribute("data-theme", t);
  // 휴대폰 주소창 색도 맞춘다
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.setAttribute("content", COLOR[t]); m.removeAttribute("media"); });
}
