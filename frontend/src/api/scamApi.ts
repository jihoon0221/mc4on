type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ||
  'http://localhost:8000';
const AUTH_TOKEN = process.env.EXPO_PUBLIC_AUTH_TOKEN || '';

function buildHeaders(extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...extra };
  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

async function parseError(response: Response): Promise<Error> {
  try {
    const data = (await response.json()) as ApiErrorPayload;
    const message =
      data?.detail || data?.message || `API 요청 실패: ${response.status}`;
    return new Error(message);
  } catch {
    return new Error(`API 요청 실패: ${response.status}`);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init?.headers as Record<string, string> | undefined),
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

export type UploadKakaoResponse = {
  conversation_id: string;
  upload_id: string;
  ingested_messages: number;
  skipped_messages: number;
  analysis_job_id: string | null;
  analysis_status: string | null;
  last_ingested_date: string | null;
};

export type AnalysisJobStatusResponse = {
  job_id: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DailyReportResponse = {
  report_date: string;
  summary_text: string | null;
  warning_text: string | null;
  learning_contents: Array<{
    content: string;
    content_type: string;
    review_due_date: string | null;
  }>;
};

export async function uploadKakaoChat(params: {
  file: { uri: string; name: string; type: string };
  meName?: string;
  webhookUrl?: string;
}): Promise<UploadKakaoResponse> {
  const form = new FormData();
  form.append('chat_file', params.file as unknown as Blob);
  if (params.meName) {
    form.append('me_name', params.meName);
  }
  if (params.webhookUrl) {
    form.append('webhook_url', params.webhookUrl);
  }
  return apiFetch<UploadKakaoResponse>('/upload/kakao', {
    method: 'POST',
    body: form,
  });
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJobStatusResponse> {
  return apiFetch<AnalysisJobStatusResponse>(`/analysis-jobs/${jobId}`);
}

export async function getDailyReport(reportDate: string): Promise<DailyReportResponse> {
  const encoded = encodeURIComponent(reportDate);
  return apiFetch<DailyReportResponse>(`/reports/daily?report_date=${encoded}`);
}

export async function pollAnalysisJob(params: {
  jobId: string;
  intervalMs?: number;
  timeoutMs?: number;
}): Promise<AnalysisJobStatusResponse> {
  const { jobId, intervalMs = 2000, timeoutMs = 120000 } = params;
  const startedAt = Date.now();
  while (true) {
    const status = await getAnalysisJob(jobId);
    if (status.status === 'DONE' || status.status === 'FAILED') {
      return status;
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('분석 대기 시간이 초과되었습니다.');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
