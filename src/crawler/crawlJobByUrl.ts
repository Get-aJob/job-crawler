import { detectPlatform } from "../utils/detectPlatform";
import { crawlWantedByUrl } from "./wanted/crawlWantedByUrl";
import { crawlSaraminByUrl } from "./saramin/crawlSaraminByUrl";
import { crawlIncruitByUrl } from "./incruit/crawlIncruitByUrl";
import { crawlJumpitByUrl } from "./jumpit/crawlJumpitByUrl";


export const crawlJobByUrl = async (url: string) => {
  const platform = detectPlatform(url);

  if (!platform) {
    throw new Error("지원하지 않는 링크입니다.");
  }

  switch (platform) {
    case "wanted":
      return await crawlWantedByUrl(url);

    case "saramin":
      return await crawlSaraminByUrl(url);
    case "incruit":
      return await crawlIncruitByUrl(url);
    case "jumpit":
      return await crawlJumpitByUrl(url);

    default:
      throw new Error("지원하지 않는 플랫폼");
  }
};