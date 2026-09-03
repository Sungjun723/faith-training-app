import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, pool } from "./client.js";

async function run() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations complete.");
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
