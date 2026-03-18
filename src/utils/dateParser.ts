export const parseDeadline = (raw: string): string | null => {
  if (!raw) return null;

  try {
    const cleaned = raw.replace(/\s/g, "");

    const match = cleaned.match(/(\d{2})[./](\d{2})/);

    if (!match) return null;

    const month = match[1];
    const day = match[2];

    const year = new Date().getFullYear();

    const date = new Date(`${year}-${month}-${day}`);

    if (isNaN(date.getTime())) return null;

    return date.toISOString();
  } catch (e) {
    return null;
  }
};