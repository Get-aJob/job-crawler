import "dotenv/config";
import { crawlWanted } from "./wanted/crawler";
import { crawlSaramin } from "./saramin/crawler";
import { crawlIncruit } from "./incruit/crawler";
import { insertJobs } from "../services/job.service";
import { crawlJumpit } from "./jumpit/crawler";

const main = async () => {
  console.log("크롤링 시작");

  const wantedJobs = await crawlWanted();
  await insertJobs(wantedJobs, "wanted");

  const saraminJobs = await crawlSaramin();
  await insertJobs(saraminJobs, "saramin");

  const incruitJobs = await crawlIncruit();
  await insertJobs(incruitJobs, "incruit");

  const jumpitJobs = await crawlJumpit();
  await insertJobs(jumpitJobs, "jumpit");

  console.log("전체 완료");
};
main();