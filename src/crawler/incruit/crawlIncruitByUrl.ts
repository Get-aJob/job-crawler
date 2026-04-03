import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { extractExternalId } from "../../utils/extractExternalId";
import { CrawledJob } from "../../../types";


const cleanText = (text: string): string => {
  return text
    .replace(/^\s*[\]}\[{>]+\s*/gm, "")
    .replace(/\s+/g, " ")
    .replace(/우리 회사를.*?소개해주세요/g, "")
    .replace(/안녕하세요.*?연락드렸습니다\./g, "")
    .replace(/헤드헌터.*?\./g, "")
    .replace(/인크루트.*?오퍼/g, "")
    .replace(/전체메뉴.*?오퍼/g, "")
    .replace(/Email:.*?\s/g, "")
    .replace(/www\..*?\s/g, "")
    .replace(/\*.*?\*/g, "")
    .replace(/\{.*?\}/g, "")
    .replace(/\|/g, " ")
    .replace(/(?<![A-Za-z0-9])\$(?![A-Za-z0-9])/g, "")
    .trim();
};

const normalizeContent = (text: string) => {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/(모집|채용|업무|자격|우대|조건)/g, "\n$1")
    .split("\n")
    .map(v => v.trim())
    .filter(v => v.length > 5)
    .join("\n");
};

const cleanTitle = (title: string) => {
  return title
    .replace(/\s*-\s*인크루트.*$/, "")
    .replace(/^\s*채용\s*:\s*/, "")
    .replace(/\s*채용\s*:\s*/, "")
    .trim();
};

const trimBeforeKeyword = (text: string, keyword: string) => {
  const idx = text.indexOf(keyword);
  return idx !== -1 ? text.slice(idx + keyword.length) : text;
};

const trimAfterKeyword = (text: string): string => {
  const keywords = ["담당업무", "주요 업무", "업무 내용", "자격요건", "지원자격"];

  let idx = -1;
  for (const keyword of keywords) {
    const i = text.indexOf(keyword);
    if (i !== -1) {
      idx = i;
      break;
    }
  }

  if (idx === -1) return text;
  return text.slice(idx);
};

const splitSections = (text: string) => {
  const sections: Record<string, string> = {};
  const normalize = text.replace(/\s+/g, " ");

  const patterns = [
    {
      key: "requirements",
      regex:
        /(자격\s?요건|지원\s?자격|\[자격\s?요건[^\]]*\])([\s\S]*?)(우대\s?사항|우대\s?조건|우대\s?내용|기타\s?우대|근무\s?조건|근무\s?시간|급여\s?조건|급여\s?수준|전형\s?단계|전형\s?방법|전형\s?절차|제출\s?서류|접수\s?방법|고용\s?형태|유의\s?사항|$)/,
      keyword: "자격요건",
    },
    {
      key: "preferred",
      regex:
        /(우대\s?사항|우대\s?조건|우대\s?내용|기타\s?우대|\[우대\s?사항[^\]]*\])([\s\S]*?)(자격\s?요건|담당\s?업무|근무\s?조건|전형\s?단계|전형\s?방법|전형\s?절차|제출\s?서류|접수\s?방법|고용\s?형태|유의\s?사항|$)/,
      keyword: "우대사항",
    },
  ];


  for (const { key, regex, keyword } of patterns) {
    const match = normalize.match(regex);
    if (match && match[2]) {
      let value = match[2].trim();
      value = trimBeforeKeyword(value, keyword);
      value = trimAfterKeyword(value) || "";
      sections[key] = value.trim();
    }
  }

  return sections;
};

const toBullet = (text: string): string => {
  return text
    .replace(/[\r\n]+/g, "\n")
    .replace(/[-•·■□▶]/g, "\n- ")
    .replace(/\s{2,}/g, "\n")
    .split("\n")
    .map(v => v.trim())
    .filter(v => v.length > 5)
    .join("\n");
};

const extractMainContent = (text: string) => {
  const startIdx =
    text.search(/(담당업무|주요 업무|업무 내용)/) !== -1
      ? text.search(/(담당업무|주요 업무|업무 내용)/)
      : 0;

  return text.slice(startIdx, startIdx + 1000);
};

const parseJobContent = (rawText: string) => {
  const cleaned = cleanText(rawText);
  const sections = splitSections(cleaned);

  const requirements = toBullet(sections.requirements || "");
  const preferred = toBullet(sections.preferred || "");
  const fallback = toBullet(extractMainContent(cleaned));

  return {
    requirements,
    preferred,
    fallback,
  };
};


export const crawlIncruitByUrl = async (
  url: string
): Promise<CrawledJob | null> => {
  try {
    const jobId = extractExternalId(url, "incruit");

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const html = iconv.decode(response.data, "euc-kr");
    const $ = cheerio.load(html);

    const titleRaw =
      $(".jcinfo_tit").text().trim() ||
      $("title").text().trim();

    let title = cleanTitle(titleRaw);
    const company =
      $(".jcinfo_top a").first().text().trim() ||
      $(".jcinfo_top").text().trim() ||
      $(".cpname").text().trim() ||
      $("meta[property='og:site_name']").attr("content") ||
      "";

      const companyShort = company
    .replace(/^\(주\)|^주식회사\s*|^\(사\)|^\(유\)/g, "")
    .replace(/\(주\)$|\(사\)$|\(유\)$/g, "")
    .trim();

    if (company && title.startsWith(company)) {
      title = title.slice(company.length).trim();
    } else if (companyShort && title.startsWith(companyShort)) {
      title = title.slice(companyShort.length).trim();
    }

    const escapedCompany = companyShort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title.replace(new RegExp(`^\\[${escapedCompany}\\]\\s*`), "").trim();

    let logo = "";
    const logoSrc = $(".jcinfo_logo img").attr("src");
    if (logoSrc) {
      logo = logoSrc.startsWith("http")
        ? logoSrc
        : `https:${logoSrc}`;
    }

    const iframeSrc =
      $("iframe[src*='jobpostcont']").attr("src") ||
      $("iframe").first().attr("src");

    let rawText = "";

    if (iframeSrc) {
      const iframeUrl = iframeSrc.startsWith("http")
        ? iframeSrc
        : `https://job.incruit.com${iframeSrc}`;

      const iframeRes = await axios.get(iframeUrl, {
        responseType: "arraybuffer",
      });

      const iframeHtml = iconv.decode(iframeRes.data, "euc-kr");
      const $$ = cheerio.load(iframeHtml);

      $$("style, script").remove();

      rawText =
        $$(".job_cont, .jobview, #job_detail, .content, .view_cont, .detail_view").text() ||
        $$("body").text();
    } else {
      $("style, script").remove();
      rawText =
        $(".job_cont, .jobview, #job_detail, .content, .view_cont, .detail_view").text() ||
        $("body").text();
    }

    const normalized = normalizeContent(rawText);
    const parsed = parseJobContent(normalized);

    const rawRequirements =
      parsed.requirements ||
      normalized.match(/(자격요건|지원자격)([\s\S]*?)(우대|조건|$)/)?.[2] ||
      "";

    const cleanSection = (text: string) =>
      text
        .replace(/^[^\[\]\n]*\]\s*/gm, "")
        .replace(/^[\-\]}\[{>:\s]+/gm, "")
        .trim();


    const requirements = cleanSection(rawRequirements.length > 500 ? "" : rawRequirements);

    const preferred = cleanSection(
      parsed.preferred ||
      normalized.match(/(우대사항|우대조건)([\s\S]*?)(자격|조건|$)/)?.[2] ||
      ""
    );

    const infoText = $(".jcinfo_detail, .jcinfo_list, .tb_detail").text();
    const infoTextFallback = $("ul.jc_list").text();

    const locationMatch =
      infoText.match(/(서울|경기|인천|부산|대전|대구|광주|울산|세종|전국)[^\n\t]*/) ||
      infoTextFallback.match(/(서울|경기|인천|부산|대전|대구|광주|울산|세종|전국)[^\n\t]*/);

    const experienceMatch =
      infoText.match(/(경력\s?\d+~\d+년|신입무관|경력무관|신입|인턴|경력)/) ||
      normalized.match(/(경력\s?\d+~\d+년|신입무관|경력무관|신입|인턴|경력)/);


    const deadlineRaw =
      $(".dday, .date, .jcinfo_date")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean);

    const deadline = [...new Set(deadlineRaw)].join("");

    const content = [
      requirements && `자격요건\n${requirements}`,
      preferred && `우대사항\n${preferred}`,
      (!requirements && !preferred) && `상세내용\n${normalized.slice(0, 2000)}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      externalId: jobId,
      title,
      company,
      companyLogo: logo,
      location: locationMatch ? locationMatch[0].trim() : "",
      experience: experienceMatch ? experienceMatch[0] : "",
      deadline,
      url,
      content,
      requirements,
      preferred,
      keyword: "",
    };

  } catch (error) {
    console.error("인크루트 단건 크롤링 실패:", url, error);
    return null;
  }
};