# Database Schema (MySQL 8 / Drizzle ORM)

> 이 문서는 여러 차례의 요구사항 변경(그룹 기반 주차, 관리자 비밀번호 재설정 등)을
> 반영해 현재 스키마 기준으로 다시 정리한 버전이다.

## ERD 개요

```text
groups ──< users ──< training_records
                 └─< weekly_training_records (week_number: 그룹 시작일 기준 계산값)
users ──< memorization_test_sessions ──< memorization_results >── memorization_passages
users ──< audit_logs
```

`memorization_passages`는 그룹과 무관하게 **순수 주차 번호(week_number)**로만 관리된다.
그룹 A든 B든 "3주차 구절"은 항상 동일하다. 반면 "지금이 몇 주차인가"는 각 회원이
속한 그룹의 시작일을 기준으로 매번 계산되는 값이며, 별도 테이블에 저장하지 않는다
(services/groupWeeks.ts 참고).

---

## groups (그룹 — 시작일을 공유하는 학생 단위)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(100) | NOT NULL, UNIQUE — 예: "그룹 A" |
| start_date | DATE | NOT NULL — 이 그룹의 "1주차" 시작일. 요일 제한 없음 (목/일 등 자유) |
| created_at / updated_at | TIMESTAMP | |

- 관리자가 그룹 관리 화면에서 생성/수정한다.
- 그룹에 속한 회원이 1명이라도 있으면 삭제할 수 없다 (API에서 차단).

---

## users

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | ENUM('member','admin') | NOT NULL, DEFAULT 'member' |
| group_id | INT | FK → groups.id, NULL 허용 (컬럼 자체는 nullable) |
| profile_image | VARCHAR(500) | NULL |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| created_at / updated_at | TIMESTAMP | |

- **일반 회원(role='member')은 그룹이 필수** — DB 컬럼은 nullable이지만, 관리자가 회원을
  생성할 때 API(`POST /api/admin/members`)에서 그룹 미선택 시 400 에러로 막는다.
- 관리자(role='admin') 계정은 그룹이 없어도 된다.
- 비밀번호는 이메일 재설정 없이 **관리자가 회원 상세 화면에서 직접 재설정**한다
  (`PATCH /api/admin/members/:id/password`).

---

## training_records (일별 훈련)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users.id |
| record_date | DATE | NOT NULL |
| meditation_completed | BOOLEAN | NOT NULL, DEFAULT FALSE |
| prayer_minutes | INT | NOT NULL, DEFAULT 0 — **일 최대 20분** (0~20 범위, API 레벨 검증) |
| reading_pages | INT | NOT NULL, DEFAULT 0 |
| created_at / updated_at | TIMESTAMP | |

- **UNIQUE (user_id, record_date)** — 같은 날짜 중복 레코드 방지
- 일요일(`DAYOFWEEK(record_date) = 1`)에는 `meditation_completed`를 서버가 항상 거부

---

## weekly_training_records (주간 훈련)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users.id |
| week_number | INT | NOT NULL — **해당 회원이 속한 그룹의 시작일 기준으로 계산된 주차 번호** |
| inductive_study_completed | BOOLEAN | DEFAULT FALSE — 한 주 귀납 |
| book_reading_completed | BOOLEAN | DEFAULT FALSE — 독서 |
| preview_completed | BOOLEAN | DEFAULT FALSE — 예습 |
| sunday_service_completed | BOOLEAN | DEFAULT FALSE — 주일 예배 |
| friday_service_completed | BOOLEAN | DEFAULT FALSE — **UI 라벨은 "청금"** (청년금요집회 = 금요예배) |
| small_group_completed | BOOLEAN | DEFAULT FALSE — 순모임 |
| memorization_completed | BOOLEAN | DEFAULT FALSE — 암송훈련 완료 체크 |
| created_at / updated_at | TIMESTAMP | |

- **UNIQUE (user_id, week_number)** — 같은 회원의 같은 주차 중복 레코드 방지
- 이전 버전에서는 전역 공유 `weeks` 테이블의 `week_id`를 참조했으나, 그룹별로 시작일이
  달라지면서 **그룹 기준 계산값인 `week_number`를 직접 저장**하는 방식으로 변경했다.

### 주차(week_number) 계산 방식 — `services/groupWeeks.ts`

```text
anchor = 그룹의 start_date (요일 제한 없음)
주어진 날짜 D에 대해:
  weekNumber = floor((D - anchor) / 7일) + 1   (최소 1로 고정)
weekNumber에 대응하는 날짜 범위:
  weekStart = anchor + (weekNumber - 1) * 7일
  weekEnd   = weekStart + 6일
```

일요일 제외 로직은 "구간의 몇 번째 자리인지"가 아니라 **그 7일 구간 안에서 실제 달력상
일요일에 해당하는 날짜를 찾아 제외**하는 방식으로 일반화되어 있다. 연속된 7일에는
항상 정확히 하나의 일요일이 존재하므로, 그룹 시작 요일이 월요일이든 목요일이든
일요일이든 상관없이 정확히 6일(일요일 제외)이 계산된다.

---

## memorization_passages (암송 구절 — 그룹과 무관, 주차 번호로만 관리)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| week_number | INT | NOT NULL — 순수 정수. 그룹과 연결되지 않는다 |
| book | VARCHAR(50) | NOT NULL — 예: 요한복음 |
| chapter_verse | VARCHAR(20) | NOT NULL — 예: 3:16 |
| content | TEXT | NOT NULL |
| display_order | INT | NOT NULL, DEFAULT 0 |
| created_at / updated_at | TIMESTAMP | |

- "N주차까지 누적 구절 수"는 `SELECT COUNT(*) FROM memorization_passages WHERE week_number <= N`으로 계산한다.
- 그룹 A의 회원이 보는 "3주차까지 누적"과 그룹 B의 회원이 보는 "3주차까지 누적"은
  실제 달력 날짜가 다르더라도 **완전히 동일한 구절 목록**이다.

---

## memorization_test_sessions (테스트 세션)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users.id |
| scope_week_number | INT | NOT NULL — "N주차까지 누적" 선택값 (요청 당시 그 회원의 현재 주차 이하) |
| test_type | ENUM('full_recite','fill_blank','full_input') | NOT NULL |
| total_passages | INT | NOT NULL |
| average_score | DECIMAL(5,2) | NULL |
| status | ENUM('in_progress','completed') | NOT NULL, DEFAULT 'in_progress' |
| started_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| completed_at | TIMESTAMP | NULL |

- 진행 중인 세션을 재사용하는 것은 **범위(scope_week_number)와 테스트 방식(test_type)이
  모두 일치할 때만** 허용한다. 다르면 이전 세션은 완료 처리하고 새 세션을 만든다
  (다른 방식으로 다시 시작했는데 이전 세션이 섞여 채점 결과가 어긋나던 버그의 수정).

## memorization_results (구절별 결과)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| session_id | INT | NOT NULL, FK → memorization_test_sessions.id |
| passage_id | INT | NOT NULL, FK → memorization_passages.id |
| score | DECIMAL(5,2) | NULL |
| correct_count | INT | DEFAULT 0 |
| wrong_count | INT | DEFAULT 0 |
| missing_count | INT | DEFAULT 0 |
| test_snapshot | JSON | NULL — 빈칸 위치, 사용자 입력, diff 결과 등 재현용 |
| completed_at | TIMESTAMP | NULL |

`test_snapshot` 예시 (부분 빈칸 테스트):
```json
{
  "blanks": ["세상을", "믿는"],
  "answers": ["세상은", "믿는"]
}
```
빈칸 채점 결과 화면은 이 `blanks`/`answers`를 이용해 틀리거나 빠뜨린 빈칸만
빨간색 + 정답 병기로 표시한다.

---

## app_settings (전역 설정)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| blank_interval | INT | NOT NULL, DEFAULT 3 — 빈칸 암송 간격(몇 단어마다 1칸), 관리자가 2~10 사이로 조정 |
| updated_at | TIMESTAMP | |

## audit_logs (관리자 작업 이력, 확장용)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| admin_id | INT | NOT NULL, FK → users.id |
| action | VARCHAR(100) | NOT NULL |
| target_table | VARCHAR(100) | NULL |
| target_id | INT | NULL |
| detail | JSON | NULL |
| created_at | TIMESTAMP | |

- 스키마만 준비되어 있고 실제 기록 로직은 아직 연결되지 않음 (확장 여지)

---

## 무결성 규칙 요약

1. `training_records`: `(user_id, record_date)` UNIQUE
2. `weekly_training_records`: `(user_id, week_number)` UNIQUE
3. 일요일 묵상 체크 금지는 API 서비스 레이어에서 검증
4. `prayer_minutes`는 0~20 범위를 벗어나면 API가 400 반환
5. 일반 회원 생성 시 `group_id` 누락이면 API가 400 반환 (관리자는 예외)
6. 그룹 삭제는 소속 회원이 없을 때만 허용
