export type LearningItem = {
  content_kr: string;
  content_fl: string;
  content_type: string;
  review_due_date: string | null;
};

export type AnalysisResult = {
  analysis_date: string;
  summary_text: string | null;
  long_summary?: string | null;
  tags: string[];
  warning_text: string | null;
  warning_tags: string[];
  risk_level: number | null;
  learning_items: LearningItem[];
};
