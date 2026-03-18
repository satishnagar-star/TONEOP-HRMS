import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

export const authRoutes = Router();

authRoutes.post("/login", authController.login);
authRoutes.post("/change-password", requireAuth, authController.changePassword);

