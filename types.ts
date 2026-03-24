export type CrawledJob = {
  externalId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  experience: string;
  deadline: string;
  url: string;

  requirements?: string;
  preferred?: string;
  content?: string;

  keyword : string;
};

export type JobPostingInsert = {
  created_by: string;
  source_type: string;
  source_site_name: string;
  source_url: string;
  external_id: string;

  title: string;
  company_name: string;
  company_logo?: string;

  location: string;
  experience: string;

  content: string | null;

  deadline: string | null;
  deadline_text: string | null;

  crawled_at: string;
};