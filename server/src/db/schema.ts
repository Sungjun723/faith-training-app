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
// users
// ---------------------------------------------------------------------------
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["member", "admin"]).notNull().default("member"),
  profileImage: varchar("profile_image", { length: 500 }),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// weeks (훈련 주차 / 암송 주차 공통 기준)
// ---------------------------------------------------------------------------
export const weeks = mysqlTable("weeks", {
  id: int("id").primaryKey().autoincrement(),
  weekNumber: int("week_number").notNull().unique(),
  weekStart: date("week_start", { mode: "string" }).notNull().unique(),
  weekEnd: date("week_end", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
// weekly_training_records (주간)
// ---------------------------------------------------------------------------
export const weeklyTrainingRecords = mysqlTable(
  "weekly_training_records",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    weekId: int("week_id").notNull().references(() => weeks.id),
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
    uqUserWeek: unique("uq_user_week").on(table.userId, table.weekId),
  })
);

// ---------------------------------------------------------------------------
// memorization_passages
// ---------------------------------------------------------------------------
export const memorizationPassages = mysqlTable("memorization_passages", {
  id: int("id").primaryKey().autoincrement(),
  weekId: int("week_id").notNull().references(() => weeks.id),
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
  scopeWeekId: int("scope_week_id").notNull().references(() => weeks.id),
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
export const usersRelations = relations(users, ({ many }) => ({
  trainingRecords: many(trainingRecords),
  weeklyTrainingRecords: many(weeklyTrainingRecords),
  memorizationSessions: many(memorizationTestSessions),
}));

export const weeksRelations = relations(weeks, ({ many }) => ({
  passages: many(memorizationPassages),
  weeklyTrainingRecords: many(weeklyTrainingRecords),
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
