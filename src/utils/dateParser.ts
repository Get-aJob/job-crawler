export const parseDeadline = (raw: string): string | null => {
  if (!raw) return null;

  try {
    const cleaned = raw.replace(/\s/g, "");

    // ISO 8601 형식: "2025-11-20T..." 또는 "2025-11-20"
    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    // MM.DD 또는 MM/DD 형식
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