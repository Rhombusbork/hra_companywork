# 기업실무 발표 PPT 제작 계획 (12/12, 1조)

- 과제: 바이브코딩을 활용한 제주 로컬 웹서비스 MVP — "제주대 모아보기"
- 내용의 바탕: [18 기업실무 텍스트 초안](../제주_웹서비스_MVP/18_기업실무_텍스트_초안.md) (Ⅰ 문제 → Ⅱ 기획 → Ⅲ MVP → Ⅳ 피드백·개선), [09 서비스 요약](../제주_웹서비스_MVP/09_서비스_요약.md), [14 기획서](../제주_웹서비스_MVP/14_서비스_기획서.md)
- 원칙: [사람의_PPT_특징.md](../사람의_PPT_특징.md). 발표 이론은 [참고/효과적인_발표_이론.md](참고/효과적인_발표_이론.md) 를 함께 본다
- 형식: `.pptx` (사용자 결정, 2026-11-27)
- 마감: 12/7(월) 자정 제출(파일명 `hra20_1조-기업실무(과제명)`), 12/12(토) 발표

## 0. 지난 발표에서 가져오는 과정

린스타트업([참고/린스타트업_PPT_제작계획.md](참고/린스타트업_PPT_제작계획.md))과 리바이어던(로컬 `~/hra/classic/`, 실명이 있어 저장소에 넣지 않음)은 같은 순서로 만들었다.

| 단계 | 린스타트업·리바이어던에서 한 것 | 이번에 할 것 |
|---|---|---|
| 1. 대본 | 대본을 먼저 쓰고, 간결본으로 줄였다(8~9분) | 18 텍스트에서 대본을 뽑는다 |
| 2. 컷 계획 | **템플릿을 보기 전에** 컷마다 "대본 / 3초 메시지 / 화면에 올릴 것 / 빌드"를 표로 정했다. 30컷 → 15컷으로 줄였다 | 같은 표를 만든다 (아래 2절은 초안) |
| 3. 템플릿 | 사용자가 템플릿을 골라 줬다(린: Canva 20장 흑백, 리바이어던: Slidesgo) | 아래 3절 후보에서 사용자가 고른다 |
| 4. 장 고르기 | 컷마다 템플릿의 어느 장을 쓰고 어디를 고칠지, 비교했다가 뺀 장까지 표로 적었다 | 같은 표(2단계 표)를 이 문서에 덧붙인다 |
| 5. 만들기 | 템플릿 pptx 를 풀어 장을 복제하고 XML 의 글상자만 고쳤다. 그림으로 안 되는 곳은 도형을 새로 그렸다. 스크립트는 `ppt_build/`(lib.py, build.py) | [참고/ppt_build/](참고/ppt_build/) 의 lib.py 를 가져와 `ppt/ppt_build/` 에서 쓴다 |
| 6. 확인 | validate 통과, LibreOffice 로 렌더링해 장마다 눈으로 확인. 숫자·인용은 원문에서 확인 | 같다. 지금 이 컴퓨터(WSL)에는 LibreOffice 가 없어 설치하거나 윈도우 PowerPoint 로 연다 |
| 7. 고친 점 기록 | "PPTX를 보고 고친 점"을 날짜와 함께 남겼다 | 같다 |

지난번에 배운 것:
- 템플릿의 선·원·카드는 대부분 **그림**이라 색을 바꾸기 어렵다. 색을 바꿔야 하면 도형으로 다시 그린다.
- 템플릿 캔버스 크기를 먼저 본다(린 템플릿은 가로 20in 라 키워드를 80pt 로 키웠다).
- 빌드는 한 장에 많아야 2번, 효과는 나타나기(페이드)만. 누르는 때를 대본의 말에 묶는다.
- 오른쪽 위에 지금 어느 부분인지 작게 적는다(이번엔 `문제` / `기획` / `MVP` / `피드백`).

## 1. 정할 것 (사용자)

- [ ] 발표 시간 (가이드북 21~39쪽 또는 교수님 안내 확인). 시간이 정해지면 컷 수를 맞춘다 (지난번 8~9분에 15컷)
- [ ] 템플릿 (3절 후보에서)
- [ ] 시연을 화면 녹화로 넣을지, 실제 사이트를 띄워 보여 줄지 (와이파이가 불안하면 녹화)
- [ ] 발표자 이름을 표지에 넣을지 (넣으면 .pptx 는 공개 저장소에 커밋하지 않는다)

## 2. 컷 계획 초안 [제안]

18 텍스트의 순서를 그대로 따랐다. 대본이 나오면 고친다. 숫자는 모두 18·09·14 에 이미 있는 것만 쓰고, 발표 전에 다시 확인한다.

| 컷 | 부분 | 3초 메시지 | 화면에 올릴 것 | 빌드 |
|---|---|---|---|---|
| 1 | 표지 | 오늘 주제 | "제주대 모아보기", 사이트 홈 화면 캡처 하나(휴대폰 틀) | 없음 |
| 2 | 문제 | 공지가 흩어져 있다 | 정보원 이름표 여러 개가 흩어진 그림(본부·학과·생활관·진로취업·국제교류·도서관) | 이름표가 하나씩 늘어난다 |
| 3 | 문제 | 마감은 제목·첨부 안에 숨어 있다 | 실제 장학 공지 제목 캡처, 마감 부분만 강조색 | 없음 |
| 4 | 문제 | 학생들도 같은 말을 한다 | 에브리타임 글 캡처(18 Ⅰ-4, 이름·닉네임 가림) | 캡처가 하나씩 |
| 5 | 문제 | 왜 관광이 아니라 제주대인가 | "관광" → "제주대" (18 Ⅰ-2) | 앞 낱말 회색, 뒤 낱말 키워드 |
| 6 | 기획 | 학과만 고르면 한 화면에 | 홈 화면 캡처 + 키워드 "한 화면" | 없음 |
| 7 | 기획 | 처음 설정 3단계 | 설정 화면 캡처 셋을 나란히 | 하나씩 |
| 8 | 기획 | 마감 가까운 순 | 큰 숫자 "D-1" 칸 캡처 | 없음 |
| 9 | MVP | 서버·로그인·DB 없이 | 그림: 학교 게시판 → Actions(하루 4번) → JSON → Pages → 휴대폰 | 왼쪽부터 하나씩 |
| 10 | MVP | 학교 사이트 예절 | 큰 숫자 "4번/하루", "2.5초", 원문 링크 | 없음 |
| 11 | MVP | 시연 | 사이트 실제 화면(또는 녹화) | — |
| 12 | 피드백 | 써 본 사람의 점수 | 피드백 분석표에서 강조 칸 하나만 색 (테스트 뒤 채움) | 없음 |
| 13 | 피드백 | 고친 것 | 고치기 전 → 고친 뒤 화면 캡처 | 왼쪽 다음 오른쪽 |
| 14 | 개선 | 다음 단계 | "AI 첨부 읽기", "시간표" 두 칸 (15 개선 제안) | 없음 |
| 15 | 끝 | 처음으로 돌아온다 | 1컷의 홈 화면이 다시, "감사합니다", 사이트 주소 QR | 없음 |

이야기를 잇는 그림: 2컷의 흩어진 이름표가 6컷에서 한 화면으로 모이고, 1컷 화면이 15컷에서 다시 나온다.

화면 캡처는 손으로 찍지 않고 `tests/ui_check.py` 처럼 Playwright 로 같은 크기(휴대폰 390×844, PC 1280×860)로 찍는다. 시험용 설정(예: 약학과)으로 찍어 매번 같은 화면이 나오게 한다.

## 3. 디자인 후보

고르는 기준 (원칙 파일에서):
- 사진·아이콘 팩이 적고 빈 공간이 많은 것 (스톡 사진은 쓰지 않는다)
- 색이 적은 것. 사이트가 제주대 남색·파랑·하늘 + 귤색 포인트라 **파랑 계열**이면 화면 캡처와 잘 어울린다
- 휴대폰 틀(목업)이 있으면 캡처를 넣기 쉽다
- 큰 글자 한 장, 비교 두 칸, 단계 화살표, 큰 숫자 장이 있는 것 (2절 컷에 필요)

### 템플릿 (내려받아 고치는 것)

| 이름 | 어디 | 값 | 좋은 점 | 걸리는 점 |
|---|---|---|---|---|
| [Software Development App Pitch Deck](https://slidesgo.com/theme/software-development-app-pitch-deck) | Slidesgo | 무료 | 파랑·초록, 31장, 앱 소개용 | 그림 장식이 많을 수 있음 |
| [Light Blue Pitch Deck](https://slidesgo.com/theme/light-blue-pitch-deck) | Slidesgo | 무료 | 연파랑 20장 | 브루탈리즘 풍(굵은 테두리) |
| [App Prototype Pitch Deck](https://slidesgo.com/theme/app-prototype-pitch-deck) | Slidesgo | 유료 | 미니멀, 앱 시제품 소개용 32장 | 유료 |
| [Mobile App User Manual Theme](https://slidesgo.com/theme/mobile-app-user-manual-theme-for-marketing) | Slidesgo | 유료 | 흰색 + 진파랑, 휴대폰 틀이 많이 들어 있음 | 유료 |
| [Modern Phone App](https://slidesgo.com/theme/modern-phone-app) | Slidesgo | 무료 | 발표 자체가 앱 화면처럼 생김 | 장난스러울 수 있음 |
| [Texting App Pitch Deck](https://slidesgo.com/theme/texting-app-pitch-deck) | Slidesgo | — | 파랑 여러 톤, 표·지도 장 | 메신저 앱 느낌 |
| [Minimal Startup Business Pitch Deck](https://slidesgo.com/theme/minimal-startup-business-pitch-deck) | Slidesgo | 무료 | 미니멀, Canva 로도 열림 | 초록 바탕 |
| [Minimalist Pitch Deck](https://slidesgo.com/theme/minimalist-pitch-deck) · [minimalist pitch deck](https://slidesgo.com/theme/minimalist-pitch-deck-minimalist) · [Minimal Gradient Pitch Deck](https://slidesgo.com/theme/minimal-gradient-pitch-deck) | Slidesgo | — | 미니멀 계열 | 색은 직접 봐야 함 |
| [Tech Startup](https://slidesgo.com/theme/tech-startup) (변형 16~19) | Slidesgo | — | 같은 틀의 색 변형이 여럿 | — |
| [Fictional Grid](https://slidesgo.com/theme/fictional-grid) | Slidesgo | 유료 | 칸(그리드) 구성 — 사이트의 벤토 홈과 어울림 | 유료 |
| [Blue Minimal Gradient FinTech Pitch Deck](https://slidescarnival.com/template/fintech-pitch-deck/30691) | SlidesCarnival | 무료(출처 표기) | 파랑 그라데이션, Canva | 빨강이 섞임 |
| Canva "Blue and White Modern Minimalist Pitch Deck", "Blue and White Modern Digital Solution Pitch Deck" | [Canva 엘리베이터 피치 모음](https://www.canva.com/templates/s/elevator-pitch/) | 무료 다수 | 파랑·흰색, 린스타트업 때처럼 Canva → pptx 로 받기 | 목록이 자주 바뀜, Canva 에서 직접 검색 |
| 미리캔버스 "파랑 모던 제안 기획서", "블루 미니멀리스트 AI 강의 발표" | [미리캔버스 프레젠테이션](https://www.miricanvas.com/ko/template/presentation/modern?page=1) | 무료 다수 | 한글 글꼴이 처음부터 맞음 | pptx 로 받으면 글꼴이 바뀔 수 있음 |
| [BaseTemplates Figma Pitch Deck](https://www.basetemplates.com/figma-pitch-deck-template) | Figma | 12장 무료 | 깔끔한 투자 발표 틀 | Figma → pptx 변환 필요 |

### 휴대폰 틀만 따로 (어느 템플릿에든 붙일 수 있음)

- [Phone Flat Mockups](https://www.presentationgo.com/?p=144238) (PresentationGO, 무료, 평면 휴대폰 여러 개)
- [Right Up Phone Mockup](https://presentationgo.com/?p=76438) (PresentationGO, 무료, 기울어진 휴대폰 하나)
- [Podium Phone Mockup](https://presentationgo.com/?p=78447) (PresentationGO, 무료)
- [Phone Mockups](https://relayto.com/template/phone-mockups-template-powerpoint-google-slides) (Relayto, 무료, 중립색)
- 템플릿 없이 둥근 사각형 도형으로 직접 그려도 된다 (리바이어던 때 아이콘을 선 도형으로 그린 것처럼)

### 템플릿 없이 참고할 디자인 방향

- **YC 방식** — [Kevin Hale, How to Design a Better Pitch Deck](https://www.ycombinator.com/blog/how-to-design-a-better-pitch-deck): 읽기 쉽게, 단순하게, 한눈에. 원칙 파일의 "3초"와 같다. 한글 요약: [화려한 슬라이드가 독, YC가 말하는 지루한 시드 덱](https://brunch.co.kr/@venture-digest/172)
- **유명 발표 모음** — [Cirrus Insight 60개+](https://www.cirrusinsight.com/blog/startup-pitch-decks), [Piktochart 37개](https://piktochart.com/blog/startup-pitch-decks-what-you-can-learn.md), [Slidebean 35개+](https://slidebean.com/blog/startup/pitch-deck-examples), [Superside YC 발표](https://www.superside.com/blog/pitch-deck-examples-yc), [Figma 발표 예시](https://www.figma.com/resource-library/pitch-deck-examples/)
  - Airbnb: 글이 적고 그림이 큼
  - Uber: 기존 택시의 불편 하나로 이야기를 끌고 감
  - Notion: 흩어진 앱 로고들로 문제를 보여 줌 → **2컷 "흩어진 공지"에 그대로 쓸 수 있는 방식**
- **벤토(칸) 구성** — 사이트 홈이 벤토라 발표도 칸 구성을 쓰면 이어진다. [BentoSlides (Dribbble)](https://dribbble.com/BentoSlides), [Linearity 벤토 슬라이드](https://www.linearity.io/templates/slides/pink-green-bento-grid-slide)
- **토스 SLASH** — [SLASH 21 세션](https://toss.im/slash-21/sessions) 일부는 발표 자료를 받을 수 있다. 한국 서비스 회사의 큰 글씨·화면 캡처 위주 발표 참고용

### 추천 [제안]

1. **Canva 파랑·흰색 미니멀 템플릿 하나** (린스타트업과 같은 방식이라 만드는 법이 이미 있음) + PresentationGO 휴대폰 틀
2. 마음에 드는 게 없으면 **템플릿 없이** 사이트 색으로 직접 그린다. 화면 캡처가 그림 역할을 해서 장식이 적어도 된다

사이트 색 (`web/src/app.css`): 남색 `#042880`(기본), 파랑 `#0e6fc1`, 하늘 `#049edc`·옅은 하늘 `#e5f3fb`(틴트), 회색 `#5a6474`·`#e6ebf1`, 바탕 `#f2f5f9`, 강조는 귤색 `#f2711c` 하나. 원칙 파일의 "기본색 하나, 강조색 하나, 틴트, 회색 둘, 흰색"과 그대로 맞는다.

## 4. 만들기 순서와 일정

| 날짜 | 할 일 | 누가 |
|---|---|---|
| 11/28~29 | 발표 시간 확인, 템플릿 고르기 | 사용자 |
| 11/29 | 대본 초안 (18 → 말로 하는 글) | Claude, 사용자가 고침 |
| 11/30 | 컷 계획 확정, 2단계 표(템플릿 장 고르기) | Claude |
| 12/1~2 | 화면 캡처 찍기, `ppt_build/` 로 1차 .pptx | Claude |
| 12/3 | 렌더링 확인, 점검표, 고친 점 기록 | Claude, 사용자 |
| 12/4~6 | 사용자 테스트 결과가 나오면 12·13컷 채움 | 사용자 → Claude |
| 12/7(월) | 제출 (메일 제목 = 파일명) | 사용자 |
| 12/8~11 | 리허설, 누르는 때 대본에 표시 | 사용자 |

## 5. 점검 (원칙 파일 + 이번 것)

- [ ] 모든 장에 그림(또는 화면 캡처)이 하나씩 있다
- [ ] 장마다 3초 메시지가 보인다
- [ ] 문장이나 글머리표가 없다
- [ ] 강조색(귤색)은 장마다 한 곳에만 있다
- [ ] 글이 넘치거나 겹치는 곳이 없다 (렌더링해서 확인)
- [ ] 캡처 속 개인정보(에타 닉네임, 학번, 실명)를 가렸다
- [ ] 숫자는 18·09·14 와 같다 (공지 약 200건, 하루 4번, 요청 사이 2.5초 등)
- [ ] 캡처마다 아래에 출처(사이트 주소·날짜, 에브리타임 등)
- [ ] 공개 저장소: 발표자 이름이 든 .pptx 는 커밋하지 않는다
