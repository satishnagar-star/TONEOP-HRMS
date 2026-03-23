import { Router } from "express";
import { leaveController } from "../controllers/leaveController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const leaveRoutes = Router();

// User routes
leaveRoutes.post("/apply", requireAuth, leaveController.apply);
leaveRoutes.get("/my-leaves", requireAuth, leaveController.getUserLeaves);

// Admin/SuperAdmin routes
leaveRoutes.get("/all", requireAuth, requireRole("Admin", "SuperAdmin"), leaveController.getAll);
leaveRoutes.patch("/approve/:id", requireAuth, requireRole("Admin", "SuperAdmin"), leaveController.approve);
leaveRoutes.patch("/reject/:id", requireAuth, requireRole("Admin", "SuperAdmin"), leaveController.reject);
