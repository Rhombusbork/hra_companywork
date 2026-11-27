// 처음 온 사람에게 세 단계로 묻는다: 1 나 → 2 볼 것 → 3 홈 화면.
// 고른 값은 이 브라우저에 저장되고, 다시 오면 묻지 않고 바로 홈. 언제든 설정에서 같은 카드로 바꿀 수 있다.
import { useApp } from "./ctx.js";
import { Step1, Step3 } from "./Setup.jsx";
import { CategoryCards, RestaurantCards, TileCards } from "./Cards.jsx";

const STEPS = [
  { t: "나에 대해", lead: "학과를 고르면 학과 공지가 홈 맨 위에 떠요. 이름·학번은 묻지 않아요." },
  { t: "볼 것", lead: "홈에 모아 볼 것을 골라요. 미리보기로 요즘 올라오는 글을 볼 수 있어요." },
  { t: "홈 화면", lead: "홈에 둘 칸과 표시를 골라요. 자리·크기는 홈에서 칸을 길게 눌러 바꿔요." },
];

export function Onboarding() {
  const { D, draft, ui, setUi, finishOnboarding, skipOnboarding } = useApp();
  const step = ui.obStep || 0;
  const go = (n) => { setUi({ obStep: n }); window.scrollTo(0, 0); };
  return (
    <div className="onb">
      <header className="onb-top">
        <span className="onb-brand">제주대 모아보기</span>
        <button className="btn link" data-act="skip" onClick={skipOnboarding}>건너뛰고 둘러보기</button>
      </header>
      <div className="steps" aria-label={`3단계 중 ${step + 1}단계`}>{STEPS.map((_, i) => <span key={i} className={i <= step ? "on" : ""} />)}</div>
      <div className="setup">
        <p className="onb-n mono">{step + 1} / 3</p>
        <h2>{STEPS[step].t}</h2>
        <p className="lead">{STEPS[step].lead}</p>
        {step === 0 && <Step1 />}
        {step === 1 && <><CategoryCards layer={1} title="모두에게 필요한 것" /><CategoryCards layer={2} title="내 학과와 가까운 것" /><CategoryCards layer={3} title="그 밖" /><RestaurantCards /></>}
        {step === 2 && <><TileCards /><h3 className="pick-h">표시</h3><Step3 /></>}
        <div className="actions onb-actions">
          {step > 0 ? <button className="btn" onClick={() => go(step - 1)}>이전</button> : <span />}
          {step < 2 ? <button className="btn primary" data-act="next" onClick={() => go(step + 1)}>다음</button>
            : <button className="btn primary" data-act="finish" onClick={finishOnboarding}>시작하기</button>}
        </div>
        {step === 0 && !draft.depts.length && <p className="hint">학과는 비워 둬도 돼요. 나중에 홈의 ‘학과 넣기’로 넣을 수 있어요.</p>}
      </div>
    </div>
  );
}
