import express from "express";
import { holidayController } from "../controllers/holidayController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", holidayController.getAll);
router.post("/", requireRole("SuperAdmin"), holidayController.create);
router.delete("/:id", requireRole("SuperAdmin"), holidayController.delete);

export default router;
