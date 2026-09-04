import "dotenv/config";

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),

  dbHost: required("DB_HOST", "127.0.0.1"),
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbUser: required("DB_USER", "root"),
  dbPassword: process.env.DB_PASSWORD ?? "",
  dbName: required("DB_NAME", "faith_training"),

  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresInDays: Number(process.env.JWT_EXPIRES_IN_DAYS ?? 7),

  // 정책 상수 (문서 합의 사항)
  dailyPrayerTargetMinutes: 20,
  dailyReadingTargetPages: 2,
  weeklyTrainingDays: 6, // 월~토
};
