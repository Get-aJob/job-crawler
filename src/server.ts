import express = require("express");
import jobRouter from "./routes/job";

const app = express();

app.use(express.json());

app.use("/api/jobs", jobRouter);

app.listen(3000, () => {
  console.log("서버 실행");
});