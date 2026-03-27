import { crawlSaramin } from "./saramin/crawler";
import { crawlIncruit } from "./incruit/crawler";
import { crawlWanted } from "./wanted/crawler";
import { CrawledJob } from "../../types";
import { detectPlatform } from "../utils/detectPlatform";
import { crawlJobByUrl } from "./crawlJobByUrl";
import { saveJob } from "../services/saveJob";

type Source = "saramin" | "incruit" | "wanted" | "all";

type DedupedJob = Omit<CrawledJob, "keyword"> & {
  keywords: string[];
};

const crawlers = {
  saramin: crawlSaramin,
  incruit: crawlIncruit,
  wanted: crawlWanted,
};

const runCrawler = async (source: Source) => {
  try {
    if (source === "all") {
      const [saramin, incruit, wanted] = await Promise.all([
        crawlSaramin(),
        crawlIncruit(),
        crawlWanted(),
      ]);

      return [...saramin, ...incruit, ...wanted];
    }

    const crawler = crawlers[source];
    return await crawler();
  } catch (error) {
    console.error("크롤러 실행 실패:", error);
    return [];
  }
};

const dedupeJobs = (jobs: CrawledJob[]): DedupedJob[] => {
  const map = new Map<string, DedupedJob>();

  for (const job of jobs) {
    const existing = map.get(job.externalId);

    if (existing) {
      if (!existing.keywords.includes(job.keyword)) {
        existing.keywords.push(job.keyword);
      }
    } else {
      const { keyword, ...rest } = job;
      map.set(job.externalId, {
        ...rest,
        keywords: [keyword],
      });
    }
  }

  return Array.from(map.values());
};

const getKeywordStats = (jobs: CrawledJob[]) => {
  const map: Record<string, number> = {};

  for (const job of jobs) {
    map[job.keyword] = (map[job.keyword] || 0) + 1;
  }

  return map;
};

const printResult = (rawJobs: CrawledJob[]) => {
  const dedupedJobs = dedupeJobs(rawJobs);
  const keywordStats = getKeywordStats(rawJobs);

  console.log("\n📊 키워드별 개수");
  console.table(keywordStats);

  console.log("\n전체 수집 공고 수:", rawJobs.length);
  console.log("중복 제거된 공고 수:", dedupedJobs.length);

  console.log("\n샘플");

  dedupedJobs.slice(0, 5).forEach((job, idx) => {
    console.log(`
[${idx + 1}]
title: ${job.title}
company: ${job.company}
keywords: ${job.keywords.join(", ")}
location: ${job.location}
experience: ${job.experience}
logo: ${job.companyLogo || "없음"}
requirements: ${job.requirements?.slice(0, 100) || "❌ 없음"}
preferred: ${job.preferred?.slice(0, 100) || "❌ 없음"}
url: ${job.url}
    `);
  });
};


const testDetectPlatformWithRealData = (jobs: CrawledJob[]) => {
  console.log("\n 실제 크롤링 데이터 기반 플랫폼 판별 테스트\n");

  const results = jobs.map((job) => ({
    url: job.url,
    detected: detectPlatform(job.url),
  }));

  console.table(results.slice(0, 20));

  const failed = results.filter((r) => !r.detected);

  if (failed.length > 0) {
    console.log("\n 플랫폼 판별 실패 URL들:");
    failed.slice(0, 10).forEach((f) => console.log(f.url));
  } else {
    console.log("\n 모든 URL 정상 판별됨");
  }
};

const testIntegratedCrawl = async () => {
  console.log("\n 수동 크롤링 테스트\n");

  const url = "https://www.wanted.co.kr/wd/272068";

  const job = await crawlJobByUrl(url);

  console.log(job);
};

const main = async () => {

//수동 크롤링 테스트 로직
 //await testIntegratedCrawl()

//자동크롤링 테스트 로직
  //  const SOURCE: Source = "wanted"; 

  // const rawJobs = await runCrawler(SOURCE);

  //  testDetectPlatformWithRealData(rawJobs);

  // printResult(rawJobs);

// 수동크롤링 데이터베이스 insert 테스트 로직
   const url =
    "https://www.wanted.co.kr/wd/272068";

  const result = await saveJob(url);

  console.log(result);
};

main();