import axios from "axios";
import * as cheerio from "cheerio";
import { KEYWORDS } from "../../config/keywords";
import { CrawledJob } from "../../../types";

const formatCareer = (minCareer: number, maxCareer: number): string => {
  if (minCareer === 0 && maxCareer === 0) return "신입";
  if (minCareer > 0 && maxCareer >= 20) return `${minCareer}년 이상`;
  if (minCareer > 0 && maxCareer > 0) return `${minCareer}~${maxCareer}년`;
  return "";
};

const fetchJumpitDetail = async (id: number): Promise<{ requirements: string; preferred: string } | null> => {
  try {
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
    let requirements = "";
    let preferred = "";

    $("dl dt").each((_, el) => {
      const label = $(el).text().trim();
      const value = $(el).next("dd").text().trim();
      if (label === "자격요건") requirements = value;
      if (label === "우대사항") preferred = value;
    });

    return { requirements, preferred };
  } catch (e) {
    console.error("점핏 상세 실패:", id);
    return null;
  }
};


export const crawlJumpit = async (): Promise<CrawledJob[]> => {
  const allJobs: CrawledJob[] = [];

  for (const keyword of KEYWORDS) {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.get(
          "https://jumpit-api.saramin.co.kr/api/positions",
          {
            params: {
              sort: "relation",
              keyword,
              page,
            },
            headers: {
              "User-Agent": "Mozilla/5.0",
              Referer: "https://www.jumpit.co.kr/",
            },
            timeout: 10000,
          }
        );

        const result = response.data?.result;
        const positions: any[] = result?.positions || [];

        if (positions.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of positions) {
          const detail = await fetchJumpitDetail(item.id);
          await new Promise((resolve) => setTimeout(resolve, 200));

          allJobs.push({
            externalId: item.id.toString(),
            title: (item.title || "").replace(/<[^>]+>/g, ""),
            company: item.companyName || "",
            companyLogo: item.logo || "",
            location: item.locations?.[0] || "",
            experience: formatCareer(item.minCareer, item.maxCareer),
            deadline: item.alwaysOpen ? "상시채용" : item.closedAt || "",
            url: `https://www.jumpit.co.kr/position/${item.id}`,
            requirements: detail?.requirements || "",
            preferred: detail?.preferred || "",
            keyword,
          });
        }

        const totalCount = result?.totalCount || 0;
        if (page * 20 >= totalCount || page >= 2) { 
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (error: any) {
      console.error(`점핏 키워드 실패: ${keyword}`, error.message);
    }
  }

  return allJobs;
};
