# Job Crawler

채용 사이트에서 공고를 자동으로 수집하여 Supabase DB에 저장하는 크롤링 서비스입니다.  
배치 자동 크롤링, 단일 URL 수동 크롤링, 어드민 대시보드를 제공합니다.

---

## 지원 플랫폼

|
플랫폼
|
방식
|
단일 URL 지원
|
|

---

## |

|
:---:
|
|
원티드 (Wanted)
|
API
|
✅
|
|
사람인 (Saramin)
|
HTML 파싱
|
✅
|
|
인크루트 (Incruit)
|
HTML 파싱
|
✅
|
|
점핏 (Jumpit)
|
API + HTML 파싱
|
✅
|

---

## 기술 스택

- **Runtime**: Node.js
- **Language**: TypeScript
- **DB**: Supabase (PostgreSQL)
- **HTTP**: Axios
- **HTML 파싱**: Cheerio
- **서버**: Express
- **스케줄링**: GitHub Actions

---

## 프로젝트 구조

```mermaid
mindmap
  root((job-crawler))
    src
      crawler
        wanted
          crawler.ts
          crawlWantedByUrl.ts
        saramin
          crawler.ts
          crawlSaraminByUrl.ts
        incruit
          crawler.ts
          crawlIncruitByUrl.ts
        jumpit
          crawler.ts
          crawlJumpitByUrl.ts
        crawlJobByUrl.ts
        main.ts
      controllers
        adminController.ts
      routes
        job.ts
        admin.ts
      services
        job.service.ts
        saveJob.ts
      utils
        dateParser.ts
        detectPlatform.ts
        extractExternalId.ts
        mapper.ts
      config
        keywords.ts
      public
        admin.html
      server.ts
    .github
      workflows
        crawler.yml
    supabase.ts
    types.ts

🔄 데이터 흐름

 환경 변수
프로젝트 루트에 .env 파일을 생성하세요.

SUPABASE_PROJECT_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_API_KEY=your_service_role_key

GitHub Actions 자동 실행을 위해 Repository Secrets에도 동일하게 등록해야 합니다.
Settings → Secrets and variables → Actions

🚀 실행 방법
# 의존성 설치
npm install

# API 서버 실행 (수동 크롤링 + 어드민 페이지)
npm run dev:api

# 배치 크롤러 직접 실행
npm run dev:crawler

# 빌드
npm run build

# 빌드 후 서버 실행 (운영)
npm run start

# 빌드 후 배치 크롤러 실행 (운영)
npm run start:crawler

🔑 키워드 설정
배치 크롤링 시 사용할 키워드는 src/config/keywords.ts에서 관리합니다.

export const KEYWORDS = [
  "프론트",
  "보안",
  // 원하는 키워드 추가
];

키워드를 추가하거나 변경한 뒤 커밋하면 다음 배치 크롤링부터 반영됩니다.

API
단일 URL 크롤링 + DB 저장
백엔드 서버에서 호출하는 수동 크롤링 엔드포인트입니다.

POST /api/jobs/crawl

Request Body

{
  "url": "상세공고링크"
}

Response

{
  "success": true,
  "data": { ...저장된 공고 데이터 }
}

지원 URL 형식

https://www.wanted.co.kr/wd/{id}
https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx={id}
https://job.incruit.com/jobdb_info/jobpost.asp?job={id}
https://www.jumpit.co.kr/position/{id}
어드민 페이지
서버 실행 후 브라우저에서 접속합니다.

http://localhost:3000/admin

크롤링 테스트 탭
소스(wanted / saramin / incruit / jumpit / all) 선택 후 실행
DB 저장 없이 수집 결과만 확인
수집 건수, 키워드별 통계, 빈 필드 현황 표시
전체 공고 테이블 (빈 필드 빨간색 표시)
필터: 전체 / 빈 필드 있음 / 자격요건 없음 / 마감일 없음
단일 URL 테스트 탭
특정 채용공고 URL 입력 후 크롤링 결과 즉시 확인
DB 저장 없음
각 필드별 수집 결과 표시
DB 현황 탭
전체 자동 수집 공고 수
소스별 공고 수
날짜별 수집 현황 (최근 30일)
DB 필드 품질 현황 (누락 건수)
자동 스케줄링
GitHub Actions로 6시간마다 자동 배치 크롤링이 실행됩니다.

.github/workflows/crawler.yml

항목	내용
실행 주기	매 6시간 (0 */6 * * *)
수동 실행	GitHub Actions 탭에서 workflow_dispatch 가능
Node 버전	22
데이터 구조
CrawledJob (크롤링 결과)
type CrawledJob = {
  externalId: string;   // 각 플랫폼의 고유 ID
  title: string;        // 직무명
  company: string;      // 회사명
  companyLogo?: string; // 회사 로고 URL
  location: string;     // 근무지
  experience: string;   // 경력 요건
  deadline: string;     // 마감일
  url: string;          // 공고 URL
  requirements?: string; // 자격요건
  preferred?: string;    // 우대사항
  content?: string;      // 직무 내용
  keyword: string;       // 매칭된 키워드
};

DB 중복 방지
source_site_name + external_id 조합으로 upsert하여 동일 공고 중복 저장을 방지합니다.
```
