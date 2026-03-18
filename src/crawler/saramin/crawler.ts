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
};

const URL =
  "https://www.saramin.co.kr/zf_user/search?searchword=backend";

export const crawlSaramin = async () : Promise<Job[]> => {
  const jobs: Job[] = [];

  try {
    const { data } = await axios.get(URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(data);

    $(".item_recruit").each((_, el) => {
      const title = $(el).find(".job_tit a").text().trim();
      const link = $(el).find(".job_tit a").attr("href");
      if (!link) return;

      const externalId = link?.match(/rec_idx=(\d+)/)?.[1];
      if (!externalId) return;


      const company = $(el).find(".corp_name").text().trim();
      const location = $(el).find(".job_condition span").eq(0).text().trim();
      const experience = $(el).find(".job_condition span").eq(1).text().trim();
      const deadline = $(el).find(".job_date").text().trim();

     const fullUrl = `https://www.saramin.co.kr${link}`;

     if (!title || !company) return;

      jobs.push({
        externalId,
        title,
        company,
        location,
        experience,
        deadline,
        url: fullUrl,
      });
    });

    return jobs;
    console.log(jobs.length);
    console.log(jobs[0]); 
  } catch (error) {
    console.error("크롤링 실패:", error);
    return [];
  }
};