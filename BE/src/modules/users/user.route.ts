import { Router } from "express";
import * as controller from "./user.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.get("/me", requireAuth, controller.me);
router.get("/me/schedule", requireAuth, controller.mySchedule);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

export default router;
