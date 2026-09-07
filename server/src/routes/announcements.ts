import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { announcements } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const announcementsRouter = Router();
announcementsRouter.use(requireAuth);

announcementsRouter.get(
  "/active",
  asyncHandler(async (req, res) => {
    const rows = await db.query.announcements.findMany({
      where: eq(announcements.isActive, true),
      orderBy: [desc(announcements.createdAt)],
    });
    res.json({ announcements: rows });
  })
);
