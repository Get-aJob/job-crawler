import axios from "axios";
import * as cheerio from "cheerio";
import { CrawledJob } from "../../../types";
import { extractExternalId } from "../../utils/extractExternalId";

const extractSection = (
  text: string,
  keywords: string[],
  stopKeywords: string[]
) => {
  for (const keyword of keywords) {
    const regex = new RegExp(
      `${keyword}(?!\\s*및)\\s*([\\s\\S]*?)(?=${stopKeywords.join("|")}|$)`

    );
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  return "";
};

const fetchDetail = async (recIdx: string, referer: string) => {
  try {
    const { data } = await axios.get(
      `https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${recIdx}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: referer,
        },
        timeout: 10000,
      }
    );

    const $ = cheerio.load(data);

    const rawContent =
      $(".user_content").text().replace(/\s+/g, " ").trim() ||
      $(".wrap_view").text().replace(/\s+/g, " ").trim();

    return {
      content: rawContent,
      requirements: extractSection(
        rawContent,
        ["자격요건", "자격 요건", "지원자격", "필수사항"],
        ["우대사항", "우대 사항", "복지", "근무", "마감"]
      ),
      preferred: extractSection(
        rawContent,
        ["우대사항", "우대 사항"],
        ["자격요건", "자격 요건", "복지", "근무", "마감"]
      ),
    };
  } catch {
    return null;
  }
};

const fetchCompanyLogo = async (recIdx: string, referer: string) => {
  try {
    const { data } = await axios.get(
      `https://www.saramin.co.kr/zf_user/jobs/relay/view-ajax`,
      {
        params: { rec_idx: recIdx },
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: referer,
        },
        timeout: 10000,
      }
    );

    if (typeof data === "object") {
      return data?.company?.logo_url || "";
    }

    const $ = cheerio.load(data);
    return (
      $(".logo img").attr("src") ||
      $("img.company_logo").attr("src") ||
      ""
    );
  } catch {
    return "";
  }
};

const extractJsonFromHtml = (html: string) => {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*});/);
  if (!match || !match[1]) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const fetchFromSearch = async (recIdx: string) => {
  try {
    const searchUrl = `https://www.saramin.co.kr/zf_user/search?searchword=${recIdx}`;

    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);
    const elements = $(".item_recruit").toArray();

    for (const el of elements) {
      const link = $(el).find(".job_tit a").attr("href");
      if (!link) continue;

      const id = link.match(/rec_idx=(\d+)/)?.[1];
      if (id !== recIdx) continue;

      return {
        title: $(el).find(".job_tit a").text().trim(),
        company: $(el).find(".corp_name").text().trim(),
        location: $(el).find(".job_condition span").eq(0).text().trim(),
        experience: $(el).find(".job_condition span").eq(1).text().trim(),
        deadline: $(el).find(".job_date").text().trim(),
        url: `https://www.saramin.co.kr${link}`,
      };
    }

    return null;
  } catch {
    return null;
  }
};

export const crawlSaraminByUrl = async (
  url: string
): Promise<CrawledJob | null> => {
  try {
    const recIdx = extractExternalId(url, "saramin");
    url = `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${recIdx}`;

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(html);
    const json = extractJsonFromHtml(html);
    const jobData = json?.jobView || json?.job || null;

    const pageTitle = $("title").text().trim();
    const metaDesc = $("meta[name='description']").attr("content") || "";
    const metaParts = metaDesc.split(", ");
    const titleMatch = pageTitle.match(/\[.+?\]\s*(.+?)\s*(?:\(D-\d+\))?\s*-\s*사람인/);
    const metaTitle = titleMatch?.[1] || "";
    const metaCompany = metaParts[0] || "";
    const metaExperience = metaParts.find(p => p.startsWith("경력:"))?.replace("경력:", "") || "";
    const metaDeadline = metaParts.find(p => p.startsWith("마감일:"))?.replace("마감일:", "") || "";
    

let title =
  jobData?.title || metaTitle || $(".tit_job").text().trim() || "";

let company =
  jobData?.company?.name || metaCompany || $(".title_inner a.company").text().trim() || "";

let location =
  jobData?.location ||
  $(".jv_summary dl").filter((_, el) => $(el).find("dt").text().trim() === "근무지역")
    .find("dd").text().replace(/지도보기/g, "").trim() ||
  "";

let experience =
  jobData?.experience || metaExperience ||
  $(".jv_summary dl").filter((_, el) => $(el).find("dt").text().trim() === "경력")
    .find("dd strong").text().trim() ||
  "";

let deadline =
  jobData?.deadline || metaDeadline ||
  $(".info_period .end").next("dd").text().trim() ||
  "";


    if (!title || !company || !location) {
      const searchData = await fetchFromSearch(recIdx);

      if (searchData) {
        title = title || searchData.title;
        company = company || searchData.company;
        location = location || searchData.location;
        experience = experience || searchData.experience;
        deadline = deadline || searchData.deadline;
        url = searchData.url;
      }
    }
    const [detail, logo] = await Promise.all([
      fetchDetail(recIdx, url),
      fetchCompanyLogo(recIdx, url),
    ]);

  const locationFromContent = 
    detail?.content?.match(/근무지\s*[：:]\s*([^\s•]+)/)?.[1] ||
    detail?.content?.match(/(서울|경기|인천|부산|대전|대구|광주|울산|판교|성남|수원)/)?.[1] ||
    "";
  location = location || locationFromContent;


    return {
      externalId: recIdx,
      title,
      company,
      companyLogo: logo,
      location,
      experience,
      deadline,
      url,
      content: detail?.content || "",
      requirements: detail?.requirements || "",
      preferred: detail?.preferred || "",
      keyword: "",
    };
  } catch (error) {
    console.error("단일 크롤링 실패:", error);
    return null;
  }
};