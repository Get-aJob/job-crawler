import { detectPlatform } from "../utils/detectPlatform";
import { crawlWantedByUrl } from "./wanted/crawlWantedByUrl";


export const crawlJobByUrl = async (url: string) => {
  const platform = detectPlatform(url);

  if (!platform) {
    throw new Error("지원하지 않는 링크입니다.");
  }

  switch (platform) {
    case "wanted":
      return await crawlWantedByUrl(url);

    case "saramin":
    case "incruit":
      throw new Error("아직 구현 안됨");

    default:
      throw new Error("지원하지 않는 플랫폼");
  }
};