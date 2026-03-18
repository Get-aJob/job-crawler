import { crawlSaramin } from "./saramin/crawler";
import { crawlIncruit } from "./incruit/crawler";
import { crawlWanted } from "./wanted/crawler";


type Job = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  deadline: string;
  url: string;
  source: "saramin" | "incruit" | "wanted";
};

export const crawlAllJobs = async (): Promise<Job[]> => {
  try {
    const [saraminJobs, incruitJobs, wantedJobs] = await Promise.all([
      crawlSaramin(),
      crawlIncruit(),
      crawlWanted(),
    ]);

const saraminWithSource = saraminJobs.map((job) => ({ ...job, source: "saramin" as const }));
const incruitWithSource = incruitJobs.map((job) => ({ ...job, source: "incruit" as const }));
const wantedWithSource = wantedJobs.map((job) => ({ ...job, source: "wanted" as const }));

    const allJobs: Job[] = [
      ...saraminWithSource,
      ...incruitWithSource,
      ...wantedWithSource,
    ];

    return allJobs;
  } catch (error) {
    console.error("전체 Job 크롤링 실패:", error);
    return [];
  }
};

// 테스트용 실행
const main = async () => {
  const jobs = await crawlAllJobs();

  console.log(jobs.slice(0, 10)); // 일부만 확인
  console.log("총 개수:", jobs.length);
};

main();