# job-crawler

공고 사이트에서 공고를 크롤링하는 서비스입니다.

# Job Crawler 구축 및 배포 가이드

이 문서는 **채용 공고 크롤러를 개발하고, Supabase에 저장하며, GitHub Actions로 자동 스케줄링하는 전체 과정**을 정리한 가이드입니다.

---

# 1. 프로젝트 개요

## 목표

- 채용 사이트 크롤링 (Wanted, Incruit 등)
- 데이터 정제 및 매핑
- Supabase DB 저장
- 자동 스케줄링 (GitHub Actions)

---

# 2. 기술 스택

- Node.js
- TypeScript
- Supabase
- Cheerio
- GitHub Actions

---

# 3. 데이터 설계 핵심

## external_id 사용 이유

- 크롤링 데이터는 중복 발생 가능
- 각 사이트의 고유 ID 필요

ex)

- Wanted: 335641
- Incruit: 2603160002730

---

## sourceType 컬럼

```ts
"CRAWLING" | "USER";
```

- 크롤링 데이터 vs 사용자 입력 데이터 구분

---

# 4. 크롤링 데이터 처리

## 문제: 마감일 데이터 형식

ex)

- "~04.15 (수)(2일전 등록)"
- "상시채용"
- "채용시 마감"

---

### 해결 방법 고민중

-> 1. 프론트에서 날짜로 파싱 가능하면 날짜로, 불가능하면 공고 링크를 통해 확인하도록 유도

```ts
if (날짜 파싱 가능) {
  deadline = ISO 날짜
} else {
  deadline = null
  deadline_text = "공고 링크 확인"
}
```

-> 2. 공고 상세 페이지 조회 API 추가해서 가져오기
-> 3. 그냥 비워놓기

---

# 5. Supabase 연결

## 환경 변수

```env
SUPABASE_PROJECT_URL=...
SUPABASE_SERVICE_ROLE_API_KEY=...
```

---

# 6. 데이터 삽입 흐름

```ts
await supabase.from("jobs").insert(mappedData);
```

---

# 7. 프로젝트 구조

## 최종 구조

```
├── .github/                # GitHub Actions 설정
├── node_modules/          # 의존성 패키지
├── src/
│   ├── crawler/           # 크롤링 실행 로직
│   ├── services/          # DB 처리
│   └── utils/             # 데이터 가공
│
├── .env                   # 환경 변수
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
│
├── supabase.ts            # Supabase 설절
├── types.ts               # 타입 정의
├── tsconfig.json
```

---

# 8. TypeScript 설정

## tsconfig.json

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "module": "commonjs",
    "target": "ES2020",
    "esModuleInterop": true,
    "strict": true
  },
  "include": ["src"]
}
```

---

# 9. 빌드 및 실행 방식

## 잘못된 방식

```bash
ts-node src/crawler/main.ts
```

문제:

- undici / Web API 충돌

---

## 올바른 방식

```bash
npm run build
node dist/crawler/main.js
```

---

# 10. GitHub Actions 설정

## 위치

```
.github/workflows/crawler.yml
```

---

## 최종 코드

```yaml
name: Job Crawler

on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  crawl:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: node -v

      - run: npm ci

      - run: npm run build

      - run: node dist/src/crawler/main.js
        env:
          SUPABASE_PROJECT_URL: ${{ secrets.SUPABASE_PROJECT_URL }}
          SUPABASE_SERVICE_ROLE_API_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_API_KEY }}
```

---

# 11. GitHub Secrets 설정

## 경로

```
Settings → Secrets and variables → Actions
```

## 추가

- SUPABASE_PROJECT_URL
- SUPABASE_SERVICE_ROLE_API_KEY

---

# 12. 트러블슈팅 정리

## File is not defined

-> 원인:

- undici + ts-node 충돌

-> 해결:

- build 후 node 실행

---

## Node 18 문제

-> 해결:

- Node 20 이상 사용

---

## Cannot find module dist/main.js

-> 원인:

- 빌드 결과 경로 불일치

-> 해결:

```bash
ls dist
```

---

# 13. 최종 결과

## 완성 상태

- 크롤링 성공
- DB 저장 성공
- 스케줄링 자동 실행

---

# 향후 개선

- 키워드 설정 가능하게 수정
- 데이터 파싱 정밀도 향상
- 유연하게 유지보수 가능하게 리팩토링 필요
