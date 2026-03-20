import { crawlSaramin } from "./saramin/crawler";
import { crawlIncruit } from "./incruit/crawler";
import { crawlWanted } from "./wanted/crawler";

type Source = "saramin" | "incruit" | "wanted" | "all";

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

      return { saramin, incruit, wanted };
    }

    const crawler = crawlers[source];
    const result = await crawler();

    return { [source]: result };
  } catch (error) {
    console.error("크롤러 실행 실패:", error);
    return {};
  }
};

const printKeywordStats = (jobs: any[]) => {
  const map: Record<string, number> = {};

  jobs.forEach((job) => {
    map[job.keyword] = (map[job.keyword] || 0) + 1;
  });

  console.log("\n📊 키워드별 개수:");
  for (const [keyword, count] of Object.entries(map)) {
    console.log(`- ${keyword}: ${count}개`);
  }
};

const printResult = (results: Record<string, any[]>) => {
  for (const [source, jobs] of Object.entries(results)) {
    console.log(`\n========== ${source.toUpperCase()} ==========`);

    console.log("총 개수:", jobs.length);

    printKeywordStats(jobs);

    jobs.slice(0, 5).forEach((job, idx) => {
      console.log(`
[${idx + 1}]
title: ${job.title}
company: ${job.company}
location: ${job.location}
experience: ${job.experience}
logo: ${job.companyLogo || "없음"}
content (요약): ${job.content?.slice(0, 200) || "❌ 없음"}
url: ${job.url}
      `);
    });
  }
};

const main = async () => {
  const SOURCE: Source = "saramin"; 

  const results = await runCrawler(SOURCE);

  printResult(results);


};

main();