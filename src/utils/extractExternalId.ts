type Platform = "wanted" | "saramin" | "incruit" | "jumpit";

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

    case "jumpit":
      return extractJumpitId(url);

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

export const extractIncruitId = (url: string): string => {
  try {
    const parsed = new URL(url);

    const jobId =
      parsed.searchParams.get("job") ||
      parsed.searchParams.get("Job");

    if (jobId) return jobId;

    const pathMatch = parsed.pathname.match(/(\d{8,})/);
    if (pathMatch?.[1]) return pathMatch[1];

    const anyMatch = url.match(/(\d{8,})/);
    if (anyMatch?.[1]) return anyMatch[1];

    throw new Error();
  } catch {
    throw new Error("인크루트 ID 추출 실패");
  }
};

const extractJumpitId = (url: string): string => {
  const match = url.match(/position\/(\d+)/);
  if (!match || !match[1]) throw new Error("점핏 ID 추출 실패");
  return match[1];
};