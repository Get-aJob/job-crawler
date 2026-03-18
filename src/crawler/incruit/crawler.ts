import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";

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
  "https://job.incruit.com/jobdb_list/searchjob.asp?col=job_all&kw=backend";

export const crawlIncruit = async (): Promise<Job[]> => {
  try {
    const response = await axios.get(URL, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = iconv.decode(response.data, "euc-kr");

    const $ = cheerio.load(html);

    const jobs: Job[] = [];

    $(".c_row").each((_, el) => {
      const title = $(el).find(".cell_mid a").text().trim();
      const link = $(el).find(".cell_mid a").attr("href");

      if (!link) return;

      const fullUrl = link.startsWith("http")
        ? link
        : `https://job.incruit.com${link}`;

      const company = $(el).find(".cell_first a").text().trim();

      const conditionText = $(el)
        .find(".cell_mid")
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const cleaned = conditionText
        .replace(title, "")
        .replace("스크랩", "")
        .trim();

      const locationMatch = cleaned.match(
        /(서울|경기|인천|부산|대전|대구|광주|울산)[^\s]*/
      );

      const experienceMatch = cleaned.match(
        /(경력\s?\d+~\d+년|신입|경력)/
      );

      const location = locationMatch ? locationMatch[0] : "";
      const experience = experienceMatch ? experienceMatch[0] : "";

      const rawDeadline = $(el).find(".cell_last").text();

      const deadline = rawDeadline
      .replace(/\s+/g, " ")     
      .replace("바로지원", "")    
      .trim();

      const externalId = fullUrl.match(/jobdb_info\/jobpost\.asp\?job=(\d+)/)?.[1];
      if (!externalId) return;

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

    console.log("인크루트 결과:", jobs.slice(0, 5));

    return jobs;
  } catch (error) {
    console.error("인크루트 크롤링 실패:", error);
    return [];
  }
};