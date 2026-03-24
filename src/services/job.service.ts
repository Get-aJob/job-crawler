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
  source: string
) => {
  try {

    const dedupedJobs = dedupeJobs(jobs, source);

    const rows = dedupedJobs.map((job) =>
      mapToJobPosting(job, source, CREATED_BY)
    );

    const { data, error } = await supabase
      .from("job_postings")
      .upsert(rows, {
        onConflict: "source_site_name,external_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`[${source}]DB 삽입 실패`);
      console.error(error);
      return;
    }

    console.log(`${source} 데이터 ${rows.length}개 저장 완료`);
  } catch (err) {
    console.error("전체 실패:", err);
  }
};