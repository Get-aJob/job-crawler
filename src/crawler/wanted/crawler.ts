import axios from "axios";

type Job = {
  externalId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  experience: string;
  deadline: string;
  url: string;

  content?: string;
  requirements?: string;
  preferred?: string;
};


const formatCareer = (career: any) => {
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


const fetchWantedDetail = async (jobId: number) => {
  try {
    const res = await axios.get(
      `https://www.wanted.co.kr/_next/data/PJ03wMHBiiyh1VQyNVrYO/wd/${jobId}.json?jobId=${jobId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.wanted.co.kr/",
        },
      }
    );

    const data = res.data?.pageProps?.initialData;

    if (!data) return null;

    const {
      intro,
      main_tasks,
      requirements,
      preferred_points,
      hire_rounds,
      benefits,
      company,
      career,
      confirm_time,
      close_time,
      due_time,
    } = data;

 
    const deadline =
      close_time ||
      due_time ||
      confirm_time ||
      "";

 
    const companyLogo = company?.logo_image || "";

    const content = [
      intro && `소개\n${intro}`,
      main_tasks && `\n주요업무\n${main_tasks}`,
      requirements && `\n자격요건\n${requirements}`,
      preferred_points && `\n우대사항\n${preferred_points}`,
      benefits && `\n복지\n${benefits}`,
      hire_rounds && `\n채용절차\n${hire_rounds}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      experience: formatCareer(career),
      deadline,
      companyLogo,
      content,
      requirements: requirements || "",
      preferred: preferred_points || "",
    };
  } catch (e) {
    console.error("상세 실패:", jobId);
    return null;
  }
};


export const crawlWanted = async (): Promise<Job[]> => {
  try {
    const response = await axios.get(
      "https://www.wanted.co.kr/api/chaos/navigation/v1/results",
      {
        params: {
          country: "kr",
          job_sort: "job.popularity_order",
          years: -1,
          locations: "all",
          limit: 20,
          offset: 0,
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.wanted.co.kr/",
        },
      }
    );

    const rawJobs = response.data?.data || [];

    const jobs: Job[] = await Promise.all(
      rawJobs.map(async (item: any) => {
        const detail = await fetchWantedDetail(item.id);

        return {
          externalId: item.id.toString(),
          title: item.position || "",
          company: item.company?.name || "",

          companyLogo:
            detail?.companyLogo ||
            item.company?.logo_url ||
            "",

          location:
            item.address?.full_location ||
            item.address?.location ||
            "",

          experience:
            detail?.experience ||
            formatCareer(item.career),

          deadline:
            detail?.deadline ||
            item.due_time ||
            "",

          url: `https://www.wanted.co.kr/wd/${item.id}`,

          content: detail?.content || "",
          requirements: detail?.requirements || "",
          preferred: detail?.preferred || "",
        };
      })
    );

    console.log("원티드 결과:", jobs.slice(0, 3));

    return jobs;
  } catch (error) {
    console.error("크롤링 실패:", error);
    return [];
  }
};