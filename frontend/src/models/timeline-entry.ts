import type { BirdState } from '@/src/models/bird-state';

export type TimelineEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  summary: string;
  tags: string[];
  warningText?: string | null;
  warningTags?: string[];
  birdState: BirdState;
  createdAt: string;
  sourceFileName?: string;
};
