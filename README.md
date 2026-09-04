# 신앙훈련 노트

교회/소그룹 구성원이 매일 신앙훈련을 체크하고, 주간 결산을 확인하며, 누적 암송 구절을 테스트하는 웹 애플리케이션.

## 기술 스택

- **Frontend**: Vue 3 + Vite + TypeScript + Pinia + Vue Router
- **Backend**: Node.js 20 + Express + TypeScript
- **Database**: MySQL 8 + Drizzle ORM
- **배포**: Hostinger Business Web Hosting (Node.js Apps)

자세한 설계 배경은 `docs/architecture.md`, `docs/database-schema.md`, `docs/user-flow.md`, `docs/feature-spec.md`를 참고.

---

## 로컬 개발 환경 설정

### 1. 사전 준비

- Node.js 20.x
- 로컬 또는 원격 MySQL 8 인스턴스

### 2. 설치

```bash
git clone <repository-url>
cd <repository>
npm install          # 루트에서 client/server workspace 모두 설치됨
```

### 3. 환경변수 설정

```bash
cp server/.env.example server/.env
# server/.env 파일을 열어 DB 접속 정보와 JWT_SECRET을 실제 값으로 채운다.
```

### 4. 데이터베이스 준비

```bash
cd server
npx drizzle-kit generate   # 스키마 변경 시 마이그레이션 파일 생성 (이미 0000_*.sql 존재)
npm run db:migrate          # 마이그레이션 적용
npm run db:seed             # 초기 관리자 계정 + 샘플 암송 구절 생성
```

시드 스크립트 실행 후 콘솔에 출력되는 관리자 이메일/비밀번호로 로그인한다. 이후 회원의 비밀번호를 잊어버린 경우, 관리자가 "관리자 > 회원 관리 > 회원 상세" 화면에서 새 비밀번호를 직접 입력해 재설정할 수 있다 (이메일 발송 없이 즉시 반영).

### 5. 개발 서버 실행

터미널 2개로 각각 실행:

```bash
npm run dev:server   # http://localhost:3000 (API)
npm run dev:client   # http://localhost:5173 (Vite dev server, /api는 3000으로 proxy)
```

---

## 프로덕션 빌드

```bash
npm run build   # client(Vite) + server(tsc) 순서로 빌드
npm run start   # server/dist/index.js 실행 → API + client/dist 정적 서빙을 하나의 프로세스로 구동
```

빌드 후 구조:
```text
client/dist/    # Vue 정적 빌드 결과물
server/dist/    # 컴파일된 Express 서버
```

서버는 `/api/*` 요청은 API로 처리하고, 그 외 모든 경로는 `client/dist/index.html`을 반환한다 (SPA 라우팅, 새로고침 404 없음).

---

## Hostinger 배포 (Business Web Hosting, Node.js Apps)

1. hPanel → **Node.js** → 새 애플리케이션 생성
2. **Git 저장소 연결**
   - Repository: 이 저장소 URL
   - Branch: `main` (또는 배포용 브랜치)
3. **빌드/실행 설정**
   - Node.js 버전: `20.x`
   - Build command: `npm install && npm run build`
   - Startup / Entry file: `server/dist/index.js`
4. **환경변수** (hPanel의 Node.js 앱 환경변수 설정 화면에서 등록, `.env` 파일을 커밋하지 않는다)
   - `NODE_ENV=production`
   - `PORT` (Hostinger가 지정하는 포트를 사용해야 하는 경우 해당 값으로)
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (hPanel에서 생성한 MySQL 데이터베이스 정보)
   - `JWT_SECRET`
5. **데이터베이스**: hPanel → MySQL 데이터베이스 생성 후, 로컬에서 원격 접속 허용을 설정하고 `npm run db:migrate && npm run db:seed`를 1회 실행 (또는 Hostinger SSH 접속 후 서버 디렉토리에서 동일 명령 실행)
6. Git push 시 Hostinger가 자동으로 재빌드/재배포하도록 설정 가능 (hPanel 옵션 확인)

> ⚠️ 실제 hPanel의 메뉴 구성/옵션 명칭은 Hostinger 업데이트에 따라 달라질 수 있으므로, 배포 시 최신 hPanel 화면 기준으로 위 항목들의 실제 위치를 확인할 것.

---

## 테스트 체크리스트 (문서 49번 기준 진행 상황)

아래 항목은 코드 레벨 구현·타입체크·빌드까지 완료했지만, **실제 MySQL 환경 연동 테스트는 배포 시 직접 진행이 필요**합니다 (샌드박스 환경에는 살아있는 DB가 없어 여기까지만 검증했습니다).

- [x] TypeScript 컴파일 (client/server 모두 통과)
- [x] Vite 프로덕션 빌드 통과
- [x] Drizzle 마이그레이션 SQL 생성 확인 (10개 테이블)
- [ ] 실제 DB에 마이그레이션 적용 후 로그인 흐름 확인
- [ ] 일요일 묵상 체크 차단 (서버 400 응답) 확인
- [ ] 기도 시간 0~20분 범위 검증 확인
- [ ] 캘린더 체크 → 새로고침 후 데이터 유지 확인
- [ ] 암송 테스트 3가지 방식(전체 암송/빈칸/전체 입력) 채점 확인
- [ ] 관리자 구절 등록 → 회원 화면 반영 확인
- [ ] 일반 회원이 `/admin` URL 직접 접근 시 서버 403 차단 확인
- [x] 관리자가 회원 비밀번호 재설정 가능 (이메일 발송 없이 즉시 반영)

---

## 스크립트 요약

| 명령어 | 설명 |
|---|---|
| `npm run dev:client` | 프런트엔드 개발 서버 |
| `npm run dev:server` | 백엔드 개발 서버 (tsx watch) |
| `npm run build` | 프로덕션 빌드 (client + server) |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run db:generate` | Drizzle 마이그레이션 SQL 생성 |
| `npm run db:migrate` | 마이그레이션 적용 |
| `npm run db:seed` | 초기 관리자 계정 + 샘플 데이터 생성 |

---

## 알려진 제한사항 / 향후 확장 포인트

- "틀린 구절만 재테스트" 기능은 `memorization_results`가 구절 단위로 분리 저장되어 있어 추가 구현이 쉬움 (현재 UI에는 미포함)
- 빈칸 암송 간격은 관리자 화면(암송 구절 관리 > 빈칸 암송 간격)에서 2~10 사이로 조정 가능 (기본 3)
- `audit_logs` 테이블은 스키마만 준비되어 있고 실제 기록 로직은 아직 연결되지 않음
- 비밀번호는 이메일 재설정 대신 관리자가 회원 상세 화면에서 직접 재설정하는 방식으로 구현되어 있음
