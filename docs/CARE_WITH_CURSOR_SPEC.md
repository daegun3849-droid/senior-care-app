# Care-with-Cursor 기능 명세서
**노인복지관 어르신 하루 일과 돌봄 앱 — 개발 구현 요건**

---

## 0. 문서 개요

| 항목 | 내용 |
|---|---|
| 앱명 | 노인복지관 어르신 돌봄 (senior-care-app) |
| 기술 스택 | Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase, Vercel AI SDK |
| 주 사용자 | 70대 이상 고령자 |
| 서브 사용자 | 요양보호사, 간호사, 가족 |
| 핵심 원칙 | 극도의 직관성 — 큰 글씨, 명확한 색상 대비, 오작동 방지, 한 화면 한 동작 |

---

## 1. 데이터 모델 및 DB 연동 조건

### 1-1. 기존 테이블 활용

```sql
-- todos 테이블 (일정)
id            uuid PRIMARY KEY
user_id       uuid REFERENCES auth.users
content       text          -- 일정 제목
description   text          -- 메모
start_time    timestamptz   -- 시작 시각
end_time      timestamptz   -- 종료 시각
is_completed  boolean       -- 완료 여부
created_at    timestamptz

-- routines 테이블 (매일 반복 루틴/건강체크)
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
title           text          -- 항목명 (예: 혈압약, 아침 식사)
emoji           text          -- 이모지 (💊, 🍚 등)
sort_order      integer       -- 카테고리·정렬 순서
routine_time    text          -- 수행 예정 시각 (HH:MM)
routine_end_time text         -- 종료 시각 (선택)

-- routine_logs 테이블 (루틴 수행 기록)
id           uuid PRIMARY KEY
user_id      uuid REFERENCES auth.users
routine_id   uuid REFERENCES routines
done_date    date            -- 수행 날짜 (YYYY-MM-DD)
logged_at    timestamptz     -- 실제 체크 시각 (다중 로그 지원)
```

### 1-2. 카테고리 정의 (sort_order 기반)

| sort_order | 카테고리 | 기본 항목 |
|---|---|---|
| 0 ~ 2 | 💊 복약 | 혈압약(08:00), 당뇨약(08:30), 취침 전 약(21:00) |
| 3 ~ 5 | 🍽️ 식사 | 아침 식사(08:00), 점심 식사(12:00), 저녁 식사(18:00) |
| 6 ~ 9 | 🩺 활력징후 | 혈압 측정 아침(07:30), 오후(14:00), 저녁(20:00), 혈당 측정(08:00) |
| 10 ~ 14 | 💧 수분 섭취 | 물 마시기 오전1(09:00) ~ 저녁(19:00) 5회 |
| 15 ~ 17 | 🚶 활동 | 산책·걷기(10:00), 체조·재활(14:30), 낮잠·휴식(13:30) |
| 18 ~ 20 | 🪥 위생 | 양치질 아침(08:30), 저녁(21:00), 세수·씻기(07:00) |
| 21 ~ | 💛 기타 | 기분·컨디션(09:00), 가족 통화(19:00) |

### 1-3. 프론트엔드 상태 관리

```typescript
// 핵심 상태
const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
const [healthLogs, setHealthLogs]     = useState<HealthLog[]>([]);
const [schedules, setSchedules]       = useState<Schedule[]>([]);

// 루틴 체크 토글 (routine_logs INSERT/DELETE)
const handleToggleHealth = async (checkId: string) => {
  // 이미 완료 → 삭제 (done_date + routine_id 매칭)
  // 미완료 → INSERT { routine_id, done_date: todayStr, logged_at: now }
  // 완료 후 confetti() 호출
};

// 루틴 항목 추가
const handleAddCheck = async () => {
  // routines INSERT → setHealthChecks 업데이트
};

// 루틴 항목 삭제
const handleDeleteCheck = async (id: string) => {
  // routine_logs DELETE → routines DELETE → 상태 업데이트
};

// 루틴 시간 수정
const handleCheckTimeSave = async () => {
  // routines UPDATE { routine_time } → 상태 업데이트
};
```

### 1-4. 초기화/중복 방지 로직

```typescript
// insertDefaultHealthChecks: 기존 항목 전체 삭제 후 기본값 삽입
// fetchHealthChecks: 로드 후 중복 감지 → showResetBanner 표시
const hasDuplicates = titleCounts 중 count > 1 이 하나라도 존재;
const isOldStyle    = 모든 emoji가 HEALTH_EMOJIS 에 없음;
if (isOldStyle || hasDuplicates) → 배너 표시 후 사용자 동의 시 초기화
```

---

## 2. 시니어 맞춤형 UX/UI 조건

### 2-1. 디자인 가이드라인

| 요소 | 기준값 | Tailwind 클래스 |
|---|---|---|
| 기본 폰트 | 20px (1.25rem) | `text-xl` |
| 제목 폰트 | 24~28px | `text-2xl`, `text-3xl` |
| 터치 영역 최소 | 56px × 56px | `min-h-14 min-w-14` |
| 체크 버튼 | 52px × 52px 원형 | `w-13 h-13 rounded-full` |
| 색상 배경 | 따뜻한 베이지/스톤 | `bg-stone-100` |
| 강조 색 | 에메랄드 그린 | `bg-emerald-800` |
| 완료 색 | 에메랄드 (배경 전환) | `bg-emerald-600` |
| 경고/알림 | 앰버 | `bg-amber-100` |
| 텍스트 대비 | WCAG AA 이상 | 배경 대비 4.5:1 이상 |

### 2-2. 화면 구성 원칙

- **한 화면, 한 동작**: 탭 3개(오늘 / 말하기 / 일정)로만 분리
- **오작동 방지**: 삭제·초기화는 반드시 confirm 다이얼로그 2단계 확인
- **빈 상태 UI**: 항목 없을 때 안내 문구 + 추가 버튼 노출
- **로딩 UI**: 데이터 조회 중 스피너 또는 스켈레톤 표시
- **에러 UI**: 실패 시 "다시 시도" 버튼 포함 안내 표시

### 2-3. 폭죽(confetti) 보상 로직

```typescript
// 루틴 항목 체크 완료 시
import confetti from "canvas-confetti";

const fireConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"],
  });
};

// handleToggleHealth 내 INSERT 성공 후 호출
// 일정 완료(is_completed: true) 시도 동일하게 호출
```

### 2-4. 건강체크 항목 추가(+) UI

- 헤더 영역 우측에 `+` 버튼 상시 노출
- 탭: 이모지 선택 / 항목명 입력 / 시간 설정
- 이모지 목록: 💊🍚🍱🍲🩺🩸💧🚶🧘🛌🪥🛁😊📞 제공 (탭 or 직접 입력)
- 저장 시 `sort_order = max(sort_order) + 1` 으로 기타 카테고리 하단 삽입

---

## 3. AI 기반 일정 자동 생성 로직

### 3-1. 입력 조건

```typescript
// POST /api/ai-schedule
interface AIScheduleInput {
  conditions: string[];    // 기저질환 (예: ["고혈압", "당뇨"])
  medications: string[];   // 복약 목록 (예: ["혈압약 08:00", "당뇨약 08:30"])
  preferences: string;     // 선호 활동 (예: "오전 산책, 오후 낮잠 선호")
  centerPrograms: string[]; // 복지관 프로그램 (예: ["화요일 노래교실 14:00"])
  date: string;            // 생성 대상 날짜 YYYY-MM-DD
}
```

### 3-2. AI 프롬프트 설계

```
System:
당신은 노인복지관 어르신의 건강한 하루 일과를 설계하는 전문 의료 보조 AI입니다.
70대 이상 고령자 대상으로, 복약 순응도·수분 섭취·활동량을 최적화한 일과를 설계합니다.

User:
기저질환: {conditions}
복약 정보: {medications}
선호 사항: {preferences}
오늘 복지관 프로그램: {centerPrograms}

아래 JSON 배열 형식으로 하루 일과 10~15개를 생성하세요.
반드시 JSON만 출력하고, 설명 문장 없이 출력합니다.

형식:
[
  { "title": "항목명", "start_time": "YYYY-MM-DDTHH:mm:ss+09:00",
    "end_time": "YYYY-MM-DDTHH:mm:ss+09:00", "description": "간략 안내" }
]
```

### 3-3. 출력 처리 로직

```typescript
// 응답 JSON 파싱 → todos 테이블 bulk INSERT
const parsed: AIScheduleItem[] = JSON.parse(aiResponse);
const inserts = parsed.map(item => ({
  user_id: userId,
  content: item.title,
  description: item.description,
  start_time: item.start_time,
  end_time: item.end_time,
  is_completed: false,
}));
await supabase.from("todos").insert(inserts);
```

### 3-4. 음성 입력 연동

```typescript
// Web Speech API → AI 파싱 → todos INSERT
// 발화 예: "오늘 오후 세시에 물리치료 받아야 해"
// POST /api/ai-parse-todo → { title, start_time, end_time }
```

---

## 4. 알림 및 안전망 구축

### 4-1. 가족·담당자 즉시 알림 (현재 구현)

```typescript
// 가족 공유 메시지 생성 → SMS sms: 링크 or 클립보드 복사
const buildFamilyMessage = (checks, logs, schedules, todayStr) => {
  // 완료 항목 목록, 미완료 항목 목록, 오늘 일정 포함
  // SMS/카카오 공유 가능한 텍스트 형태
};
```

### 4-2. 미수행 알림 트리거 (구현 예정)

```
트리거 조건:
1. routine_time 이 현재 시각보다 30분 이상 경과
2. 해당 routine_id 의 done_date = today 인 routine_logs 레코드 없음
3. 항목 카테고리가 [복약, 활력징후] 인 경우 우선 알림

알림 채널:
- Web Push (service worker + /api/push-notify 엔드포인트)
- 가족 SMS (sms: 딥링크)
```

### 4-3. Web Push 구현 조건

```typescript
// /api/push-subscribe  → 구독 정보 DB 저장
// /api/push-notify     → web-push 라이브러리로 알림 발송
// 클라이언트: navigator.serviceWorker + Notification.requestPermission()
// 페이로드: { title: "복약 알림", body: "혈압약을 아직 드시지 않으셨어요!" }

// 스케줄링: Vercel Cron Job (vercel.json crons 설정)
// 주기: 매 30분 → 미수행 복약/활력징후 항목 스캔
```

### 4-4. 미구현 알림 로드맵

| 우선순위 | 기능 | 구현 방식 |
|---|---|---|
| P1 | 복약 미수행 Web Push | Vercel Cron + web-push |
| P2 | 보호자 앱 뷰 (읽기 전용) | 별도 `/caregiver` 라우트 |
| P3 | 카카오 알림톡 | Kakao Biz API |
| P4 | SMS 자동 발송 | 문자 발송 API (NHN Cloud 등) |

---

## 5. 인지 자극 및 놀이 요소 (확장 기획)

### 5-1. 오늘의 퀴즈 카드

- 매일 오전 9시 화면 상단에 간단한 인지 퀴즈 1문제 노출
- 유형: 속담 빈칸 채우기, 사진 보고 이름 맞추기, 계절 그림 색칠하기
- 정답 시 confetti + 칭찬 메시지 표시

```typescript
// /api/ai-quiz → 오늘 날짜 seed 기반 AI 퀴즈 생성
// 문제, 보기 4개, 정답, 해설 JSON 반환
```

### 5-2. 건강 달력 (월간 완료율)

- 하단에 미니 캘린더: 날짜별 완료율을 색상(연-진한 에메랄드)으로 표시
- 클릭 시 해당 날짜 상세 기록 조회

### 5-3. 오늘 날씨·건강 팁

- 외부 날씨 API 연동 → 현재 날씨 + 어르신 맞춤 건강 팁 표시
- 예: "오늘 미세먼지가 많아요. 실내 운동을 권장합니다."

---

## 6. 현재 구현 상태 체크리스트

| 기능 | 상태 | 위치 |
|---|---|---|
| 건강체크 루틴 CRUD | ✅ 완료 | `app/page.tsx` |
| 카테고리별 루틴 표시 | ✅ 완료 | `app/page.tsx` CATEGORY_RANGES |
| 루틴 항목 추가(+) 버튼 | ✅ 완료 | `app/page.tsx` handleAddCheck |
| 루틴 항목 삭제 버튼 | ✅ 완료 | `app/page.tsx` handleDeleteCheck |
| 루틴 시간 수정 | ✅ 완료 | `app/page.tsx` handleCheckTimeSave |
| 중복 감지 자동 배너 | ✅ 완료 | `app/page.tsx` hasDuplicates |
| confetti 보상 | ✅ 완료 | `app/page.tsx` canvas-confetti |
| 음성 입력 일정 저장 | ✅ 완료 | `app/page.tsx` Web Speech API |
| AI 일정 생성 | ✅ 완료 | `/api/ai-parse-todo` |
| 가족 공유 메시지 | ✅ 완료 | `app/page.tsx` buildFamilyMessage |
| Web Push 구독/발송 | ✅ 완료 | `/api/push-subscribe`, `/api/push-notify` |
| Vercel Cron 미수행 알림 | ⬜ 미구현 | — |
| 인지 자극 퀴즈 | ⬜ 미구현 | — |
| 보호자 전용 뷰 | ⬜ 미구현 | — |
| 건강 달력 | ⬜ 미구현 | — |

---

## 7. 다음 개발 우선순위 (Sprint 계획)

### Sprint 1 — 안정화 (현재)
- [x] 중복 루틴 항목 자동 감지 및 초기화
- [x] 루틴 항목 + 추가 / 삭제 기능
- [ ] `routine_logs` 에 `logged_at` 컬럼 추가 (다중 체크 지원)

### Sprint 2 — 알림 강화
- [ ] Vercel Cron Job: 복약 미수행 30분 후 Web Push 자동 발송
- [ ] 가족 알림 메시지 자동화 (매일 저녁 8시)

### Sprint 3 — 인지 자극
- [ ] AI 일일 퀴즈 카드 (속담 / 그림 맞추기)
- [ ] 건강 완료율 미니 달력 표시

### Sprint 4 — 보호자 뷰
- [ ] `/caregiver/[userId]` 읽기 전용 페이지
- [ ] QR 코드로 보호자에게 링크 공유

---

*Care-with-Cursor | 노인복지관 어르신 돌봄 앱 기획 명세서 v2.0*
*최종 수정: 2026-05-09*
