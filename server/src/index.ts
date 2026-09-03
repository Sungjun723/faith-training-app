import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { trainingRouter } from "./routes/training.js";
import { profileRouter } from "./routes/profile.js";
import { memorizationRouter } from "./routes/memorization.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/training", trainingRouter);
app.use("/api/profile", profileRouter);
app.use("/api/memorization", memorizationRouter);
app.use("/api/admin", adminRouter);

// production: client/dist를 정적으로 서빙 + SPA fallback
// server/dist/index.js 기준 상대 경로로 client/dist를 찾는다.
const clientDistPath = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port} (${env.nodeEnv})`);
});
