import express = require("express");
import jobRouter from "./routes/job";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());

app.use("/api/jobs", jobRouter);

app.listen(PORT, () => {
  console.log(`서버 실행: ${PORT}`);
});