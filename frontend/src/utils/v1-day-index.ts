import { QUIZ_V1 } from '@/src/data/quiz_v1';

const V1_DATE_INDEX = new Map<string, number>(
  QUIZ_V1.map((bundle, index) => [bundle.date, index + 1])
);

export function getV1DayIndex(date?: string | null): number | null {
  if (!date) return null;
  return V1_DATE_INDEX.get(date) ?? null;
}
