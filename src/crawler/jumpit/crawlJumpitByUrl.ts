import axios from "axios";
import * as cheerio from "cheerio";
import { CrawledJob } from "../../../types";
import { extractExternalId } from "../../utils/extractExternalId";

const formatCareer = (minCareer: number, maxCareer: number): string => {
  if (minCareer === 0 && maxCareer === 0) return "신입";
  if (minCareer > 0 && maxCareer >= 20) return `${minCareer}년 이상`;
  if (minCareer > 0 && maxCareer > 0) return `${minCareer}~${maxCareer}년`;
  return "";
};

export const crawlJumpitByUrl = async (url: string): Promise<CrawledJob | null> => {
  try {
    const id = extractExternalId(url, "jumpit");

    const res = await axios.get(
      `https://jumpit.saramin.co.kr/position/${id}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://jumpit.saramin.co.kr/",
        },
        timeout: 10000,
      }
    );

    const $ = cheerio.load(res.data);

    const title = $("h1").first().text().trim();

    const ogDesc = $('meta[property="og:description"]').attr("content") || "";
    const company = (ogDesc.split(" - ")[0] ?? "").trim();
    const scriptContents = $("script")
      .map((_, el) => $(el).html() || "")
      .get()
      .join("\n")
      .replace(/\\"/g, '"');

    const logoMatch = scriptContents.match(/"logo":"(https:[^"]+)"/);
    const companyLogo = logoMatch?.[1] || "";

    const locationMatch = scriptContents.match(/"location":"([^"]+)"/);
    const location = locationMatch?.[1] || "";

    const minCareerMatch = scriptContents.match(/"minCareer":(\d+)/);
    const maxCareerMatch = scriptContents.match(/"maxCareer":(\d+)/);
    const experience =
      minCareerMatch && maxCareerMatch
        ? formatCareer(parseInt(minCareerMatch[1] ?? "0"), parseInt(maxCareerMatch[1] ?? "0"))
        : "";

    const alwaysOpenMatch = scriptContents.match(/"alwaysOpen":(true|false)/);
    const closedAtMatch = scriptContents.match(/"closedAt":"([^"]+)"/);
    const deadline =
      alwaysOpenMatch?.[1] === "true"
        ? "상시채용"
        : closedAtMatch?.[1] || "";

    let requirements = "";
    let preferred = "";
    $("dl dt").each((_, el) => {
      const label = $(el).text().trim();
      const value = $(el).next("dd").text().trim();
      if (label === "자격요건") requirements = value;
      if (label === "우대사항") preferred = value;
    });

    return {
      externalId: id,
      title,
      company,
      companyLogo,
      location,
      experience,
      deadline,
      url,
      requirements,
      preferred,
      keyword: "",
    };
  } catch (error) {
    console.error("점핏 단건 크롤링 실패:", error);
    return null;
  }
};
