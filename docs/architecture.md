# Architecture

## 1. 확정된 기술 스택

### Frontend
- Vue 3 (Composition API, `<script setup>`)
- Vite
- TypeScript
- Vue Router 4 (route guard로 인증/권한 분리)
- Pinia (전역 상태)
- CSS: 커스텀 디자인 시스템 (`design-tokens.css`) + scoped component style
  - Tailwind는 사용하지 않음 — `.designrules`(Apple 모션 철학)와 결합할 때 세밀한 spring 트랜지션 제어가 순수 CSS/JS 쪽이 더 쉬움

### Backend
- Node.js 20.x LTS (Hostinger Business Web Hosting 지원 버전 중 안정 버전)
- Express + TypeScript
- 인증: httpOnly Secure 쿠키 기반 JWT 세션 (access token 단일, 만료 시 재로그인 — 소규모 서비스 특성상 refresh token 구조는 과설계로 판단, 필요 시 후속 확장)
- 비밀번호: bcrypt

### Database
- MySQL 8 (Hostinger가 기본 제공하는 DB 엔진)
- Drizzle ORM (TypeScript 우선, 마이그레이션 파일 기반 — Prisma보다 가볍고 Hostinger Node 배포 환경에서 바이너리 엔진 이슈가 없음)

### 배포 구조 (Hostinger Node.js Apps 기준)
Hostinger의 Node.js Apps는 Git 저장소를 import하면 **build command / output directory / entry file**을 자동 감지하거나 수동 지정하는 방식으로 동작합니다. 즉 하나의 Node 프로세스만 상시 구동됩니다.

따라서 **프런트엔드와 백엔드를 하나의 Node 앱으로 통합 배포**합니다.

```text
빌드 시:
  client/  → vite build → client/dist (정적 파일)
  server/  → tsc build  → server/dist

런타임 (entry file = server/dist/index.js):
  Express 서버가
    1) /api/*  → API 라우트 처리
    2) 그 외 모든 경로 → client/dist/index.html 반환 (SPA fallback)
```

이 구조의 장점:
- Hostinger 요금제가 Node 앱 1개 슬롯만 지원해도 문제 없음
- Apache `.htaccess` rewrite 설정이 필요 없음 (Express가 직접 SPA 라우팅 처리) → 문서 51번 "새로고침 404" 문제가 구조적으로 발생하지 않음
- 배포 시 `npm run build && npm start` 한 번으로 끝남

## 2. 리포지토리 구조 (모노레포)

```text
repo/
├── client/                # Vue 3 앱
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── router/
│   │   ├── stores/         # Pinia
│   │   ├── styles/
│   │   │   └── design-tokens.css
│   │   ├── utils/
│   │   ├── views/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                 # Express API
│   ├── src/
│   │   ├── config/          # env, db connection
│   │   ├── db/
│   │   │   ├── schema.ts     # Drizzle 스키마
│   │   │   └── migrations/
│   │   ├── middleware/       # auth, requireAdmin, error handler
│   │   ├── routes/
│   │   ├── services/         # 순수 계산 로직 (주간 진행률, 암송 diff 등)
│   │   ├── utils/
│   │   └── index.ts           # entry file
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   ├── user-flow.md
│   └── feature-spec.md
│
├── .designrules            # Apple 모션 철학 (기존) + 색상/타이포/spacing 토큰 (추가 예정)
├── .gitignore
├── README.md
└── package.json             # root: workspaces 또는 concurrently 스크립트
```

## 3. 인증 / 권한 구조

```text
로그인 → 서버에서 JWT 발급 (httpOnly, Secure, SameSite=Strict 쿠키)
       → 쿠키에 role 정보는 넣지 않음 (클라이언트가 role을 신뢰하지 않도록)
       → 매 요청마다 서버가 JWT 검증 + DB에서 role 재확인(또는 JWT payload의 role, 단 payload는 서버 서명이라 위변조 불가하므로 payload role 신뢰 가능)

Frontend route guard:
  - meta: { requiresAuth: true, requiresAdmin: true }
  - 비로그인 → /login
  - 일반회원이 /admin/* 접근 → /dashboard로 redirect (UX 목적일 뿐, 보안 경계 아님)

Backend middleware (실제 보안 경계):
  - requireAuth: 쿠키의 JWT 검증, req.user 세팅
  - requireAdmin: req.user.role !== 'admin' → 403
  - 모든 회원 데이터 API는 req.user.id 기준으로만 조회/수정 (요청 body의 user_id는 신뢰하지 않음)
```

## 4. 성능 관련 결정

- 캘린더는 월 단위로 한 번에 데이터를 가져옴: `GET /api/training/month?year&month` — 날짜별 개별 요청 금지
- 주간 데이터는 `week_id` 기준 캐시 가능한 구조 (Pinia store에 현재 조회한 월/주 데이터만 보관)
- 체크 저장은 optimistic update: 즉시 UI 반영 → API 요청 → 실패 시 rollback + toast

## 5. 다음 단계에서 결정 필요 (승인 시 함께 확정)

1. 세션 만료 시간 (예: 7일) — 기본값 제안: 7일
2. 이메일 인증/비밀번호 재설정 기능 포함 여부 — 초기 범위에서는 제외 제안 (관리자가 직접 계정 생성/초기화)
3. 관리자 계정 최초 생성 방법 — DB seed 스크립트로 초기 admin 계정 1개 생성 제안
