// 학과 넣기 · 설정 화면. 고치는 동안은 draft 에 두고, '저장' 을 눌러야 P 에 들어간다.
import { useState } from "react";
import { useApp } from "./ctx.js";
import { Header, Back } from "./Chrome.jsx";
import { deptMatch, clone } from "../lib/util.js";
import { defaultsFor, recommendedBy, applyDefaults } from "../lib/logic.js";
import { blankPrefs } from "../lib/prefs.js";
import { CategoryCards, RestaurantCards, TileCards } from "./Cards.jsx";

function DeptPicker({ which }) {
  const { D, draft, setDraft, ui, setUi } = useApp();
  const key = which === 2 ? "deptQuery2" : "deptQuery";
  const q = ui[key];
  const taken = new Set(draft.depts);
  const got = new Set(D.meta.dept_boards || []);
  const list = D.deps.filter((d) => !d.is_college_board && (!q.trim() || deptMatch(d, q.trim())));
  const groups = {};
  list.forEach((d) => (groups[d.college] = groups[d.college] || []).push(d));
  const pick = (id) => {
    setDraft((dr) => {
      const n = clone(dr);
      if (!n.depts.includes(id)) n.depts.push(id);
      const main = n.depts[0] && D.deps.find((x) => x.id === n.depts[0]);
      if (main) { n.level = main.level; n.campus = main.campus; }
      return applyDefaults(D, n);
    });
    setUi({ deptQuery: "", deptQuery2: "", open2: false });
  };
  const onKey = (e) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return; // 한글 조합 중 Enter
    if (e.key === "Enter") {
      const opts = list.filter((d) => !taken.has(d.id));
      if (opts.length === 1) { e.preventDefault(); pick(opts[0].id); }
    }
  };
  return (
    <>
      <input type="search" id={"dept-q-" + which} placeholder="학과 이름이나 초성 (예: 약학, ㄱㅇ)" value={q} autoComplete="off" enterKeyHint="done" aria-label="학과 찾기"
        onChange={(e) => setUi({ [key]: e.target.value })} onKeyDown={onKey} />
      <div className="dept-list">
        {Object.keys(groups).length ? Object.entries(groups).map(([col, ds]) => (
          <div key={col} className="dept-group-wrap">
            <div className="dept-group">{col}</div>
            {ds.map((d) => (
              <button key={d.id} className="dept-opt" data-pick={which} data-id={d.id} disabled={taken.has(d.id)} onClick={() => pick(d.id)}>
                {d.name}{got.has(d.board) && <> <small className="got">게시판 모음</small></>}{taken.has(d.id) && " · 선택함"}
              </button>
            ))}
          </div>
        )) : <p className="empty" style={{ padding: 10 }}>찾는 학과가 없어요.</p>}
      </div>
    </>
  );
}

function DeptFields({ requiredMain }) {
  const { D, draft, setDraft, ui, setUi } = useApp();
  const dep = (id) => D.deps.find((d) => d.id === id);
  const main = draft.depts[0] ? dep(draft.depts[0]) : null;
  const extra = draft.depts.slice(1).map(dep).filter(Boolean);
  const unpick = (id) => setDraft((dr) => {
    const n = clone(dr); n.depts = n.depts.filter((x) => x !== id);
    const m = n.depts[0] && dep(n.depts[0]); if (m) { n.level = m.level; n.campus = m.campus; }
    return applyDefaults(D, n);
  });
  return (
    <>
      <div className="field">
        <div className="lbl">주전공 {requiredMain && <span className="req">필수</span>}</div>
        {main ? <div className="picked"><span className="chip on">{main.college} · {main.name}<button data-unpick={main.id} aria-label="주전공 지우기" onClick={() => unpick(main.id)}>×</button></span></div> : <DeptPicker which={1} />}
      </div>
      <div className="field">
        <div className="lbl">복수전공·부전공 <small>선택, 여러 개</small></div>
        {extra.length > 0 && <div className="picked">{extra.map((d) => <span key={d.id} className="chip on">{d.name}<button data-unpick={d.id} aria-label={d.name + " 지우기"} onClick={() => unpick(d.id)}>×</button></span>)}</div>}
        {main ? (ui.open2 ? <DeptPicker which={2} /> : <button className="btn" data-act="open2" style={{ marginTop: 6 }} onClick={() => setUi({ open2: true })}>+ 학과 추가</button>) : <p className="hint">주전공을 먼저 골라 주세요.</p>}
      </div>
    </>
  );
}

export function DeptPick() {
  const { draft, saveDept } = useApp();
  return (
    <>
      <Header title="내 학과 넣기" />
      <Back />
      <div className="setup" style={{ paddingTop: 0 }}>
        <h2>내 학과</h2><p className="lead">고르면 학과 게시판 글이 홈 맨 위에 떠요. 나머지는 설정에서 바꿀 수 있어요.</p>
        <DeptFields />
        <div className="actions">
          <a className="btn link" href="#home">나중에</a>
          <button className="btn primary" data-act="dept-save" disabled={!draft.depts.length} onClick={saveDept}>저장하고 홈으로</button>
        </div>
        <p className="hint">이름·학번은 묻지 않아요. 고른 값은 이 브라우저에만 저장돼요.</p>
      </div>
    </>
  );
}

const Seg = ({ options, value, onPick }) => (
  <div className="seg" role="group">{options.map((o) => <button key={o} className={o === value ? "on" : ""} onClick={() => onPick(o)}>{o}</button>)}</div>
);

export function Step1() {
  const { D, draft, setDraft } = useApp();
  const main = draft.depts[0];
  const teachAuto = defaultsFor(D, draft).teachAuto;
  const set = (fn) => setDraft((dr) => { const n = clone(dr); fn(n); return n; });
  return (
    <>
      <DeptFields requiredMain />
      <div className="field">
        <div className="row"><div className="k">학부 / 대학원<small>{main ? "학과에 맞춰 골라 뒀어요. 다르면 바꿔 주세요." : ""}</small></div><Seg options={["학부", "대학원"]} value={draft.level} onPick={(v) => set((n) => { n.level = v; })} /></div>
        <div className="row"><div className="k">캠퍼스<small>학식 식당을 고르는 데 써요</small></div><Seg options={["아라", "사라"]} value={draft.campus} onPick={(v) => set((n) => { n.campus = v; if (!n.touched) n.rest = D.cfg.restaurants.filter((r) => r.campus === v).map((r) => r.id); })} /></div>
        <div className="row"><div className="k">학생생활관(기숙사)에 사나요?<small>예라고 하면 생활관 공지를 위쪽에 보여 드려요</small></div><Seg options={["예", "아니오"]} value={draft.dorm ? "예" : "아니오"} onPick={(v) => set((n) => { n.dorm = v === "예"; const s = new Set(n.cats); n.dorm ? s.add("dorm") : s.delete("dorm"); n.cats = [...s]; })} /></div>
        <div className="row"><div className="k">교직을 이수하나요?<small>{teachAuto ? "사범·교육 계열이라 켜 뒀어요" : "교직 글을 학과 공지에 함께 모아 드려요"}</small></div><Seg options={["예", "아니오"]} value={draft.teach ? "예" : "아니오"} onPick={(v) => set((n) => { n.teach = v === "예"; })} /></div>
      </div>
    </>
  );
}

function Step2() {
  // 볼 것: 고르기 카드 (처음 설정과 같은 카드)
  const { draft, setDraft } = useApp();
  const set = (fn) => setDraft((dr) => { const n = clone(dr); fn(n); return n; });
  return (
    <>
      <div className="field"><div className="lbl">내 학과 공지 <span className="req">항상 보여요</span></div>
        <div className="opt locked"><input type="checkbox" checked disabled readOnly /><span className="k">학과 게시판 글<small>졸업·학사, 졸업요건·자격, 근로·학과장학, 교직, 취업·채용, 실습·특강, 행사로 나눠 보여 드려요</small></span></div>
        <label className="opt"><input type="checkbox" id="gradin" checked={draft.gradInDept !== false} onChange={(e) => set((n) => { n.gradInDept = e.target.checked; })} /><span className="k">졸업요건·자격 글도 함께 보기<small>본부·진로취업에 올라온 토익·자격증·모의고사 글을 학과 칸의 '졸업요건·자격' 칩으로 모아요</small></span></label>
      </div>
      <CategoryCards layer={1} title="모두에게 필요한 것" />
      <CategoryCards layer={2} title="내 학과와 가까운 것" />
      <CategoryCards layer={3} title="그 밖" />
      <RestaurantCards />
    </>
  );
}

export function Step3() {
  const { D, draft, setDraft } = useApp();
  const set = (fn) => setDraft((dr) => { const n = clone(dr); fn(n); return n; });
  const chosen = [{ id: "dept", label: "내 학과 공지" }].concat(D.cfg.categories.filter((c) => draft.cats.includes(c.id)));
  return (
    <>
      <div className="field">
        <div className="row"><div className="k">새 글 표시<small>지난번에 들어온 뒤 올라온 글에 붙여요</small></div><Seg options={["켜기", "끄기"]} value={draft.marks.newOn ? "켜기" : "끄기"} onPick={(v) => set((n) => { n.marks.newOn = v === "켜기"; })} /></div>
        <div className="row"><div className="k">마감 임박 표시<small>마감 7일 안이면 D-day 를 붙여요</small></div><Seg options={["켜기", "끄기"]} value={draft.marks.dueOn ? "켜기" : "끄기"} onPick={(v) => set((n) => { n.marks.dueOn = v === "켜기"; })} /></div>
      </div>
      <div className="field"><div className="lbl">표시를 붙일 분류 <small>끄면 그 분류엔 표시가 안 붙어요</small></div>
        {chosen.map((c) => (
          <label key={c.id} className="opt"><input type="checkbox" id={"mark-" + c.id} checked={!draft.marks.off.includes(c.id)} onChange={(e) => set((n) => { const s = new Set(n.marks.off); e.target.checked ? s.delete(c.id) : s.add(c.id); n.marks.off = [...s]; })} /><span className="k">{c.label}</span></label>
        ))}
      </div>
      <p className="hint">휴대폰 푸시 알림은 보내지 않아요. 서버 없이 돌아가는 서비스라서, 들어왔을 때 화면에서 표시로 알려 드려요.</p>
    </>
  );
}

function KwField({ field, label, ph }) {
  const { draft, setDraft } = useApp();
  const [v, setV] = useState("");
  const add = () => { const words = v.split(",").map((w) => w.trim()).filter(Boolean); if (!words.length) return; setDraft((dr) => ({ ...dr, [field]: [...new Set(dr[field].concat(words))] })); setV(""); };
  return (
    <div className="field"><div className="lbl">{label}</div>
      <div className="kw-add">
        <input type="text" id={field === "kwIn" ? "kw-in" : "kw-out"} placeholder={ph} value={v} onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.nativeEvent.isComposing || e.keyCode === 229) return; if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button className="btn" onClick={add}>추가</button>
      </div>
      <div className="picked">{draft[field].map((w) => <span key={w} className="chip on">{w}<button aria-label={w + " 지우기"} onClick={() => setDraft((dr) => ({ ...dr, [field]: dr[field].filter((x) => x !== w) }))}>×</button></span>)}</div>
    </div>
  );
}

function copyText(text, el, setMsg) {
  try { navigator.clipboard.writeText(text).then(() => setMsg("복사했어요"), () => { el && el.select(); setMsg("선택해 뒀어요. 길게 눌러 복사하세요"); }); }
  catch (err) { el && el.select(); setMsg("선택해 뒀어요. 길게 눌러 복사하세요"); }
}

export function SetupView() {
  const { D, draft, setDraft, saveSetup, resetAll } = useApp();
  const [msgs, setMsgs] = useState({});
  const [codeIn, setCodeIn] = useState("");
  const [confirm, setConfirm] = useState(false);
  const say = (k) => (m) => setMsgs((x) => ({ ...x, [k]: m }));
  const code = (() => { try { return btoa(unescape(encodeURIComponent(JSON.stringify({ ...draft, touched: true })))); } catch (e) { return ""; } })();
  const link = draft.depts[0] ? location.origin + location.pathname + "?dept=" + encodeURIComponent(draft.depts[0]) : null;
  const doImport = () => {
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(codeIn.trim()))));
      if (!Array.isArray(p.depts)) throw new Error("bad");
      setDraft({ ...blankPrefs(), ...p, done: true });
      say("imp")("불러왔어요. 아래 '저장하고 홈으로'를 누르세요.");
    } catch (err) { say("imp")("코드를 읽지 못했어요. 처음부터 끝까지 다 복사했는지 확인해 주세요."); }
  };
  return (
    <>
      <Header title="설정" />
      <Back />
      <div className="setup" style={{ paddingTop: 0 }}>
        <h2>나에 대해</h2><p className="lead">학과를 바꾸면 추천도 다시 맞춰져요. 학과는 비워 둬도 돼요.</p>
        <Step1 />
        {link && (
          <div className="field"><div className="lbl">내 학과 링크 <small>이 링크로 들어오면 학과를 고르지 않아도 바로 내 학과로 보여요</small></div>
            <input type="text" id="link-out" readOnly value={link} />
            <div className="actions" style={{ marginTop: 8 }}><button className="btn" onClick={(e) => copyText(link, document.getElementById("link-out"), say("link"))}>내 학과 링크 복사</button><span className="hint">{msgs.link}</span></div>
          </div>
        )}
        <h2>볼 것</h2><p className="lead">오른쪽 위 ✓ 로 넣고 빼요. 미리보기로 요즘 올라오는 글을 볼 수 있어요.</p>
        <Step2 />
        <h2>홈 화면</h2><p className="lead">끈 칸은 숨겨 두고, 홈의 ‘칸 추가’로 다시 꺼낼 수 있어요.</p>
        <TileCards />
        <h3 className="pick-h">표시</h3>
        <Step3 />
        <h2>키워드</h2><p className="lead">제목에 이 말이 있으면 따로 모으거나, 숨겨요.</p>
        <KwField field="kwIn" label="모아 볼 키워드" ph="예: 근로, 튜터링" />
        <KwField field="kwOut" label="숨길 키워드" ph="예: 대학원" />
        <div className="field"><div className="lbl">숨긴 정보원</div>
          {draft.hidden.length ? <div className="picked">{draft.hidden.map((s) => <span key={s} className="chip">{D.meta.sources[s]?.name || s}<button aria-label="다시 보기" onClick={() => setDraft((dr) => ({ ...dr, hidden: dr.hidden.filter((x) => x !== s) }))}>×</button></span>)}</div>
            : <p className="hint" style={{ margin: 0 }}>글 상세 창의 '이 정보원 글 숨기기'를 누르면 여기에 모여요.</p>}
        </div>
        <h2>다른 기기로 옮기기</h2><p className="lead">로그인이 없어서, 이 코드를 복사해 다른 기기에 붙여 넣어요. 홈 칸 배치도 같이 옮겨져요.</p>
        <div className="field">
          <textarea id="code-out" readOnly value={code} />
          <div className="actions" style={{ marginTop: 8 }}><button className="btn" data-act="copy" onClick={() => copyText(code, document.getElementById("code-out"), say("copy"))}>코드 복사</button><span className="hint">{msgs.copy}</span></div>
          <textarea id="code-in" placeholder="다른 기기에서 복사한 코드를 붙여 넣으세요" style={{ marginTop: 10 }} value={codeIn} onChange={(e) => setCodeIn(e.target.value)} />
          <div className="actions" style={{ marginTop: 8 }}><button className="btn" data-act="import" onClick={doImport}>코드로 설정 불러오기</button><span className="hint">{msgs.imp}</span></div>
        </div>
        <div className="actions">
          {confirm ? (
            <><span className="hint">설정을 모두 지우고 처음 상태로 돌릴까요?</span><span><button className="btn" onClick={() => setConfirm(false)}>취소</button> <button className="btn danger" onClick={resetAll}>지우기</button></span></>
          ) : <button className="btn link" data-act="reset" onClick={() => setConfirm(true)}>설정 초기화</button>}
          <button className="btn primary" data-act="save" onClick={saveSetup}>저장하고 홈으로</button>
        </div>
      </div>
    </>
  );
}
