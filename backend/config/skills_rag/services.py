import json
import re
from collections import Counter
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from .knowledge_base import ROLE_GUIDANCE


def _normalize_token(value):
    return re.sub(r"[^a-z0-9+#.\-/ ]+", " ", value.lower()).strip()


def _normalize_skills(skills):
    return {_normalize_token(skill) for skill in skills if isinstance(skill, str) and skill.strip()}


class LLMClientError(Exception):
    pass


class RoleGuidanceRetriever:
    def retrieve(self, role_name):
        normalized_role = _normalize_token(role_name)
        if normalized_role in ROLE_GUIDANCE:
            return normalized_role, ROLE_GUIDANCE[normalized_role]

        role_terms = set(normalized_role.split())
        best_match = None
        best_score = -1

        for role_key, role_data in ROLE_GUIDANCE.items():
            searchable_terms = {role_key, role_data["display_name"].lower(), *role_data["keywords"]}
            score = 0
            for item in searchable_terms:
                candidate_terms = set(_normalize_token(item).split())
                score += len(role_terms & candidate_terms)

            if score > best_score:
                best_match = (role_key, role_data)
                best_score = score

        return best_match


class LLMClient:
    def __init__(self):
        config = getattr(settings, "SKILLS_RAG_LLM", {})
        self.api_key = config.get("api_key", "")
        self.model = config.get("model", "")
        self.base_url = config.get("base_url", "")
        self.timeout = config.get("timeout", 20)

    def is_configured(self):
        return bool(self.api_key and self.model and self.base_url)

    def generate_json(self, messages):
        if not self.is_configured():
            raise LLMClientError("LLM client is not configured.")

        payload = {
            "model": self.model,
            "messages": messages,
            "response_format": {"type": "json_object"},
        }
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            self.base_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw_payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            raise LLMClientError("Failed to get a response from the LLM provider.") from exc

        content = self._extract_content(raw_payload)
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise LLMClientError("LLM response was not valid JSON.") from exc

    def _extract_content(self, payload):
        choices = payload.get("choices") or []
        if not choices:
            raise LLMClientError("LLM response did not contain any choices.")

        message = choices[0].get("message") or {}
        content = message.get("content")

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    parts.append(item.get("text", ""))
            if parts:
                return "".join(parts)

        raise LLMClientError("LLM response content was empty.")


class ResumeRecommendationService:
    def __init__(self, llm_client=None, retriever=None):
        self.retriever = retriever or RoleGuidanceRetriever()
        self.llm_client = llm_client or LLMClient()

    def generate(self, role_name, extracted_skills, verified_skills=None, job_description=""):
        role_key, guidance = self.retriever.retrieve(role_name)

        resume_skills = _normalize_skills(extracted_skills or [])
        resume_skills.update(_normalize_skills(verified_skills or []))

        must_have = _normalize_skills(guidance["must_have_skills"])
        nice_to_have = _normalize_skills(guidance["nice_to_have_skills"])
        missing_must_have = sorted(must_have - resume_skills)
        missing_nice_to_have = sorted(nice_to_have - resume_skills)
        matched_skills = sorted((must_have | nice_to_have) & resume_skills)
        keyword_gaps = self._keyword_gaps(resume_skills, guidance)

        resume_snapshot = {
            "extracted_skills": sorted(_normalize_skills(extracted_skills or [])),
            "verified_skills": sorted(_normalize_skills(verified_skills or [])),
            "matched_skills": matched_skills,
            "missing_must_have_skills": missing_must_have,
            "missing_nice_to_have_skills": missing_nice_to_have,
            "keyword_gaps": keyword_gaps,
        }

        messages = self._build_messages(role_name, guidance, resume_snapshot, job_description)
        llm_payload, generation_mode = self._generate_recommendations(messages, guidance, resume_snapshot)

        return {
            "role_key": role_key,
            "role": guidance["display_name"],
            "matched_skills": matched_skills,
            "missing_must_have_skills": missing_must_have,
            "missing_nice_to_have_skills": missing_nice_to_have[:5],
            "retrieved_context": {
                "must_have_skills": guidance["must_have_skills"],
                "nice_to_have_skills": guidance["nice_to_have_skills"],
                "improvement_areas": guidance["improvement_areas"],
                "keywords": guidance["keywords"],
            },
            "llm": {
                "enabled": self.llm_client.is_configured(),
                "generation_mode": generation_mode,
                "model": self.llm_client.model or "",
            },
            "summary": llm_payload["summary"],
            "ats_keywords": llm_payload["ats_keywords"],
            "recommendations": llm_payload["recommendations"],
        }

    def _keyword_gaps(self, resume_skills, guidance):
        resume_terms = Counter()
        for skill in resume_skills:
            for term in skill.split():
                resume_terms[term] += 1

        gaps = []
        for keyword in guidance["keywords"]:
            keyword_terms = [term for term in _normalize_token(keyword).split() if term]
            if keyword_terms and not all(term in resume_terms for term in keyword_terms):
                gaps.append(keyword)

        return gaps

    def _build_messages(self, role_name, guidance, resume_snapshot, job_description):
        system_prompt = (
            "You are an expert resume reviewer. Use the retrieved role guidance and the candidate resume data "
            "to produce concise, field-specific recommendations that improve interview shortlisting chances. "
            "Return strict JSON with keys: summary, recommendations, ats_keywords, missing_core_skills."
        )

        user_payload = {
            "target_role": role_name,
            "job_description": job_description,
            "retrieved_role_guidance": guidance,
            "resume_snapshot": resume_snapshot,
            "instructions": [
                "Prioritize suggestions that are realistic and resume-editable within a short time.",
                "Focus on missing core skills, ATS alignment, stronger project bullets, and measurable impact.",
                "Recommendations must be specific, actionable, and targeted to the role.",
                "Return at most 6 recommendations.",
            ],
        }

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, indent=2)},
        ]

    def _generate_recommendations(self, messages, guidance, resume_snapshot):
        try:
            llm_response = self.llm_client.generate_json(messages)
            return {
                "summary": llm_response.get("summary") or self._fallback_summary(guidance, resume_snapshot),
                "ats_keywords": llm_response.get("ats_keywords") or guidance["keywords"][:5],
                "recommendations": llm_response.get("recommendations") or self._fallback_recommendations(guidance, resume_snapshot),
            }, "llm"
        except LLMClientError:
            return {
                "summary": self._fallback_summary(guidance, resume_snapshot),
                "ats_keywords": guidance["keywords"][:5],
                "recommendations": self._fallback_recommendations(guidance, resume_snapshot),
            }, "fallback"

    def _fallback_summary(self, guidance, resume_snapshot):
        missing_count = len(resume_snapshot["missing_must_have_skills"])
        return (
            f"The resume shows partial alignment for {guidance['display_name']}, with {missing_count} core skill gaps "
            "that should be addressed for stronger shortlisting potential."
        )

    def _fallback_recommendations(self, guidance, resume_snapshot):
        recommendations = []

        if resume_snapshot["missing_must_have_skills"]:
            focus_skills = ", ".join(resume_snapshot["missing_must_have_skills"][:4])
            recommendations.append(
                f"Add evidence for these core skills in projects, coursework, or experience bullets: {focus_skills}."
            )

        if resume_snapshot["missing_nice_to_have_skills"]:
            stretch_skills = ", ".join(resume_snapshot["missing_nice_to_have_skills"][:3])
            recommendations.append(
                f"Strengthen your profile with role-relevant tools or platforms such as {stretch_skills}."
            )

        if resume_snapshot["keyword_gaps"]:
            recommendations.append(
                "Improve ATS alignment by naturally adding role language such as "
                + ", ".join(resume_snapshot["keyword_gaps"][:3])
                + " in your summary and project bullets."
            )

        recommendations.extend(guidance["improvement_areas"])
        return recommendations[:6]
