import { Router } from "express";
import { commentsController } from "../controllers/commentsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const commentsRoutes = Router();

commentsRoutes.post("/create", requireAuth, commentsController.create);
commentsRoutes.get("/my", requireAuth, commentsController.my);
commentsRoutes.get("/department", requireAuth, requireRole("Admin", "SuperAdmin"), commentsController.department);
commentsRoutes.get("/all", requireAuth, requireRole("SuperAdmin"), commentsController.all);
commentsRoutes.post("/reply", requireAuth, requireRole("Admin", "SuperAdmin"), commentsController.reply);

