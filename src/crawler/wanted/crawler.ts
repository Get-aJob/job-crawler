import axios from "axios";
import { KEYWORDS } from "../../config/keywords";
import { CrawledJob } from "../../../types";


const formatCareer = (career: any) => {
  if (!career) return "";

  const { annual_from, annual_to, is_newbie, is_expert } = career;

  if (is_newbie) return "신입";
  if (annual_from && annual_to) return `${annual_from}~${annual_to}년`;
  if (annual_from && !annual_to) return `${annual_from}년 이상`;
  if (is_expert) return "경력";

  return "";
};


const fetchWantedDetail = async (jobId: number, buildId: string) => {
  try {
    const res = await axios.get(
      `https://www.wanted.co.kr/_next/data/${buildId}/wd/${jobId}.json?jobId=${jobId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.wanted.co.kr/",
        },
        timeout: 10000,
      }
    );

    const data = res.data?.pageProps?.initialData;
    if (!data) return null;

    const { requirements, preferred_points, company, career, confirm_time, close_time, due_time } = data;

    return {
      experience: formatCareer(career),
      deadline: close_time || due_time || confirm_time || "",
      companyLogo: company?.logo_image || "",
      requirements: requirements || "",
      preferred: preferred_points || "",
    };
  } catch (e) {
    console.error("상세 실패:", jobId);
    return null;
  }
};


export const crawlWanted = async (): Promise<CrawledJob[]> => {
  const allJobs: CrawledJob[] = [];

  // buildId 홈페이지에서 한 번만 추출
  let buildId: string;
  try {
    const sampleRes = await axios.get("https://www.wanted.co.kr/", {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });
    const buildIdMatch = sampleRes.data.match(/"buildId":"([^"]+)"/);
    if (!buildIdMatch) {
      console.error("원티드 buildId 추출 실패");
      return [];
    }
    buildId = buildIdMatch[1];
  } catch (e: any) {
    console.error("원티드 buildId 요청 실패:", e.message);
    return [];
  }

  for (const keyword of KEYWORDS) {
    try {
      const response = await axios.get(
        "https://www.wanted.co.kr/api/chaos/search/v1/position",
        {
          params: {
            query: keyword,
            country: "kr",
            years: -1,
            locations: "all",
            sort: "job.recommend_order",
            limit: 20,
            offset: 0,
          },
          headers: {
            "User-Agent": "Mozilla/5.0",
            Referer: "https://www.wanted.co.kr/",
          },
        }
      );

      const rawJobs: any[] = response.data?.data || [];

      for (const item of rawJobs) {
        let detail = null;
        try {
          detail = await fetchWantedDetail(item.id, buildId);
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (e: any) {
          console.error("상세 실패:", item.id, e.message);
        }

        allJobs.push({
          externalId: item.id.toString(),
          title: item.position || "",
          company: item.company?.name || "",
          companyLogo: detail?.companyLogo || "",
          location: item.address?.full_location || item.address?.location || "",
          experience: detail?.experience || "",
          deadline: detail?.deadline || "",
          url: `https://www.wanted.co.kr/wd/${item.id}`,
          requirements: detail?.requirements || "",
          preferred: detail?.preferred || "",
          keyword,
        });
      }

    } catch (error: any) {
      console.error(`원티드 키워드 실패: ${keyword}`, error.message);
    }
  }

  return allJobs;
};
