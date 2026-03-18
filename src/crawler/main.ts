import "dotenv/config";
import { crawlWanted } from "./wanted/crawler";
import { crawlSaramin } from "./saramin/crawler";
import { crawlIncruit } from "./incruit/crawler";
import { insertJobs } from "../services/job.service";

const main = async () => {
  console.log("크롤링 시작");

  const wantedJobs = await crawlWanted();
  await insertJobs(wantedJobs, "wanted");

  const saraminJobs = await crawlSaramin();
  await insertJobs(saraminJobs, "saramin");

  const incruitJobs = await crawlIncruit();
  await insertJobs(incruitJobs, "incruit");

  console.log("전체 완료");
};
main();