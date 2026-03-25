import axios from "axios";
import * as cheerio from "cheerio";
import { CrawledJob } from "../../../types";
import { extractExternalId } from "../../utils/extractExternalId";

/**
 * 섹션 추출
 */
const extractSection = (
  text: string,
  keywords: string[],
  stopKeywords: string[]
) => {
  for (const keyword of keywords) {
    const regex = new RegExp(
      `${keyword}([\\s\\S]*?)(?=${stopKeywords.join("|")}|$)`
    );
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  return "";
};

/**
 * 상세 내용
 */
const fetchDetail = async (recIdx: string, referer: string) => {
  try {
    const { data } = await axios.get(
      `https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${recIdx}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: referer,
        },
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
        ["자격요건", "지원자격", "필수사항"],
        ["우대사항", "복지", "근무", "마감"]
      ),
      preferred: extractSection(
        rawContent,
        ["우대사항"],
        ["복지", "근무", "마감"]
      ),
    };
  } catch {
    return null;
  }
};

/**
 * 회사 로고
 */
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

/**
 * 🔥 JSON 추출 (핵심 트릭)
 */
const extractJsonFromHtml = (html: string) => {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*});/);
  if (!match || !match[1]) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

/**
 * 🔥 검색 fallback (정확 매칭 버전)
 */
const fetchFromSearch = async (recIdx: string) => {
  try {
    const searchUrl = `https://www.saramin.co.kr/zf_user/search?searchword=${recIdx}`;

    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(data);
    const elements = $(".item_recruit").toArray();

    for (const el of elements) {
      const link = $(el).find(".job_tit a").attr("href");
      if (!link) continue;

      // 🔥 정확한 rec_idx 비교 (중요)
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

/**
 * ✅ 최종 단일 크롤링
 */
export const crawlSaraminByUrl = async (
  url: string
): Promise<CrawledJob | null> => {
  try {
    const recIdx = extractExternalId(url, "saramin");

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(html);

    // 🔥 1. JSON 시도
    const json = extractJsonFromHtml(html);
    const jobData = json?.jobView || json?.job || null;

    let title =
      jobData?.title ||
      $(".tit_job").text().trim() ||
      $("h1").text().trim() ||
      "";

    let company =
      jobData?.company?.name ||
      $(".company_name").text().trim() ||
      $(".corp_name").text().trim() ||
      "";

    let location =
      jobData?.location ||
      $(".info_job span").eq(0).text().trim() ||
      "";

    let experience =
      jobData?.experience ||
      $(".info_job span").eq(1).text().trim() ||
      "";

    let deadline =
      jobData?.deadline ||
      $(".job_date").text().trim() ||
      "";

    // 🔥 2. 검색 fallback (부족한 경우만)
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

    // 🔥 3. 상세 + 로고
    const [detail, logo] = await Promise.all([
      fetchDetail(recIdx, url),
      fetchCompanyLogo(recIdx, url),
    ]);

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