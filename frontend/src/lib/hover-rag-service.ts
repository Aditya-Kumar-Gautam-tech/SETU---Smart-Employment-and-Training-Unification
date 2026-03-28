import { apiRequest } from "@/lib/api";

export interface HoverInsightJob {
  id: string;
  title: string;
  company: string;
  description?: string;
  tags?: string[];
}

export interface HoverResumeMeta {
  name?: string;
  skills?: string[];
}

export interface HoverInsightSuggestion {
  type: string;
  action: string;
  why: string;
}

export interface HoverInsightsResponse {
  match_score: number;
  gap: string;
  suggestions: HoverInsightSuggestion[];
}

export async function fetchHoverInsights(
  job: HoverInsightJob,
  token: string,
  resumeMeta?: HoverResumeMeta,
) {
  const sanitizedResumeMeta =
    resumeMeta && (resumeMeta.name?.trim() || (resumeMeta.skills?.length ?? 0) > 0)
      ? {
          ...(resumeMeta.name?.trim() ? { name: resumeMeta.name.trim() } : {}),
          ...(resumeMeta.skills?.length ? { skills: resumeMeta.skills } : {}),
        }
      : undefined;

  return apiRequest<HoverInsightsResponse>("/api/rag/insights/", {
    method: "POST",
    body: JSON.stringify(
      sanitizedResumeMeta
        ? {
            job,
            resume_meta: sanitizedResumeMeta,
          }
        : { job },
    ),
    token,
  });
}
