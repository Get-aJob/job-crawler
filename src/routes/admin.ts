import { Router } from "express";
import path from "path";
import * as adminController from "../controllers/adminController";

const router = Router();

router.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "src/public/admin.html"));
});

router.post("/test-crawl", adminController.testCrawlHandler);
router.get("/stats", adminController.statsHandler);
router.post("/test-crawl-url", adminController.testCrawlByUrlHandler);

router.post("/save-crawl", adminController.saveCrawlHandler);
router.post("/save-crawl-url", adminController.saveCrawlByUrlHandler);

router.get("/low-quality", adminController.getLowQualityJobsHandler);
router.post("/delete-jobs", adminController.deleteJobsHandler);

export default router;
