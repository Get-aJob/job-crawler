import express = require("express");
import adminRouter from "./routes/admin";
import jobRouter from "./routes/job";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use("/api/jobs", jobRouter);
app.use("/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`서버 실행: ${PORT}`);
});
