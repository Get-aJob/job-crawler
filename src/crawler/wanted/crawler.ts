import axios from "axios";

type Job = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  deadline: string;
  url: string;
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
          Accept: "application/json, text/plain, */*",
        },
      }
    );

    const rawJobs = response.data.data; // ✅ 원본 배열

    const jobs: Job[] = rawJobs.map((item: any) => ({
      externalId: item.id.toString(),
      title: item.position,
      company: item.company?.name || "",
      location: item.address?.location || "",
      experience: item.experience_level || "",
      deadline: "",
      url: `https://www.wanted.co.kr/wd/${item.id}`,
    }));

    console.log("원티드 결과:", jobs.slice(0, 5));

    return jobs;
  } catch (error) {
    console.error("원티드 크롤링 실패:", error);
    return [];
  }
};