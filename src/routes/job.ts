import express = require("express");
import { saveJob } from "../services/saveJob"

const router = express.Router();

router.post("/crawl", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "url 필요" });
    }

    const result = await saveJob(url);

    if (!result) {
      return res.status(500).json({ error: "크롤링 실패" });
    }

    return res.json(result);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "서버 에러" });
  }
});

export default router;