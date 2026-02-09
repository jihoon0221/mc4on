import type { AnalysisResult } from '@/src/models/analysis-result';
import type { BirdState } from '@/src/models/bird-state';
import type { TimelineEntry } from '@/src/models/timeline-entry';
import { QUIZ_V2 } from './quiz_v2';
import type { QuizBundle } from './quiz_v1';

type V2TimelineEntry = {
  analysis_date: string;
  summary_short: string;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
  bird_state: number;
};

type V2DailyReport = {
  analysis_date: string;
  summary_text: string;
  long_summary?: string | null;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
  learning_items: Array<{ content_kr: string; content_fl: string }>;
};

export type V2Result = {
  timeline: V2TimelineEntry[];
  dailyreport: V2DailyReport[];
};

function birdStateFromRiskLevel(level?: number | null): BirdState {
  const value = level ?? 0;
  if (value >= 4) return 'anxious';
  if (value >= 3) return 'anxious';
  if (value >= 2) return 'cautious';
  return 'calm';
}

function buildLearningItems(bundle: QuizBundle) {
  return bundle.quizzes.map((quiz) => {
    if (quiz.type === 'sentence_order') {
      return {
        content_kr: quiz.korean ?? '',
        content_fl: quiz.answer?.join(' ') ?? '',
      };
    }
    return {
      content_kr: quiz.prompt ?? '',
      content_fl: quiz.options?.[quiz.answerIndex ?? 0] ?? '',
    };
  });
}

export function buildV2Result(): V2Result {
  const timeline = QUIZ_V2.map((bundle) => ({
    analysis_date: bundle.date,
    summary_short: bundle.summary.summary_text,
    tags: bundle.summary.tags,
    warning_text: bundle.summary.warning_text ?? null,
    warning_tags: bundle.summary.warning_tags ?? [],
    risk_level: bundle.summary.risk_level ?? null,
    bird_state: bundle.summary.risk_level ?? 0,
  }));

  const dailyreport = QUIZ_V2.map((bundle) => ({
    analysis_date: bundle.date,
    summary_text: bundle.summary.summary_text,
    long_summary: bundle.summary.long_summary ?? null,
    tags: bundle.summary.tags,
    warning_text: bundle.summary.warning_text ?? null,
    warning_tags: bundle.summary.warning_tags ?? [],
    risk_level: bundle.summary.risk_level ?? null,
    learning_items: buildLearningItems(bundle),
  }));

  return { timeline, dailyreport };
}

export function pickNextV2Bundle(existingDates: string[]): QuizBundle | null {
  if (QUIZ_V2.length === 0) return null;
  for (let i = 0; i < QUIZ_V2.length; i += 1) {
    const bundle = QUIZ_V2[i];
    let found = false;
    for (let j = 0; j < existingDates.length; j += 1) {
      if (existingDates[j] === bundle.date) {
        found = true;
        break;
      }
    }
    if (!found) {
      return bundle;
    }
  }
  return QUIZ_V2[QUIZ_V2.length - 1];
}

export function buildV2AnalysisResult(bundle: QuizBundle): AnalysisResult {
  return {
    analysis_date: bundle.date,
    summary_text: bundle.summary.summary_text ?? null,
    long_summary: bundle.summary.long_summary ?? null,
    tags: bundle.summary.tags ?? [],
    warning_text: bundle.summary.warning_text ?? null,
    warning_tags: bundle.summary.warning_tags ?? [],
    risk_level: bundle.summary.risk_level ?? null,
    learning_items: buildLearningItems(bundle).map((item) => ({
      content_kr: item.content_kr,
      content_fl: item.content_fl,
      content_type: 'sentence',
      review_due_date: null,
    })),
  };
}

export function buildV2TimelineEntry(bundle: QuizBundle): TimelineEntry {
  return {
    id: bundle.date,
    date: bundle.date,
    summary: bundle.summary.summary_text,
    tags: bundle.summary.tags ?? [],
    warningText: bundle.summary.warning_text ?? null,
    warningTags: bundle.summary.warning_tags ?? [],
    riskLevel: bundle.summary.risk_level ?? null,
    birdState: birdStateFromRiskLevel(bundle.summary.risk_level),
    createdAt: new Date().toISOString(),
  };
}

const resultV2 = buildV2Result();

export default resultV2;
