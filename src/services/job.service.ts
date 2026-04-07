import { supabase } from "../../supabase";
import { CrawledJob } from "../../types";
import { mapToJobPosting } from "../utils/mapper";

const CREATED_BY = "890133b0-bb6c-4cdf-a7b9-fb1a181d8bbe"; 

const dedupeJobs = (jobs: CrawledJob[], source: string): CrawledJob[] => {
  const map = new Map<string, CrawledJob>();

  for (const job of jobs) {
    const key = `${source}-${job.externalId}`;

    if (!map.has(key)) {
      map.set(key, job);
    }
  }

  return Array.from(map.values());
};

export const insertJobs = async (
  jobs: CrawledJob[],
  source: string,
  sourceType: "auto" | "manual" = "auto"
) => {
  const dedupedJobs = dedupeJobs(jobs, source);

  const rows = dedupedJobs.map((job) =>
    mapToJobPosting(job, source, CREATED_BY, sourceType)
  );

  const validRows = sourceType === "auto"
    ? rows.filter((row) => {
        const isValid = row.title && row.company_name && row.source_url && row.external_id;
        if (!isValid) {
          console.warn(`[${source}] 필수 필드 누락으로 스킵:`, {
            title: row.title,
            company_name: row.company_name,
            source_url: row.source_url,
            external_id: row.external_id,
          });
        }
        return isValid;
      })
    : rows;

  const { error } = await supabase
    .from("job_postings")
    .upsert(validRows, {
      onConflict: "source_site_name,external_id",
      ignoreDuplicates: false,
    });

  if (error) {
    console.error(`[${source}] DB 삽입 실패`, error);

    throw new Error("DB_INSERT_FAILED");
  }

  console.log(`${source} 데이터 ${validRows.length}개 저장 완료`);

  return validRows.length;
};
