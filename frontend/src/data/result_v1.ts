import { QUIZ_V1, type QuizBundle } from './quiz_v1';

type V1TimelineEntry = {
  analysis_date: string;
  summary_short: string;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
  bird_state: number;
};

type V1DailyReport = {
  analysis_date: string;
  summary_text: string;
  long_summary?: string | null;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
  learning_items: Array<{ content_kr: string; content_fl: string }>;
};

type V1Result = {
  timeline: V1TimelineEntry[];
  dailyreport: V1DailyReport[];
};

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

function buildV1Result(): V1Result {
  const timeline = QUIZ_V1.map((bundle, index) => ({
    analysis_date: bundle.date,
    summary_short: bundle.summary.summary_text,
    tags: bundle.summary.tags,
    warning_text: bundle.summary.warning_text ?? null,
    warning_tags: bundle.summary.warning_tags ?? [],
    risk_level: bundle.summary.risk_level ?? null,
    bird_state: index + 1,
  }));

  const dailyreport = QUIZ_V1.map((bundle) => ({
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

const resultV1 = buildV1Result();

export default resultV1;
