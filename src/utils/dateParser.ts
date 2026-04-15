export const parseDeadline = (raw: string): string | null => {
  if (!raw) return null;

  try {
    const cleaned = raw.replace(/\s/g, "");

    // ISO 8601 형식: "2025-11-20T..." 또는 "2025-11-20"
    // 날짜 부분만 추출해 UTC 기준으로 파싱 (타임존 없는 datetime의 로컬 파싱 방지)
    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const dateOnly = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      const date = new Date(dateOnly);
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    // YYYY.MM.DD 또는 YYYY/MM/DD 형식 (인크루트 등)
    const fullDotMatch = cleaned.match(/(\d{4})[./](\d{2})[./](\d{2})/);
    if (fullDotMatch) {
      const date = new Date(`${fullDotMatch[1]}-${fullDotMatch[2]}-${fullDotMatch[3]}`);
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    // MM.DD 또는 MM/DD 형식 (사람인 등)
    const shortMatch = cleaned.match(/(\d{2})[./](\d{2})/);
    if (shortMatch) {
      const month = shortMatch[1];
      const day = shortMatch[2];
      const year = new Date().getFullYear();
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    return null;
  } catch (e) {
    return null;
  }
};