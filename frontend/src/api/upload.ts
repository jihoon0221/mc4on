import { apiUpload } from '@/src/api/client';
import type { AnalysisResult, LearningItem } from '@/src/models/analysis-result';

type LearningItemResponse =
  | LearningItem
  | {
      content: string;
      content_type: string;
      review_due_date: string | null;
    };

export type KakaoUploadResponse = {
  conversation_id: string;
  upload_id: string | null;
  ingested_messages: number;
  skipped_messages: number;
  analysis_job_id: string | null;
  analysis_status: string | null;
  analysis_jobs?: Array<{
    analysis_date: string;
    analysis_job_id: string;
    analysis_status: string;
  }>;
  last_ingested_date: string | null;
  upload_date?: string | null;
  analysis_result: null | (Omit<AnalysisResult, 'learning_items'> & { learning_items?: LearningItemResponse[] });
};

type KakaoUploadInput = {
  file: {
    uri: string;
    name: string;
    mimeType?: string;
  };
  meName?: string | null;
  force?: boolean;
  syncAnalysis?: boolean;
};

export async function uploadKakao(input: KakaoUploadInput): Promise<KakaoUploadResponse> {
  const formData = new FormData();
  formData.append('chat_file', {
    uri: input.file.uri,
    name: input.file.name,
    type: input.file.mimeType ?? 'text/plain',
  } as unknown as Blob);
  formData.append('sync_analysis', input.syncAnalysis ? 'true' : 'false');
  if (input.meName) {
    formData.append('me_name', input.meName);
  }
  if (input.force) {
    formData.append('force', 'true');
  }

  return apiUpload<KakaoUploadResponse>('/upload/kakao', formData);
}
