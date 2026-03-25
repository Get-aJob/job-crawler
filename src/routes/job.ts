import express = require("express");
import { saveJob } from "../services/saveJob"

const router = express.Router();

router.post("/crawl", async (req, res) => {
  try {
    const { url } = req.body;

    const result = await saveJob(url);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "크롤링 또는 DB 저장 실패",
    });
  }
});

export default router;