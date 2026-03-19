import axios from "axios";
import * as cheerio from "cheerio";

type Job = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  deadline: string;
  url: string;
  content?: string | undefined;
  requirements?: string;  
  preferred?: string;     
};

const extractSection = (text: string, keywords: string[], stopKeywords: string[]) => {
  for (const keyword of keywords) {
    const regex = new RegExp(
      `${keyword}([\\s\\S]*?)(?=${stopKeywords.join("|")}|$)`
    );
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};

const fetchDetail = async (recIdx: string, referer: string) => {
  try {
    const url = `https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${recIdx}`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": referer,
      },
    });

    const $ = cheerio.load(data);

    const rawContent = $(".user_content").text().replace(/\s+/g, " ").trim();

const requirements = extractSection(
  rawContent,
  ["자격요건", "지원자격"],
  ["우대사항", "복지", "근무", "마감"]
);

const preferred = extractSection(
  rawContent,
  ["우대사항"],
  ["복지", "근무", "마감"]
);

    return {
      content: rawContent,
      requirements,
      preferred,
    };
  } catch (err) {
    console.error("상세 크롤링 실패:", err);
    return null;
  }
};

const URL =
  "https://www.saramin.co.kr/zf_user/search?searchword=backend";

export const crawlSaramin = async (): Promise<Job[]> => {
  const jobs: Job[] = [];

  try {
    const { data } = await axios.get(URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(data);

    const elements = $(".item_recruit").toArray();

    for (const el of elements) {
      const title = $(el).find(".job_tit a").text().trim();
      const link = $(el).find(".job_tit a").attr("href");
      if (!link) continue;

      const externalId = link.match(/rec_idx=(\d+)/)?.[1];
      if (!externalId) continue;

      const company = $(el).find(".corp_name").text().trim();
      const location = $(el).find(".job_condition span").eq(0).text().trim();
      const experience = $(el).find(".job_condition span").eq(1).text().trim();
      const deadline = $(el).find(".job_date").text().trim();

      const fullUrl = `https://www.saramin.co.kr${link}`;

      if (!title || !company) continue;

    const detail = await fetchDetail(externalId, fullUrl);

    const job: Job = {
      externalId,
      title,
      company,
      location,
      experience,
      deadline,
      url: fullUrl,
    };

    if (detail?.content) job.content = detail.content;
    if (detail?.requirements) job.requirements = detail.requirements;
    if (detail?.preferred) job.preferred = detail.preferred;

    jobs.push(job);
      
    }

    return jobs;
  } catch (error) {
    console.error("크롤링 실패:", error);
    return [];
  }
};