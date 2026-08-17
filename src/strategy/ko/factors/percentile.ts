/**
 * 값 배열에서 각 원소의 percentile rank를 계산한다 (0~1).
 * ascending=true: 값이 클수록 높은 점수 (GP/A, ROA 등)
 * ascending=false: 값이 작을수록 높은 점수 (PER, PBR 등)
 */
export function percentileRank(
  values: (number | null)[],
  ascending: boolean = true,
): number[] {
  const indexed = values.map((v, i) => ({ value: v, index: i }));
  const valid = indexed.filter((x) => x.value !== null) as {
    value: number;
    index: number;
  }[];

  const sorted = [...valid].sort((a, b) =>
    ascending ? a.value - b.value : b.value - a.value,
  );

  const result = new Array<number>(values.length).fill(0.5);

  sorted.forEach((item, rankIndex) => {
    result[item.index] = (rankIndex + 1) / sorted.length;
  });

  return result;
}
