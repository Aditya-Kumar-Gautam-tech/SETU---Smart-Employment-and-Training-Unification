import { apiRequest } from "@/lib/api";

export interface ResumeUploadResponse {
  message: string;
  resume_id: number;
  extracted_skills: string[];
}

export interface ResumeSkillsResponse {
  extracted_skills: string[];
  verified_skills: string[] | null;
  parsed_resume?: {
    parsed_data?: {
      name?: string;
      skills?: string[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
  parser_source?: string;
}

export interface VerifySkillsResponse {
  message: string;
  verified_skills: string[];
}

export interface ScrapedJob {
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  score: number;
  matched_skills: string[];
  link: string | null;
}

export interface ScrapedJobsResponse {
  resume_id: number;
  skills_used: string[];
  query: string;
  jobs: ScrapedJob[];
}

export async function uploadResume(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<ResumeUploadResponse>("/resume/upload/", {
    method: "POST",
    body: formData,
    token,
  });
}

export async function getResumeSkills(token: string) {
  return apiRequest<ResumeSkillsResponse>("/resume/skills/", {
    method: "GET",
    token,
  });
}

export async function verifyResumeSkills(verifiedSkills: string[], token: string) {
  return apiRequest<VerifySkillsResponse>("/resume/verify-skills/", {
    method: "POST",
    body: JSON.stringify({ verified_skills: verifiedSkills }),
    token,
  });
}

export async function getScrapedJobs(token: string) {
  return apiRequest<ScrapedJobsResponse>("/discovery/jobs/", {
    method: "GET",
    token,
  });
}
