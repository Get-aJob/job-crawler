import { CrawledJob, JobPostingInsert } from "../../types";
import { parseDeadline } from "./dateParser";

export const mapToJobPosting = (
  job: CrawledJob,
  source: string,
  userId: string
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

    source_type: source,
    source_site_name: source,
    source_url: job.url,
    external_id: job.externalId,

    title: job.title,
    company_name: job.company,

    company_logo: job.companyLogo || "",

    location: job.location,
    experience: job.experience,

    content: contentParts.length > 0
      ? contentParts.join("\n\n")
      : null,

    deadline: parseDeadline(job.deadline),
    deadline_text: job.deadline,

    crawled_at: new Date().toISOString(),
  };
};