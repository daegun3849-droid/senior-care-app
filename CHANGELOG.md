# CHANGELOG

## 이 파일을 유용하게 쓰는 법

**역할:** 채팅은 기기마다 끊겨도, 여기 + Git이면 **사무실·노트북이 같은 줄거리**를 봅니다.

| 언제 | 무엇을 적나 |
|------|-------------|
| 작업이 끝날 때 | 아래처럼 **날짜 + 장소** 블록을 하나 추가 (`### 완료` bullet) |
| 내일 할 일만 정리 | `## 다음 할 일`만 고쳐도 됨 |
| Cursor Agent에게 | `CHANGELOG.md` 읽고 이어서 해줘 — 한 줄이면 됨 |

**복사용 템플릿 (날짜·장소만 바꾸기):**

```markdown
---

## 2026-04-15 (사무실)

### 완료
-

### 메모 / 이슈
- AI 모델: `gemini-1.5-flash`로 통일 (코드 반영됨, 키는 기존 `GOOGLE_GENERATIVE_AI_API_KEY` 사용)
- 터미널 `Invalid Refresh Token` 오류는 브라우저 쿠키/세션 문제로 판단, 앱 동작에는 문제 없음
- Cursor IDE 채팅 모델은 `gemini-1.5-flash`가 아닌 다른 모델로 변경 (별개 이슈)

```

**짝꿍 파일:** `AI플래너_개발일지.txt` — 여기는 **짧은 목록**, 일지는 **설명·맥락·대화 요약**을 길게.

**브라우저에서 나란히 보기:** 배포 후 `/docs` (예: `https://ai-todo-manager-plum.vercel.app/docs`) — PC에서 두 파일을 한 화면에 스크롤로 비교 가능. 메인 헤더에 **「문서」** 링크.

---

## 2026-05-06 (노트북)

### 완료
- **루틴 섹션 추가** (`🔁 Today's Routine`)
  - Supabase `routines` + `routine_logs` 테이블 생성 (`supabase/routines.sql`)
  - 루틴 추가 / 완료 토글 / 삭제 기능
  - 오늘 완료율 프로그레스 바 표시
  - 루틴별 시작·종료 시간 입력 (`routine_time`, `routine_end_time` 컬럼 추가)
  - 이모지 피커: 8개 카테고리 80개 이모지 버튼 선택 방식으로 개선
    - ☀️ 아침·날씨 / 🏃 운동·스포츠 / 💻 공부·업무 / 🥗 식사·건강
    - 🙏 마음·힐링 / 🎵 취미·여가 / 🛌 수면·위생 / 📧 일상·관리
  - 매일 자동 초기화 (날짜 기반 로그)

### 다음 할 일 (사무실에서 이어서)
- 새 프로젝트 시작: **어르신 돌봄 플래너** (노인복지관 서비스)
  - 현재 앱 코드 복사 → 새 GitHub 저장소 생성
  - 음성 입력 기능 추가 (마이크 버튼 → AI 파싱 → 자동 저장)
  - 큰 글씨 UI, 복약 알림, 가족 공유 기능
  - Vercel 새 프로젝트로 배포

### 메모
- 루틴 섹션은 달력 아래, 일정 목록 위에 배치
- Supabase에 `routine_time`, `routine_end_time` 컬럼 ALTER TABLE로 추가 완료
- 새 앱 만들어도 현재 앱·데이터는 그대로 유지됨 (Supabase·Vercel 독립)

---

## 2026-04-14 (노트북)

### 완료
- Vercel 빌드 오류 수정 (`@/lib/supabase/server`, VAPID 런타임 초기화)
- 알림: **브라우저 타이머 방식**으로 전환 — 일정 시작 30분 전·종료 시각에 `Notification` (탭이 열려 있을 때 정확)
- 알림 버튼 UI: 모바일 터치 영역 확대, PC에도 `알림` 문구 표시
- 홍보 배너: 로그인 확인 후에만 비로그인에게 표시 (`authLoaded` 플래그)
- 제목 2줄: flex 래퍼 + `-webkit-box` 인라인 스타일 재적용

### 메모
- Web Push + Cron + `push_subscriptions` 테이블은 코드에 남아 있으나, **일상 알림은 현재 브라우저 타이머가 주력**

---

## 2026-04-06 (노트북)

### 완료
- Git 머지 충돌 해결 (`next.config.ts`, `app/page.tsx`, `app/api/ai-parse-todo/route.ts`)
- AI 파싱 API: Groq 우선 → Google Gemini fallback 구조로 변경
  - `GROQ_API_KEY` 또는 `NEXT_PUBLIC_GROQ_API_KEY` 둘 다 인식
- 템플릿 마켓 MVP 1차 구현
  - 기본 템플릿 3개 (면접/시험/업무 루틴)
  - 적용 버튼으로 입력 폼 자동 채우기
  - 현재 입력 내용을 내 템플릿으로 저장 (로컬스토리지)
  - 내 템플릿 삭제 기능
- 비로그인 UX 개선
  - 비로그인 시 안내 문구 표시
  - 저장 버튼 비활성화 + `로그인 후 저장 가능` 텍스트
  - 헤더 우측: 로그인 상태에 따라 `로그인` / `로그아웃` 버튼 분기
- Supabase URL Configuration 수정
  - Site URL: `https://ai-todo-manager-plum.vercel.app`
  - Redirect URLs: plum 도메인으로 통일

### 배포 URL
- Production: https://ai-todo-manager-plum.vercel.app
- 회원가입: https://ai-todo-manager-plum.vercel.app/signup
- 로그인: https://ai-todo-manager-plum.vercel.app/login

---

## 2026-04-07 (사무실)

### 완료
- 머지 충돌 추가 발견 및 전체 해결
  - `app/api/ai-parse-todo/route.ts`
  - `app/api/ai-todos-analysis/route.ts`
  - `lib/supabase/client.ts`
  - `types/todo.ts`
  - `tsconfig.json`
  - `package.json`
- `middleware.ts` / `proxy.ts` 중복 충돌 → `middleware.ts` 삭제로 해결
- `@ai-sdk/groq` 패키지 설치
- 빌드 정상화 완료 후 Vercel 재배포

---

## 2026-04-07 (노트북 - 오후)

### 완료
- **여러 일정 한 번에 입력 → 자동 분리 저장** 기능 구현
  - `app/api/ai-parse-todo/route.ts`: AI 프롬프트를 배열 반환으로 변경
  - 일정 1개 → 기존처럼 폼 자동완성
  - 일정 여러 개 → 미리보기 카드 목록 표시 후 일괄 저장
  - 개별 × 버튼으로 제거 가능
- **반응형 레이아웃 (데스크탑/모바일)** 적용
  - 데스크탑(md 이상): 2컬럼 와이드 레이아웃, 폰트·패딩 확대
  - 모바일: 기존 단일 컬럼 유지
- **로컬 `.env.local` 환경변수 수정**
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가

---

## 2026-04-08 (노트북 - 오전~오후)

### 완료
- **달력 팝업 날짜 피커** — 시작/마감 날짜 입력을 달력 팝업으로 교체 (`DateTimePicker` 컴포넌트)
- **오늘의 명언** — 달력 바로 위에 매일 다른 명언 표시 (30개 순환)
- **월간 달력 뷰** — 오른쪽 컬럼에 월간 달력, 일정 있는 날짜에 초록 점 표시
- **날짜 클릭 → 빠른 일정 추가** — 달력 날짜 클릭 시 아래에 입력창 표시, Enter/추가 버튼으로 즉시 저장
- **날짜 클릭 → 일정 필터** — 해당 날짜 일정만 표시, 전체보기 버튼으로 해제
- **일정 제목 두 줄 표시** — Tailwind v4 호환 인라인 스타일로 적용, 글자 크기 15px
- **시간 표시 24시간제** — "오후 2:00" → "14시" 형식으로 변경
- **템플릿 메뉴 전면 교체** — 6개로 확장, 더 흥미롭고 실용적인 제목/내용으로 개선
  - 🌅 기분 좋은 아침 루틴
  - 🔥 집중력 폭발 딥워크
  - 💼 면접 당일 마음 정리
  - 📚 시험 전날 벼락치기
  - 💪 퇴근 후 활력 충전
  - 💡 아이디어 폭발 브레인스토밍
- **"전체 보기" 버튼** — 달력 필터 중일 때 더 눈에 띄게 디자인 개선
- **반응형 레이아웃** — 데스크탑 2컬럼(좌: 입력폼+템플릿 / 우: 명언+달력+일정목록), 모바일 단일 컬럼

### 현재 배포 상태
- GitHub: `main` 브랜치 최신 (모든 작업 푸시 완료)
- Vercel: 자동 배포 완료
- URL: https://ai-todo-manager-plum.vercel.app

---

## 다음 할 일

### 알림 (현재 상태 요약)
- **이미 있음:** 브라우저 `Notification` + `setTimeout` — 시작 30분 전·종료 시각 (앱 탭 열림 전제)
- **선택 과제:** 탭을 닫아도 오게 하려면 Web Push + 서버 Cron 재정비 (유료 플랜 또는 이메일 등)

### 기타
- **이메일 알림 (Vercel Cron + Resend)** — 탭 없이도 받고 싶을 때 검토
- **카카오 알림톡** — 사업자 등록 후 장기

### 수익화 로드맵
1. 무료/유료 템플릿 구분 UI
   - 무료 5개 → `적용` 가능
   - 프리미엄 → `🔒` 잠금 아이콘 + `곧 오픈` 버튼
2. 무료 기본 템플릿 5개로 확장 (현재 3개)
3. **AI 주간 리포트** — 프리미엄 잠금 → 결제 유도
4. **D-Day 위젯** — 시험·면접 카운트다운, 공유 링크 생성 (바이럴)
5. Supabase `templates` 테이블 생성 및 연결
6. 내 템플릿 로컬스토리지 → Supabase DB로 승격 (기기 바꿔도 유지)

---

## 환경 변수 체크리스트

| 변수명 | 용도 | 필요 위치 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 로컬 + Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 키 | 로컬 + Vercel |
| `GROQ_API_KEY` | AI 자동완성 (Groq) | 로컬 + Vercel |
| `GOOGLE_GENERATIVE_AI_API_KEY` | AI fallback (Gemini) | 로컬 + Vercel |
