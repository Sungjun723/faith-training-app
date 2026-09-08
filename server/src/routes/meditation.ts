import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { dailyMeditations } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { toDateString } from "../utils/date.js";

export const meditationRouter = Router();
meditationRouter.use(requireAuth);

meditationRouter.get(
  "/today",
  asyncHandler(async (req, res) => {
    const today = toDateString(new Date());
    const meditation = await db.query.dailyMeditations.findFirst({
      where: eq(dailyMeditations.date, today),
    });
    res.json({ meditation: meditation ?? null });
  })
);
