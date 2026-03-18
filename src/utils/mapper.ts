import { CrawledJob, JobPostingInsert } from "../../types";
import { parseDeadline } from "./dateParser";

export const mapToJobPosting = (
  job: CrawledJob,
  source: string,
  userId: string
): JobPostingInsert => {
  return {
    created_by: userId,

    source_type: source,
    source_site_name: source,
    source_url: job.url,
    external_id: job.externalId,

    title: job.title,
    company_name: job.company,

    content: JSON.stringify({
      location: job.location,
      experience: job.experience,
    }),

    deadline: parseDeadline(job.deadline),
    crawled_at: new Date().toISOString(),
  };
};