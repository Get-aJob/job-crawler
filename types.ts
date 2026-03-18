export type CrawledJob = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  deadline: string;
  url: string;
};

export type JobPostingInsert = {
  created_by: string;
  source_type: string;
  source_site_name: string;
  source_url: string;
  external_id: string;

  title: string;
  company_name: string;

  content: string | null;
  deadline: string | null;
  crawled_at: string;
};