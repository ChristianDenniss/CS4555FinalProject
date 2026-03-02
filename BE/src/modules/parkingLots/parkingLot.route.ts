import { Router } from "express";
import * as controller from "./parkingLot.controller";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cache";

const router = Router();

router.get("/", cacheMiddleware({ prefix: "parking-lots", ttlSeconds: 60 }), controller.list);
router.get("/:id", controller.getById);
router.get("/:id/spots", controller.getSpots);
router.post("/", invalidateCacheMiddleware("parking-lots"), controller.create);

export default router;
