import { supabase } from "../../supabase";
import { CrawledJob } from "../../types";
import { mapToJobPosting } from "../utils/mapper";

const CREATED_BY = "890133b0-bb6c-4cdf-a7b9-fb1a181d8bbe"; // 크롤링용 유저

export const insertJobs = async (
  jobs: CrawledJob[],
  source: string
) => {
  try {
    const rows = jobs.map((job) =>
      mapToJobPosting(job, source, CREATED_BY)
    );

    const { data, error } = await supabase
      .from("job_postings")
      .upsert(rows, {
        onConflict: "source_type,external_id",
      });

    if (error) {
      console.error("DB 삽입 실패:", error);
      return;
    }

    console.log(`${source} 데이터 ${rows.length}개 저장 완료`);
  } catch (err) {
    console.error("전체 실패:", err);
  }
};