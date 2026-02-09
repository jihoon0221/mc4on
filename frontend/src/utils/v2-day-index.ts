import { QUIZ_V2 } from '@/src/data/quiz_v2';

const V2_DATE_INDEX = new Map<string, number>(
  QUIZ_V2.map((bundle, index) => [bundle.date, index + 1])
);

export function getV2DayIndex(date?: string | null): number | null {
  if (!date) return null;
  return V2_DATE_INDEX.get(date) ?? null;
}
