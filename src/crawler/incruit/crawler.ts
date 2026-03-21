import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { KEYWORDS } from "../../config/keywords";

type Job = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  deadline: string;
  url: string;
  requirements: string;
  preferred: string;
  content: string;
  companyLogo: string;

  keyword: string;
};

const getUrl = (keyword: string) =>
  `https://job.incruit.com/jobdb_list/searchjob.asp?col=job_all&kw=${encodeURIComponent(keyword)}`;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, " ")
    .replace(/우리 회사를.*?소개해주세요/g, "")
    .replace(/안녕하세요.*?연락드렸습니다\./g, "")
    .replace(/헤드헌터.*?\./g, "")
    .replace(/인크루트.*?오퍼/g, "")
    .replace(/전체메뉴.*?오퍼/g, "")
    .replace(/Email:.*?\s/g, "")
    .replace(/www\..*?\s/g, "")
    .replace(/\*.*?\*/g, "")
    .replace(/\{.*?\}/g, "")
    .replace(/\|/g, " ")
    .trim();
};

const trimBeforeKeyword = (text: string, keyword: string) => {
  const idx = text.indexOf(keyword);
  return idx !== -1 ? text.slice(idx + keyword.length) : text;
};

const trimAfterKeyword = (text: string): string => {
  const keywords = [
    "담당업무",
    "주요 업무",
    "업무 내용",
    "자격요건",
    "지원자격",
  ];

  let idx = -1;

  for (const keyword of keywords) {
    const i = text.indexOf(keyword);
    if (i !== -1) {
      idx = i;
      break;
    }
  }

  if (idx === -1) return text;
  return text.slice(idx);
};

const splitSections = (text: string) => {
  const sections: Record<string, string> = {};
  const normalize = text.replace(/\s+/g, " ");

  const patterns = [
    {
      key: "requirements",
      regex:
        /(자격\s?요건|지원\s?자격)([\s\S]*?)(우대\s?사항|우대\s?조건|근무\s?조건|$)/,
      keyword: "자격요건",
    },
    {
      key: "preferred",
      regex:
        /(우대\s?사항|우대\s?조건)([\s\S]*?)(자격\s?요건|근무\s?조건|$)/,
      keyword: "우대사항",
    },
  ];

  for (const { key, regex, keyword } of patterns) {
    const match = normalize.match(regex);
    if (match && match[2]) {
      let value = match[2].trim();
      value = trimBeforeKeyword(value, keyword);
      value = trimAfterKeyword(value) || "";
      sections[key] = value.trim();
    }
  }

  return sections;
};

const toBullet = (text: string): string => {
  return text
    .replace(/[\r\n]+/g, "\n")
    .replace(/[-•·■□▶]/g, "\n- ")
    .replace(/\s{2,}/g, "\n")
    .split("\n")
    .map(v => v.trim())
    .filter(v => v.length > 5)
    .join("\n");
};

const extractMainContent = (text: string) => {
  const startIdx =
    text.search(/(담당업무|주요 업무|업무 내용)/) !== -1
      ? text.search(/(담당업무|주요 업무|업무 내용)/)
      : 0;

  return text.slice(startIdx, startIdx + 1000);
};

const parseJobContent = (rawText: string) => {
  const cleaned = cleanText(rawText);
  const sections = splitSections(cleaned);

  const requirements = toBullet(sections.requirements || "");
  const preferred = toBullet(sections.preferred || "");
  const fallback = toBullet(extractMainContent(cleaned));

  return {
    requirements,
    preferred,
    fallback,
  };
};

export const crawlIncruit = async (): Promise<Job[]> => {
  const allJobs: Job[] = [];

  try {
    for(const keyword of KEYWORDS) {
    await delay(200);
    
    const response = await axios.get(getUrl(keyword), {
      responseType: "arraybuffer",
      headers: { "User-Agent": "Mozilla/5.0" },
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
        /(서울|경기|인천|부산|대전|대구|광주|울산)[^\|,]*/
      );

      const experienceMatch = cleaned.match(
        /(경력\s?\d+~\d+년|신입|경력)/
      );

      const rawDeadline = $(el).find(".cell_last").text();

      const externalId =
        fullUrl.match(/jobdb_info\/jobpost\.asp\?job=(\d+)/)?.[1];

      if (!externalId) return;

      jobs.push({
        externalId,
        title,
        company,
        location: locationMatch ? locationMatch[0] : "",
        experience: experienceMatch ? experienceMatch[0] : "",
        deadline: rawDeadline.replace(/\s+/g, " ").trim(),
        url: fullUrl,
        requirements: "",
        preferred: "",
        content: "",
        companyLogo: "",
        keyword
      });
    });

    // ✅ 상세페이지 처리
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await delay(200);

          // ✅ popup 페이지 (로고 있음)
          const res = await axios.get(job.url, {
            responseType: "arraybuffer",
          });

          const html = iconv.decode(res.data, "euc-kr");
          const $ = cheerio.load(html);

          // ✅ 로고는 여기서!
          let logo = "";
          const logoSrc = $(".jcinfo_logo img").attr("src");

          if (logoSrc) {
            logo = logoSrc.startsWith("http")
              ? logoSrc
              : `https:${logoSrc}`;
          }

          // ✅ iframe (내용용)
          const iframeSrc = $("iframe[src*='jobpostcont']").attr("src");

          let rawText = "";

          if (iframeSrc) {
            const iframeUrl = iframeSrc.startsWith("http")
              ? iframeSrc
              : `https://job.incruit.com${iframeSrc}`;

            const iframeRes = await axios.get(iframeUrl, {
              responseType: "arraybuffer",
            });

            const iframeHtml = iconv.decode(iframeRes.data, "euc-kr");
            const $$ = cheerio.load(iframeHtml);

            rawText = $$("body").text();
          } else {
            rawText = $("body").text();
          }

          const parsed = parseJobContent(rawText);

          job.requirements = parsed.requirements;
          job.preferred = parsed.preferred;
          job.companyLogo = logo;

          job.content = [
            parsed.requirements,
            parsed.preferred,
            parsed.fallback,
          ]
            .filter(Boolean)
            .join("\n\n");

        } catch (e: any) {
          console.error("상세 실패:", job.url, e.message);
        }
      })
    );
      allJobs.push(...jobs);
  }

      const unique = Array.from(
      new Map(allJobs.map(j => [j.externalId, j])).values()
    );

    console.log("인크루트 결과:", unique.slice(0, 5));

    return unique;
  } catch (error: any) {
    console.error("인크루트 실패:", error.message);
    return [];
  }
};