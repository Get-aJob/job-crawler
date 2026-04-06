import { Router } from "express";
import path from "path";
import * as adminController from "../controllers/adminController";

const router = Router();

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

router.post("/test-crawl", adminController.testCrawlHandler);
router.get("/stats", adminController.statsHandler);
router.post("/test-crawl-url", adminController.testCrawlByUrlHandler);


export default router;
