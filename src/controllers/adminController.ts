import { Request, Response } from "express";
import { crawlWanted } from "../crawler/wanted/crawler";
import { crawlSaramin } from "../crawler/saramin/crawler";
import { crawlIncruit } from "../crawler/incruit/crawler";
import { crawlJumpit } from "../crawler/jumpit/crawler";
import { CrawledJob } from "../../types";
import { crawlJobByUrl } from "../crawler/crawlJobByUrl";
import { supabase } from "../../supabase";

type Source = "wanted" | "saramin" | "incruit" | "jumpit" | "all";

const crawlers = {
  wanted: crawlWanted,
  saramin: crawlSaramin,
  incruit: crawlIncruit,
  jumpit: crawlJumpit,
};

const getFieldQuality = (jobs: CrawledJob[]) => ({
  title:        jobs.filter(j => !j.title).length,
  company:      jobs.filter(j => !j.company).length,
  location:     jobs.filter(j => !j.location).length,
  experience:   jobs.filter(j => !j.experience).length,
  companyLogo:  jobs.filter(j => !j.companyLogo).length,
  requirements: jobs.filter(j => !j.requirements).length,
  preferred:    jobs.filter(j => !j.preferred).length,
  deadline:     jobs.filter(j => !j.deadline).length,
});

export const testCrawlHandler = async (req: Request, res: Response) => {
  try {
    const { source } = req.body as { source: Source };
    if (!source) return res.status(400).json({ error: "source는 필수입니다." });

    let jobs: CrawledJob[] = [];

    if (source === "all") {
      const results = await Promise.all(
        Object.values(crawlers).map(fn => fn())
      );
      jobs = results.flat();
    } else {
      const crawler = crawlers[source];
      if (!crawler) return res.status(400).json({ error: "유효하지 않은 소스" });
      jobs = await crawler();
    }

    const keywordStats: Record<string, number> = {};
    for (const job of jobs) {
      keywordStats[job.keyword] = (keywordStats[job.keyword] || 0) + 1;
    }

    res.json({
      total: jobs.length,
      keywordStats,
      fieldQuality: getFieldQuality(jobs),
      jobs: jobs.slice(0, 100),
    });
  } catch (error: any) {
    res.status(500).json({ error: "크롤링 실패", detail: error.message });
  }
};

export const statsHandler = async (req: Request, res: Response) => {
  try {
    const { data: sourceRows } = await supabase
      .from("job_postings")
      .select("source_site_name")
      .eq("source_type", "auto");

    const bySource: Record<string, number> = {};
    for (const row of sourceRows || []) {
      bySource[row.source_site_name] = (bySource[row.source_site_name] || 0) + 1;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dateRows } = await supabase
      .from("job_postings")
      .select("crawled_at")
      .eq("source_type", "auto")
      .gte("crawled_at", thirtyDaysAgo.toISOString());

    const byDate: Record<string, number> = {};
    for (const row of dateRows || []) {
        const rawDate = (row.crawled_at as string).split("T")[0];
        if (!rawDate) continue;
        byDate[rawDate] = (byDate[rawDate] || 0) + 1;

    }

    const { data: qualityRows, count: total } = await supabase
      .from("job_postings")
      .select("location, experience, content, company_logo", { count: "exact" })
      .eq("source_type", "auto");

    const fieldQuality = {
      location:     (qualityRows || []).filter(j => !j.location).length,
      experience:   (qualityRows || []).filter(j => !j.experience).length,
      content:      (qualityRows || []).filter(j => !j.content).length,
      company_logo: (qualityRows || []).filter(j => !j.company_logo).length,
    };

    res.json({ total: total || 0, bySource, byDate, fieldQuality });
  } catch (error: any) {
    res.status(500).json({ error: "통계 조회 실패" });
  }
};

export const testCrawlByUrlHandler = async (req: Request, res: Response) => {
  try {
    const { url } = req.body as { url: string };
    if (!url) return res.status(400).json({ error: "url은 필수입니다." });

    const job = await crawlJobByUrl(url);

    if (!job) return res.status(404).json({ error: "크롤링 결과 없음" });

    res.json({ job });
  } catch (error: any) {
    res.status(500).json({ error: "크롤링 실패", detail: error.message });
  }
};
