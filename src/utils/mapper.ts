import { CrawledJob, JobPostingInsert } from "../../types";
import { parseDeadline } from "./dateParser";


const truncate = (str: string | undefined | null, length: number = 500): string => {
  if (!str) return "";
  return str.length > length ? str.substring(0, length) : str;
};

export const mapToJobPosting = (
  job: CrawledJob,
  source: string,
  userId: string,
  sourceType: "auto" | "manual" = "auto"
): JobPostingInsert => {
  // DB 스키마 제약 사항 (Varying(500) 등) validation
  if (job.externalId.length > 100) {
    throw new Error(`외부 ID가 너무 깁니다: ${job.externalId}`);
  }
  if (job.url.length > 500) {
    throw new Error(`원본 URL이 너무 깁니다: ${job.url}`);
  }

  const contentParts: string[] = [];

  if (job.requirements) {
    contentParts.push(`[지원자격]\n${job.requirements}`);
  }

  if (job.preferred) {
    contentParts.push(`[우대사항]\n${job.preferred}`);
  }
  return {
    created_by: userId,

    source_type: sourceType,
    source_site_name: source,
    source_url: job.url,
    external_id: job.externalId,

    title: truncate(job.title, 500),
    company_name: truncate(job.company, 200),

    company_logo: job.companyLogo && job.companyLogo.length > 500 ? "" : (job.companyLogo || ""),

    location: truncate(job.location, 500),
    experience: truncate(job.experience, 200),

    content: contentParts.length > 0
      ? contentParts.join("\n\n")
      : (job.content || null),


    deadline: parseDeadline(job.deadline),
    deadline_text: truncate(job.deadline, 100),

    crawled_at: new Date().toISOString(),
  };
};