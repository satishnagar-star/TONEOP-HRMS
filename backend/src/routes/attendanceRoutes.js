import { Router } from "express";
import { attendanceController } from "../controllers/attendanceController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const attendanceRoutes = Router();

attendanceRoutes.get("/all", requireAuth, requireRole("SuperAdmin"), attendanceController.getAll);
attendanceRoutes.get(
  "/department/:dept",
  requireAuth,
  requireRole("Admin", "SuperAdmin"),
  attendanceController.getDepartment
);
attendanceRoutes.get("/:employeeCode", requireAuth, attendanceController.getByEmployee);

attendanceRoutes.post(
  "/upload",
  requireAuth,
  requireRole("SuperAdmin"),
  attendanceController.uploadCsvData
);

attendanceRoutes.patch(
  "/record/:id",
  requireAuth,
  requireRole("Admin", "SuperAdmin"),
  attendanceController.updateRecord
);

