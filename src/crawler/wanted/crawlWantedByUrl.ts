import { extractExternalId } from "../../utils/extractExternalId";
import { CrawledJob } from "../../../types";
import axios from "axios";

export const formatCareer = (career: any) => {
  if (!career) return "";

  const { annual_from, annual_to, is_newbie, is_expert } = career;

  if (is_newbie) return "신입";

  if (annual_from && annual_to) {
    return `${annual_from}~${annual_to}년`;
  }

  if (annual_from && !annual_to) {
    return `${annual_from}년 이상`;
  }

  if (is_expert) return "경력";

  return "";
};

export const crawlWantedByUrl = async (
  url: string
): Promise<CrawledJob | null> => {
  try {
    const jobId = extractExternalId(url, "wanted");

    const htmlRes = await axios.get(`https://www.wanted.co.kr/wd/${jobId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const buildIdMatch = htmlRes.data.match(/"buildId":"([^"]+)"/);
    if (!buildIdMatch) {
      console.error("원티드 buildId 추출 실패");
      return null;
    }
    const buildId = buildIdMatch[1];

    const res = await axios.get(
      `https://www.wanted.co.kr/_next/data/${buildId}/wd/${jobId}.json?jobId=${jobId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.wanted.co.kr/",
        },
      }
    );

    const data = res.data?.pageProps?.initialData;

    if (!data) return null;
         
    return {
      externalId: jobId,
      title: data.position || "",
      company: data.company?.company_name || "",
      companyLogo: data.company?.logo_image || "",
      location: data.address?.full_location || "",
      experience: formatCareer(data.career), 
      deadline:
        data.close_time || data.due_time || data.confirm_time || "",
      url,
      requirements: data.requirements || "",
      preferred: data.preferred_points || "",
      keyword: "",
    };
  } catch (error) {
    console.error("원티드 단건 크롤링 실패:", error);
    return null;
  }
};