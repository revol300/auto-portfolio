import { STRATEGY } from "../config/strategy.js";

export function isRebalanceMonth(date: Date): boolean {
  const month = date.getMonth() + 1;
  return STRATEGY.REBALANCE_MONTHS.includes(month);
}

export function getQuarterLabel(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

export async function isLastTradingDay(date: Date): Promise<boolean> {
  const year = date.getFullYear();
  const month = date.getMonth();

  const lastDayOfMonth = new Date(year, month + 1, 0);

  // 월말에서 거슬러 올라가며 마지막 영업일(월~금) 찾기
  let lastBusinessDay = new Date(lastDayOfMonth);
  while (lastBusinessDay.getDay() === 0 || lastBusinessDay.getDay() === 6) {
    lastBusinessDay.setDate(lastBusinessDay.getDate() - 1);
  }

  // TODO: 한국 공휴일 체크 추가 가능
  // 현재는 주말만 제외한 단순 판정

  return (
    date.getFullYear() === lastBusinessDay.getFullYear() &&
    date.getMonth() === lastBusinessDay.getMonth() &&
    date.getDate() === lastBusinessDay.getDate()
  );
}
