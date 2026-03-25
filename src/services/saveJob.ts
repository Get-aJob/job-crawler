import { crawlJobByUrl} from "../crawler/crawlJobByUrl"
import { detectPlatform } from "../utils/detectPlatform";
import { insertJobs } from "./job.service";

export const saveJob = async (url: string) => {
  try {
    const platform = detectPlatform(url);

    if (!platform) {
      throw new Error("지원하지 않는 플랫폼");
    }

    const job = await crawlJobByUrl(url);

    if (!job) {
      console.log("크롤링 실패");
      return null;
    }

    await insertJobs([job], platform, "manual");

    console.log("저장 완료:", job.title);

    return job;

  } catch (error) {
    console.error("saveJob 실패:", error);
    return null;
  }
};