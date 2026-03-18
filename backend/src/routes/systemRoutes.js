import { Router } from "express";
import { systemController } from "../controllers/systemController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const systemRoutes = Router();

systemRoutes.get("/logs", requireAuth, requireRole("SuperAdmin"), systemController.logs);

