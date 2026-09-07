import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  mysqlEnum,
  decimal,
  json,
  unique,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// groups (그룹 — 시작일을 공유하는 학생 단위)
// ---------------------------------------------------------------------------
export const groups = mysqlTable("groups", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  // 그룹의 "1주차"가 시작되는 기준일. 내부적으로 이 날짜가 속한 주의 월요일을
  // 앵커로 사용해 이후 모든 주차 계산의 기준으로 삼는다 (묵상 월~토/일요일 제외
  // 로직과의 정합성을 위해 — services/groupWeeks.ts 참고).
  startDate: date("start_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["member", "admin"]).notNull().default("member"),
  // 일반 회원(member)은 반드시 그룹에 속해야 한다 (애플리케이션 레벨에서 강제).
  // 관리자 계정은 그룹이 없을 수 있어 컬럼 자체는 NULL 허용.
  groupId: int("group_id").references(() => groups.id),
  profileImage: varchar("profile_image", { length: 500 }),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// training_records (일별)
// ---------------------------------------------------------------------------
export const trainingRecords = mysqlTable(
  "training_records",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    recordDate: date("record_date", { mode: "string" }).notNull(),
    meditationCompleted: boolean("meditation_completed").notNull().default(false),
    prayerMinutes: int("prayer_minutes").notNull().default(0),
    readingPages: int("reading_pages").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    uqUserDate: unique("uq_user_date").on(table.userId, table.recordDate),
  })
);

// ---------------------------------------------------------------------------
// weekly_training_records (주간 — 그룹 시작일 기준으로 계산된 주차 번호로 관리)
// ---------------------------------------------------------------------------
export const weeklyTrainingRecords = mysqlTable(
  "weekly_training_records",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    weekNumber: int("week_number").notNull(),
    inductiveStudyCompleted: boolean("inductive_study_completed").notNull().default(false),
    bookReadingCompleted: boolean("book_reading_completed").notNull().default(false),
    previewCompleted: boolean("preview_completed").notNull().default(false),
    sundayServiceCompleted: boolean("sunday_service_completed").notNull().default(false),
    // UI 라벨: "청금" (청년금요집회 = 금요예배)
    fridayServiceCompleted: boolean("friday_service_completed").notNull().default(false),
    smallGroupCompleted: boolean("small_group_completed").notNull().default(false),
    memorizationCompleted: boolean("memorization_completed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    uqUserWeek: unique("uq_user_week").on(table.userId, table.weekNumber),
  })
);

// ---------------------------------------------------------------------------
// memorization_passages (주차 번호만으로 관리 — 그룹과 무관하게 전체 공통)
// ---------------------------------------------------------------------------
export const memorizationPassages = mysqlTable("memorization_passages", {
  id: int("id").primaryKey().autoincrement(),
  weekNumber: int("week_number").notNull(),
  book: varchar("book", { length: 50 }).notNull(),
  chapterVerse: varchar("chapter_verse", { length: 20 }).notNull(),
  content: text("content").notNull(),
  displayOrder: int("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// memorization_test_sessions
// ---------------------------------------------------------------------------
export const memorizationTestSessions = mysqlTable("memorization_test_sessions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id),
  scopeWeekNumber: int("scope_week_number").notNull(),
  testType: mysqlEnum("test_type", ["full_recite", "fill_blank", "full_input"]).notNull(),
  totalPassages: int("total_passages").notNull(),
  averageScore: decimal("average_score", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", ["in_progress", "completed"]).notNull().default("in_progress"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ---------------------------------------------------------------------------
// memorization_results
// ---------------------------------------------------------------------------
export const memorizationResults = mysqlTable("memorization_results", {
  id: int("id").primaryKey().autoincrement(),
  sessionId: int("session_id").notNull().references(() => memorizationTestSessions.id),
  passageId: int("passage_id").notNull().references(() => memorizationPassages.id),
  score: decimal("score", { precision: 5, scale: 2 }),
  correctCount: int("correct_count").notNull().default(0),
  wrongCount: int("wrong_count").notNull().default(0),
  missingCount: int("missing_count").notNull().default(0),
  testSnapshot: json("test_snapshot"),
  completedAt: timestamp("completed_at"),
});

// ---------------------------------------------------------------------------
// audit_logs
// ---------------------------------------------------------------------------
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  adminId: int("admin_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  targetTable: varchar("target_table", { length: 100 }),
  targetId: int("target_id"),
  detail: json("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// app_settings (단일 행 설정 테이블 - 관리자가 조정하는 전역 정책값)
// ---------------------------------------------------------------------------
export const appSettings = mysqlTable("app_settings", {
  id: int("id").primaryKey().autoincrement(),
  // 빈칸 암송에서 몇 단어마다 하나를 빈칸으로 만들지 (예: 2 = 2단어마다, 3 = 3단어마다)
  blankInterval: int("blank_interval").notNull().default(3),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// relations (조인 편의용)
// ---------------------------------------------------------------------------
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  group: one(groups, { fields: [users.groupId], references: [groups.id] }),
  trainingRecords: many(trainingRecords),
  weeklyTrainingRecords: many(weeklyTrainingRecords),
  memorizationSessions: many(memorizationTestSessions),
}));

export const memorizationTestSessionsRelations = relations(
  memorizationTestSessions,
  ({ many, one }) => ({
    results: many(memorizationResults),
    user: one(users, { fields: [memorizationTestSessions.userId], references: [users.id] }),
  })
);

export const memorizationResultsRelations = relations(memorizationResults, ({ one }) => ({
  session: one(memorizationTestSessions, {
    fields: [memorizationResults.sessionId],
    references: [memorizationTestSessions.id],
  }),
  passage: one(memorizationPassages, {
    fields: [memorizationResults.passageId],
    references: [memorizationPassages.id],
  }),
}));
