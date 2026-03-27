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
    source_url: truncate(job.url, 500),
    external_id: truncate(job.externalId, 100),

    title: truncate(job.title, 500),
    company_name: truncate(job.company, 200),

    company_logo: job.companyLogo && job.companyLogo.length > 500 ? "" : (job.companyLogo || ""),

    location: truncate(job.location, 500),
    experience: truncate(job.experience, 200),

    content: contentParts.length > 0
      ? contentParts.join("\n\n")
      : null,

    deadline: parseDeadline(job.deadline),
    deadline_text: truncate(job.deadline, 100),

    crawled_at: new Date().toISOString(),
  };
};