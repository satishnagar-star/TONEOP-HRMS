import { Router } from "express";
import { employeeController } from "../controllers/employeeController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const employeeRoutes = Router();

employeeRoutes.post("/create", requireAuth, requireRole("SuperAdmin"), employeeController.create);
employeeRoutes.delete("/:code", requireAuth, requireRole("SuperAdmin"), employeeController.remove);
employeeRoutes.patch("/:code", requireAuth, requireRole("SuperAdmin"), employeeController.update);
employeeRoutes.get("/all", requireAuth, requireRole("SuperAdmin"), employeeController.all);
employeeRoutes.get("/department", requireAuth, requireRole("Admin", "SuperAdmin"), employeeController.department);
employeeRoutes.post("/apply-leave", requireAuth, (req, res) => res.json({ success: true, message: "Leave applied successfully" }));

