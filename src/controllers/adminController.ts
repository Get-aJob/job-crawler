import { Request, Response } from "express";
import { insertJobs } from "../services/job.service";
import { saveJob } from "../services/saveJob";
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
    const { data: sourceRows, error: sourceError } = await supabase
      .from("job_postings")
      .select("source_site_name")
      .eq("source_type", "auto");
    if (sourceError) throw sourceError;

    const bySource: Record<string, number> = {};
    for (const row of sourceRows || []) {
      bySource[row.source_site_name] = (bySource[row.source_site_name] || 0) + 1;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dateRows, error: dateError } = await supabase
      .from("job_postings")
      .select("crawled_at")
      .eq("source_type", "auto")
      .gte("crawled_at", thirtyDaysAgo.toISOString());
    if (dateError) throw dateError;

    const byDate: Record<string, number> = {};
    for (const row of dateRows || []) {
        const rawDate = (row.crawled_at as string).split("T")[0];
        if (!rawDate) continue;
        byDate[rawDate] = (byDate[rawDate] || 0) + 1;

    }

    const { data: qualityRows, count: total, error: qualityError } = await supabase
      .from("job_postings")
      .select("location, experience, content, company_logo", { count: "exact" })
      .eq("source_type", "auto");
    if (qualityError) throw qualityError;

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

export const saveCrawlHandler = async (req: Request, res: Response) => {
  try {
    const { source } = req.body as { source: Source };
    if (!source) return res.status(400).json({ error: "source는 필수입니다." });

    let totalSaved = 0;

    if (source === "all") {
      for (const [name, fn] of Object.entries(crawlers)) {
        const jobs = await fn();
        const count = await insertJobs(jobs, name);
        totalSaved += count;
      }
    } else {
      const crawler = crawlers[source];
      if (!crawler) return res.status(400).json({ error: "유효하지 않은 소스" });
      const jobs = await crawler();
      totalSaved = await insertJobs(jobs, source);
    }

    res.json({ saved: totalSaved });
  } catch (error: any) {
    res.status(500).json({ error: "저장 실패", detail: error.message });
  }
};

export const saveCrawlByUrlHandler = async (req: Request, res: Response) => {
  try {
    const { url } = req.body as { url: string };
    if (!url) return res.status(400).json({ error: "url은 필수입니다." });

    const job = await saveJob(url);
    res.json({ job });
  } catch (error: any) {
    res.status(500).json({ error: "저장 실패", detail: error.message });
  }
};

export const getLowQualityJobsHandler = async (req: Request, res: Response) => {
  try {
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data: pageData, error } = await supabase
        .from("job_postings")
        .select("id, title, company_name, source_url, external_id, location, experience, content, company_logo, deadline, source_site_name")
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!pageData || pageData.length === 0) break;

      allData = allData.concat(pageData);
      if (pageData.length < pageSize) break;
      from += pageSize;
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const jobs = allData
      .map(job => {
        const reasons: string[] = [];

        if (!job.title || !job.company_name || !job.source_url || !job.external_id)
          reasons.push("필수필드누락");

        if (job.deadline && new Date(job.deadline) < oneMonthAgo)
          reasons.push("마감만료");

        const fields = [job.title, job.company_name, job.location, job.experience,
                        job.content, job.company_logo, job.deadline, job.source_url, job.external_id];
        const missingCount = fields.filter(f => !f).length;
        if (missingCount >= 4)
          reasons.push(`${missingCount}개 누락`);

        return { ...job, reasons };
      })
      .filter(job => job.reasons.length > 0);

    const jobIds = jobs.map(j => j.id);

    const [appRes, commentRes, scheduleRes, interestedRes] = await Promise.all([
      supabase.from("applications").select("job_posting_id").in("job_posting_id", jobIds),
      supabase.from("comments").select("job_posting_id").in("job_posting_id", jobIds),
      supabase.from("schedules").select("job_posting_id").in("job_posting_id", jobIds).not("job_posting_id", "is", null),
      supabase.from("user_interested_jobs").select("job_posting_id").in("job_posting_id", jobIds),
    ]);

    const relatedMap: Record<string, string[]> = {};
    const addRelated = (rows: any[], label: string) => {
      for (const row of rows || []) {
        const id = row.job_posting_id;
        if (!relatedMap[id]) relatedMap[id] = [];
        relatedMap[id].push(label);
      }
    };

    addRelated(appRes.data || [], "지원");
    addRelated(commentRes.data || [], "댓글");
    addRelated(scheduleRes.data || [], "일정");
    addRelated(interestedRes.data || [], "관심공고");

    const jobsWithRelated = jobs.map(job => ({
      ...job,
      relatedTables: relatedMap[job.id] || [],
    }));

    res.json({ total: jobsWithRelated.length, jobs: jobsWithRelated });
  } catch (error: any) {
    res.status(500).json({ error: "조회 실패", detail: error.message });
  }
};

export const deleteJobsHandler = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids || ids.length === 0) return res.status(400).json({ error: "ids는 필수입니다." });

    const { error } = await supabase
      .from("job_postings")
      .delete()
      .in("id", ids);

    if (error) throw error;

    res.json({ deleted: ids.length });
  } catch (error: any) {
    res.status(500).json({ error: "삭제 실패", detail: error.message });
  }
};
