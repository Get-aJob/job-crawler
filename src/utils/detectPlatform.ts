export const detectPlatform = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    if (hostname.includes("wanted.co.kr")) return "wanted";
    if (hostname.includes("saramin.co.kr")) return "saramin";
    if (hostname.includes("incruit.com")) return "incruit";

    return null;
  } catch (error) {
    return null;
  }
};