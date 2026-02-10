import { apiFetch } from '@/src/api/client';
import type { BirdState } from '@/src/models/bird-state';
import type { TimelineEntry } from '@/src/models/timeline-entry';

type TimelineListResponse = Array<{
  analysis_date: string;
  summary_short: string | null;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
  bird_state: number;
}>;

type TimelineCompleteResponse = {
  timeline_id: string;
};

function mapBirdStateFromRisk(birdState: number): BirdState {
  if (birdState >= 4) return 'critical';
  if (birdState >= 3) return 'anxious';
  if (birdState >= 2) return 'cautious';
  return 'calm';
}

export async function fetchTimelineEntries(): Promise<TimelineEntry[]> {
  const response = await apiFetch<TimelineListResponse>('/timeline');
  return response.map((item) => ({
    id: item.analysis_date,
    date: item.analysis_date,
    summary: item.summary_short ?? item.warning_text ?? '오늘의 기록',
    tags: item.tags,
    warningText: item.warning_text,
    warningTags: item.warning_tags,
    riskLevel: item.risk_level,
    birdState: mapBirdStateFromRisk(item.bird_state),
    createdAt: new Date().toISOString(),
  }));
}

export async function completeTimelineEntry(entry: TimelineEntry): Promise<TimelineCompleteResponse> {
  return apiFetch<TimelineCompleteResponse>('/timeline/complete', {
    method: 'POST',
    body: JSON.stringify({
      entry_date: entry.date,
      bird_state: entry.birdState,
      summary_short: entry.summary,
      tags: entry.tags,
    }),
  });
}
