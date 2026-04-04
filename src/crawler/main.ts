import "dotenv/config";
import { crawlWanted } from "./wanted/crawler";
import { crawlSaramin } from "./saramin/crawler";
import { crawlIncruit } from "./incruit/crawler";
import { insertJobs } from "../services/job.service";
import { crawlJumpit } from "./jumpit/crawler";

const main = async () => {
  const crawlers = [
    { name: "wanted", fn: crawlWanted },
    { name: "saramin", fn: crawlSaramin },
    { name: "incruit", fn: crawlIncruit },
    { name: "jumpit", fn: crawlJumpit },
  ];

  for (const { name, fn } of crawlers) {
    try {
      const jobs = await fn();
      await insertJobs(jobs, name);
    } catch (e: any) {
      console.error(`[${name}] 실패:`, e.message);
    }
  }

  console.log("전체 완료");
};
main();