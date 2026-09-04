# User Flow & Routes

## 라우트 표

| Path | 접근 권한 | 설명 |
|---|---|---|
| `/login` | 비로그인 전용 (로그인 시 자동 redirect) | 로그인 |
| `/dashboard` | member, admin | 홈 |
| `/calendar` | member, admin | 월간 캘린더 + 일별 체크 |
| `/weekly-summary` | member, admin | (구버전 호환용 단독 페이지) 주간 결산 — 실제 사용은 `/calendar`에 통합됨 (query: `?week=weekId`) |
| `/profile` | member, admin | 내 프로필 |
| `/memorization` | member, admin | 암송 테스트 (범위선택→방식선택→진행→결과) |
| `/admin` | admin only | 관리자 홈 (전체 현황 요약) |
| `/admin/members` | admin only | 회원 목록/상세 |
| `/admin/memorization` | admin only | 암송 구절/주차 관리 |
| `/admin/statistics` | admin only | 전체 통계 |

- 비로그인 사용자가 `/admin/*` 포함 임의 URL 접근 시 → `/login`으로 redirect
- 일반 회원이 `/admin/*` 접근 시 → `/dashboard`로 redirect (실제 차단은 서버 미들웨어가 담당, 프론트 가드는 UX용)
- 로그인 성공 시: `role='admin'`이면 `/admin`, `role='member'`이면 `/dashboard`로 이동

## 핵심 화면 흐름

```text
[로그인]
   │ 성공
   ▼
[Dashboard] ── 오늘의 훈련 요약, 이번 주 진행률, 암송 바로가기
   │
   ├─▶ [캘린더] ── 날짜 클릭 ──▶ [일별 체크 패널]
   │                │                 ├─ 한 구절 묵상 (일요일 비활성)
   │                │                 ├─ 기도 시간 입력
   │                │                 └─ 통독 페이지 체크
   │                │
   │                └─ "이번 주" 선택 ──▶ [주간 결산]
   │                                        ├─ Daily 집계 (월~토)
   │                                        ├─ Prayer 통계
   │                                        ├─ Reading 진행률
   │                                        ├─ Weekly 항목 체크
   │                                        └─ 전체 진행률 바
   │
   ├─▶ [암송 테스트]
   │       Step 1: 범위 선택 (1주차 / 2주차 / ... / N주차까지 누적)
   │            │
   │            ▼
   │       Step 2: 테스트 방식 선택 (전체 암송 / 빈칸 암송 / 전체 입력)
   │            │
   │            ▼
   │       Step 3: 구절별 순차 진행 (진행률 표시 N/M)
   │            │  각 구절 완료 시 자동 다음 이동
   │            ▼
   │       Step 4: 구절별 결과 (틀린 부분 diff 표시)
   │            │
   │            ▼
   │       Step 5: 최종 결과 (평균 점수, 정답/복습 필요 개수)
   │                → [다시 테스트] [결과 확인]
   │
   └─▶ [Profile] ── 이름/이메일/이번 주·이번 달 진행률/암송 진행 상황

[Admin] (admin만 진입 가능)
   ├─▶ [회원 관리] ── 목록 → 상세(일별/주간/암송/누적 진행률)
   ├─▶ [암송 관리] ── 주차별 구절 목록 → 추가/수정/삭제/순서변경
   └─▶ [통계] ── 전체 회원 훈련 현황
```

## 이탈/재접속 시나리오

- 캘린더 체크: optimistic update로 즉시 반영되므로 새로고침해도 서버에 저장된 값 그대로 표시됨
- 암송 테스트 중 이탈: `memorization_test_sessions.status='in_progress'` 세션이 남아있으면, `/memorization` 재진입 시 "이어서 테스트하시겠습니까?" 안내
