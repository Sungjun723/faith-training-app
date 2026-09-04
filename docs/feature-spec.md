# Feature Spec

## 1. API 엔드포인트 목록

### Auth
```
POST   /api/auth/login          { email, password } → 쿠키 세팅
POST   /api/auth/logout
GET    /api/auth/me             → 현재 로그인 사용자 정보
```

### Training (일별/주간)
```
GET    /api/training/month?year=&month=      → 해당 월 전체 record 배열 (캘린더 렌더용, 1회 호출)
PUT    /api/training/daily/:date             → upsert { meditation_completed?, prayer_minutes?, reading_pages? }
                                                (일요일 + meditation_completed=true 요청 시 400 반환)
GET    /api/training/weekly/:weekId
PUT    /api/training/weekly/:weekId          → upsert 주간 항목 체크
GET    /api/training/weekly/:weekId/summary  → 계산된 진행률/통계 (services/weeklyProgress.ts 사용)
```

### Profile
```
GET    /api/profile/me   → 이름/이메일/가입일/이번주·이번달 진행률/암송 진행상황
```

### Memorization (member)
```
GET    /api/memorization/weeks                     → 주차 목록 + 각 주차별 신규/누적 구절 수 + 현재 주차
GET    /api/memorization/passages?uptoWeekId=       → 누적 구절 목록
POST   /api/memorization/sessions                   → { scopeWeekId, testType } → 세션 생성, in_progress 세션 있으면 재사용
GET    /api/memorization/sessions/:id
POST   /api/memorization/sessions/:id/results       → { passageId, userInput? } → 채점 후 결과 저장
POST   /api/memorization/sessions/:id/complete      → 세션 완료 처리 + average_score 계산
GET    /api/memorization/sessions?status=completed  → 이력 조회
```

### Admin
```
GET    /api/admin/members
POST   /api/admin/members                     → 신규 회원 추가 { name, email, password, role? }
GET    /api/admin/members/:id                 → 일별/주간/암송 상세
PATCH  /api/admin/members/:id/password        → 관리자가 회원 비밀번호 직접 재설정 { newPassword }
PATCH  /api/admin/members/:id/status          → active/inactive 전환

GET    /api/admin/weeks
POST   /api/admin/weeks                       → 새 주차 생성

GET    /api/admin/memorization/passages?weekId=
POST   /api/admin/memorization/passages
PUT    /api/admin/memorization/passages/:id
DELETE /api/admin/memorization/passages/:id
PATCH  /api/admin/memorization/passages/reorder   → [{ id, display_order }]

GET    /api/admin/statistics
```

모든 `admin/*`는 `requireAuth + requireAdmin` 미들웨어 통과 필요. 모든 회원용 API는 `req.user.id`만 사용 — 요청 파라미터로 다른 사용자 데이터 조회 불가.

---

## 2. 주간 진행률 계산 규칙 (`services/weeklyProgress.ts`)

```text
input: userId, weekId

Daily 항목 (월~토, 총 6일):
  meditationScore = (해당 주 meditation_completed=true 일수) / 6

Prayer:
  DAILY_PRAYER_TARGET_MINUTES = 20   (일일 목표이자 입력 상한)
  WEEKLY_PRAYER_TARGET_MINUTES = 20 × 6 = 120   (월~토 기준)
  totalPrayerMinutes = SUM(prayer_minutes) for the week
  averagePrayerMinutes = totalPrayerMinutes / 6   (통계 표시용)
  prayerScore = min(totalPrayerMinutes / WEEKLY_PRAYER_TARGET_MINUTES, 1)

Reading:
  targetPages = 2 × 6 = 12
  actualPages = SUM(reading_pages) for the week
  readingScore = min(actualPages / targetPages, 1)

Weekly 항목 (7개 각 1점):
  inductive_study_completed
  book_reading_completed
  preview_completed
  sunday_service_completed
  friday_service_completed (청금 = 청년금요집회)
  small_group_completed
  memorization_completed
  weeklyScore = (체크된 개수) / 7

전체 진행률:
  overallProgress = (meditationScore + prayerScore + readingScore + weeklyScore) / 4 × 100
```

> `prayer_minutes` 입력값은 API에서 0~20 범위로 검증하며, 20을 초과하는 값은 400 오류로 거부합니다.

---

## 3. 암송 채점 로직 (`services/memorizationDiff.ts`)

### 3-1. 정규화 (Normalize)
채점 전 다음을 무시하도록 정규화:
- 연속 공백 → 단일 공백
- 앞뒤 공백 제거
- 줄바꿈 → 공백
- 일반 문장부호(`. , ! ? " ' ” “`) 제거
- 단, 실제 단어 차이(예: "하나님이" vs "하나님은")는 오답으로 유지

### 3-2. Diff 알고리즘
단어 단위 시퀀스 정렬(LCS 기반 diff)을 사용해 `correctText`와 `userText`를 비교.

```ts
type DiffItem =
  | { type: 'correct'; text: string }
  | { type: 'wrong'; expected: string; actual: string }
  | { type: 'missing'; expected: string };

function diffMemorization(correctText: string, userText: string): DiffItem[]
```

- LCS로 공통 단어(순서 보존)를 찾고, 그 사이사이 위치를 `wrong`(같은 위치에 다른 단어가 있는 경우) 또는 `missing`(정답에는 있는데 사용자 입력에는 없는 경우)으로 분류
- UI 색상 규칙: `correct` = 기본 텍스트, `wrong`/`missing` = 빨간색 (문서 24번 그대로)

### 3-3. 테스트 유형별 처리

| 유형 | 채점 여부 | score 계산 |
|---|---|---|
| 전체 암송 (full_recite) | 채점 안 함 | score = NULL, "암송 완료" 버튼 클릭 시 완료 처리 |
| 빈칸 암송 (fill_blank) | 빈칸 단위 비교 | `맞은 빈칸 수 / 전체 빈칸 수 × 100` |
| 전체 입력 (full_input) | 단어 단위 diff | `correct 단어 수 / 전체 단어 수 × 100` |

- 빈칸 생성 시 **어떤 단어가 빈칸이었는지 `test_snapshot`에 저장** → 재현/분석 가능 (문서 22, 28번 요구사항)
- 빈칸 위치는 기본적으로 **고정 규칙**(예: 매 N번째 단어, 또는 관리자가 구절 등록 시 지정 가능하도록 확장 여지)으로 시작하고, 랜덤 방식은 v2 확장 항목으로 분리 제안

---

## 4. 캘린더 UI 규칙

- 일요일 날짜 셀: 한 구절 묵상 체크박스 자체를 렌더링하지 않음 (숨김 처리, disabled 텍스트가 아니라 항목 자체 제외)
- 기도: 숫자 입력 (`<input type="number" inputmode="numeric" min="0" max="20">`), 분 단위, blur 또는 debounce(500ms) 후 저장. 목표이자 상한은 하루 20분 — 20 도달 시 UI에 "목표 달성" 표시
- 통독: 체크박스(2페이지 완료) 기본 + 실제 페이지 수 직접 입력도 지원 (체크 시 자동으로 2 저장, 직접 숫자 입력 시 그 값 저장)
- 주간 항목(귀납/독서/예습/예배/순모임/암송)은 날짜 셀이 아니라 "이번 주" 패널에서 한 번만 체크 가능하도록 UI 분리

## 5. 저장/피드백 규칙

- 모든 체크/입력은 즉시 저장 (자동저장), 성공 시 작은 토스트 "✓ 저장되었습니다"
- 실패 시 UI를 이전 값으로 rollback + 토스트 "저장하지 못했습니다. 다시 시도해주세요."
- 네트워크 재시도는 1회 자동 재시도 후 실패 시 rollback

## 6. 접근성 체크리스트 (구현 시 반영)

- 모든 체크박스: `<input type="checkbox">` + 연결된 `<label>` (터치 영역 최소 44×44px)
- 기도 시간 입력: `aria-label="기도 시간(분)"`
- 캘린더 날짜 셀: `role="button"`, `aria-pressed` 또는 `aria-selected`로 완료 상태 전달
- 포커스 스타일: `.designrules`의 spring 트랜지션과 별개로 `:focus-visible` outline은 항상 유지 (모션 연출이 접근성을 가려서는 안 됨)
