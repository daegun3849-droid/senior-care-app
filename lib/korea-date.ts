/** 한국(Asia/Seoul) 기준 날짜 유틸 — UTC todayStr 때문에 달력/오늘 일정이 하루 밀리는 문제 방지 */

export const KOREA_TZ = "Asia/Seoul";

/** 지정 시각 기준 한국 달력의 YYYY-MM-DD */
export const koreaYmd = (d: Date = new Date()): string =>
  d.toLocaleDateString("en-CA", { timeZone: KOREA_TZ });

/** DB에 저장된 ISO 시각 문자열의 '한국 날짜' YYYY-MM-DD */
export const koreaYmdFromIso = (isoStr: string): string =>
  new Date(isoStr).toLocaleDateString("en-CA", { timeZone: KOREA_TZ });

/** 현재 한국 달 연도·월 기준 해당 월 1일~말일 (YYYY-MM-DD) */
export const getKoreaMonthRange = (d: Date = new Date()): { first: string; last: string } => {
  const day = koreaYmd(d);
  const [yStr, moStr] = day.split("-");
  const y = Number(yStr);
  const mo = Number(moStr);
  const lastNum = new Date(y, mo, 0).getDate();
  const ym = `${yStr}-${moStr.padStart(2, "0")}`;
  return {
    first: `${ym}-01`,
    last: `${ym}-${String(lastNum).padStart(2, "0")}`,
  };
};
