import { Router } from "express";
import * as controller from "./historical.controller";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cache";

const router = Router();

router.get("/", cacheMiddleware({ prefix: "historical", ttlSeconds: 60 }), controller.list);
router.post("/", invalidateCacheMiddleware("historical"), controller.create);

export default router;
