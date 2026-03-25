type Platform = "wanted" | "saramin" | "incruit";

export const extractExternalId = (
  url: string,
  platform: Platform
): string => {
  switch (platform) {
    case "wanted":
      return extractWantedId(url);

    case "saramin":
      return extractSaraminId(url);

    case "incruit":
      return extractIncruitId(url);

    default:
      throw new Error("지원하지 않는 플랫폼");
  }
};

const extractWantedId = (url: string): string => {
    const match = url.match(/wd\/(\d+)/);

    if(!match || !match[1]) {
        throw new Error("원티드 Id 추출 실패");
    }

    return match[1];
}

const extractSaraminId = (url: string): string => {
  const match = url.match(/rec_idx=(\d+)/);

  if (!match || !match[1]) {
    throw new Error("사람인 ID 추출 실패");
  }

  return match[1];
};

const extractIncruitId = (url: string): string => {
  throw new Error("아직 구현 안됨");
};