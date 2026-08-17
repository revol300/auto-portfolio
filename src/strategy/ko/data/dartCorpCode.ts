import { getDartClient } from "./dartClient.js";
import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";

interface CorpCodeEntry {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  modify_date: string;
}

let cachedMap: Map<string, string> | null = null;

/**
 * DART corpCode.xml을 다운로드하여 종목코드 → corp_code 매핑을 반환한다.
 * 매 실행 시 최신 데이터를 받아오므로 상폐/신규상장이 자동 반영된다.
 */
export async function fetchCorpCodeMap(): Promise<Map<string, string>> {
  if (cachedMap) return cachedMap;

  console.log("[DART] corp_code 매핑 다운로드 중...");

  const client = getDartClient();
  const res = await client.get("/corpCode.xml", {
    responseType: "arraybuffer",
  });

  const zip = new AdmZip(Buffer.from(res.data));
  const entry = zip.getEntries()[0];
  const xml = entry.getData().toString("utf-8");

  const parser = new XMLParser();
  const parsed = parser.parse(xml);

  const list: CorpCodeEntry[] = parsed.result?.list ?? [];

  // stock_code가 있는 상장사만 (비상장사는 stock_code가 빈 문자열)
  cachedMap = new Map();
  for (const item of list) {
    if (item.stock_code && String(item.stock_code).trim()) {
      cachedMap.set(String(item.stock_code).padStart(6, "0"), String(item.corp_code).padStart(8, "0"));
    }
  }

  console.log(`[DART] 상장사 ${cachedMap.size}개 매핑 완료`);
  return cachedMap;
}
