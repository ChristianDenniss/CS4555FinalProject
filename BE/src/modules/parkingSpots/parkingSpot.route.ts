import { Router } from "express";
import * as controller from "./parkingSpot.controller";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cache";

const router = Router();

router.get("/", cacheMiddleware({ prefix: "parking-spots", ttlSeconds: 30 }), controller.list);
router.get("/:id", controller.getById);
router.patch("/:id/status", invalidateCacheMiddleware("parking-spots"), controller.updateStatus);
router.post("/", invalidateCacheMiddleware("parking-spots"), controller.create);

export default router;
