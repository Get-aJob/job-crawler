import { Router } from "express";
import path from "path";
import * as adminController from "../controllers/adminController";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "src/public/admin.html"));
});

router.post("/test-crawl", requireAdmin, adminController.testCrawlHandler);
router.get("/stats", requireAdmin, adminController.statsHandler);
router.post("/test-crawl-url", requireAdmin, adminController.testCrawlByUrlHandler);

router.post("/save-crawl", requireAdmin, adminController.saveCrawlHandler);
router.post("/save-crawl-url", requireAdmin, adminController.saveCrawlByUrlHandler);

router.get("/low-quality", requireAdmin, adminController.getLowQualityJobsHandler);
router.post("/delete-jobs", requireAdmin, adminController.deleteJobsHandler);

export default router;
