# Database Schema (MySQL 8 / Drizzle ORM)

## ERD 개요

```text
users ──< training_records
users ──< weekly_training_records >── weeks
weeks ──< memorization_passages
users ──< memorization_test_sessions ── weeks (scope)
memorization_test_sessions ──< memorization_results >── memorization_passages
users ──< audit_logs
```

`weeks`를 훈련 주차와 암송 주차가 **공유하는 단일 기준 테이블**로 사용합니다. 이렇게 하면 "몇 주차까지 암송했는가"와 "이번 주 훈련 체크"가 항상 같은 주차 정의를 참조합니다.

---

## users

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | ENUM('member','admin') | NOT NULL, DEFAULT 'member' |
| profile_image | VARCHAR(500) | NULL |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

- 비밀번호는 bcrypt 해시로만 저장 (평문/암호화 저장 금지)
- `status='inactive'`는 관리자가 휴면/탈퇴 처리 시 사용 (레코드는 삭제하지 않음 — 데이터 무결성)

---

## weeks

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| week_number | INT | NOT NULL, UNIQUE |
| week_start | DATE | NOT NULL, UNIQUE (월요일 기준) |
| week_end | DATE | NOT NULL (일요일 기준) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

- 관리자가 새 주차를 미리 생성하거나, 서버에서 배치로 자동 생성 (예: 매주 월요일 크론 또는 요청 시 lazy 생성)
- `week_number`는 1부터 순증하는 정수 — 암송 누적 계산의 기준

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
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

- **UNIQUE (user_id, record_date)** — 같은 날짜 중복 레코드 방지 (문서 43번 요구사항)
- 일요일(`DAYOFWEEK(record_date) = 1`)에는 `meditation_completed`를 서버에서 항상 무시/거부 — API 레벨에서 검증 (클라이언트 비활성화만으로는 보안 경계가 아님)
- `reading_pages`는 하루 목표 2페이지 기준. 값 자체는 자유 입력(확장 대비), 진행률 계산 시 목표치 대비로 환산

---

## weekly_training_records (주간 훈련)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users.id |
| week_id | INT | NOT NULL, FK → weeks.id |
| inductive_study_completed | BOOLEAN | DEFAULT FALSE — 한 주 귀납 |
| book_reading_completed | BOOLEAN | DEFAULT FALSE — 독서 |
| preview_completed | BOOLEAN | DEFAULT FALSE — 예습 |
| sunday_service_completed | BOOLEAN | DEFAULT FALSE — 주일 예배 |
| friday_service_completed | BOOLEAN | DEFAULT FALSE — **UI 라벨은 "청금"** (청년금요집회 = 금요예배. 컬럼명은 의미가 명확하도록 `friday_service_completed`로 지정, 화면에는 "청금"으로 표시) |
| small_group_completed | BOOLEAN | DEFAULT FALSE — 순모임 |
| memorization_completed | BOOLEAN | DEFAULT FALSE — 암송훈련 완료 체크 (암송 테스트 점수와는 별개) |
| created_at / updated_at | TIMESTAMP | |

- **UNIQUE (user_id, week_id)** — 같은 주 중복 레코드 방지

---

## memorization_passages (암송 구절)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| week_id | INT | NOT NULL, FK → weeks.id (몇 주차에 새로 추가된 구절인지) |
| book | VARCHAR(50) | NOT NULL — 예: 요한복음 |
| chapter_verse | VARCHAR(20) | NOT NULL — 예: 3:16 |
| content | TEXT | NOT NULL |
| display_order | INT | NOT NULL, DEFAULT 0 |
| created_at / updated_at | TIMESTAMP | |

- "N주차까지 누적 구절 수"는 하드코딩된 `week_number × 2`가 아니라 **`SELECT COUNT(*) FROM memorization_passages WHERE week_id IN (해당 주차까지의 weeks.id)`** 로 계산 (문서 31번 요구사항 반영)

---

## memorization_test_sessions (테스트 세션)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users.id |
| scope_week_id | INT | NOT NULL, FK → weeks.id — "N주차까지 누적" 선택값 |
| test_type | ENUM('full_recite','fill_blank','full_input') | NOT NULL |
| total_passages | INT | NOT NULL |
| average_score | DECIMAL(5,2) | NULL (전체암송 모드는 채점 없음 → NULL) |
| status | ENUM('in_progress','completed') | NOT NULL, DEFAULT 'in_progress' |
| started_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| completed_at | TIMESTAMP | NULL |

- `status='in_progress'`인 세션은 문서 32번 "테스트 중 이탈 시 임시 저장" 요구사항의 근거 데이터 — 재접속 시 미완료 세션을 이어서 진행 가능

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
| test_snapshot | JSON | NULL — 빈칸 위치, 사용자 입력 원문, diff 결과 등 재현용 |
| completed_at | TIMESTAMP | NULL |

- 세션과 구절별 결과를 분리 저장 → 문서 32번 "틀린 구절만 테스트" 기능을 이후 `WHERE score < 100`(또는 wrong/missing > 0) 조회로 쉽게 확장 가능
- `test_snapshot` JSON 예시 (부분 빈칸 테스트):
```json
{
  "blanks": [
    { "position": 1, "expected": "세상을" },
    { "position": 4, "expected": "믿는" }
  ],
  "userInput": ["세상은", "믿는"],
  "diff": [
    { "type": "wrong", "expected": "세상을", "actual": "세상은" },
    { "type": "correct", "text": "믿는" }
  ]
}
```

---

## app_settings (전역 설정)

| column | type | 제약 |
|---|---|---|
| id | INT AUTO_INCREMENT | PK |
| blank_interval | INT | NOT NULL, DEFAULT 3 — 빈칸 암송에서 몇 단어마다 하나를 빈칸으로 만들지 (관리자가 2~10 사이로 조정 가능) |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

- 단일 행만 유지 (앱 최초 요청 시 lazy하게 1행 생성)
- 관리자 화면(암송 구절 관리 페이지 상단)에서 조정 가능

## password_reset_tokens (비밀번호 재설정)

~~이메일 기반 재설정은 채택하지 않기로 했습니다.~~ 관리자가 회원 상세 화면에서 새 비밀번호를 직접 입력해 재설정하는 방식(`PATCH /api/admin/members/:id/password`)으로 대체했습니다. 별도 테이블이 필요 없습니다.

## audit_logs (관리자 작업 이력, 확장용)

- 필수 기능은 아니지만 향후 감사 추적을 위해 스키마만 미리 준비 (구현은 관리자 CRUD 완료 후 선택적으로 진행 제안)

---

## 무결성 규칙 요약

1. `training_records`: `(user_id, record_date)` UNIQUE
2. `weekly_training_records`: `(user_id, week_id)` UNIQUE
3. 모든 FK는 `ON DELETE RESTRICT` 기본 (사용자 삭제 시 훈련 기록이 함께 사라지지 않도록 — 대신 `users.status='inactive'` 사용을 권장)
4. 일요일 묵상 체크 금지는 **API 서비스 레이어에서 검증** (DB CHECK 제약은 MySQL 버전 호환성 이슈로 애플리케이션 레벨 검증을 우선)
5. `prayer_minutes`는 0~20 범위를 벗어나는 값이 들어오면 API가 400 반환 (일일 목표이자 상한이 20분)
