import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from resumes.models import Resume

logger = logging.getLogger(__name__)

FREE_MODEL = os.environ.get("OR_MODEL", "mistralai/mistral-7b-instruct:free")
KNOWN_SKILLS = [
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust", "sql",
    "react", "next.js", "angular", "vue", "html", "css", "tailwind", "bootstrap",
    "node.js", "express", "django", "flask", "fastapi", "spring",
    "postgresql", "mysql", "mongodb", "redis", "sqlite",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "git", "github",
    "pandas", "numpy", "machine learning", "deep learning", "nlp", "power bi", "tableau",
    "rest api", "graphql", "linux", "agile", "scrum",
]


def get_llm_client():
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("openai package is not installed; using deterministic hover insights.")
        return None

    return OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": os.environ.get("APP_URL", "http://localhost:8000"),
            "X-Title": "TalentScan Resume Coach",
        },
    )


def extract_text_from_pdf(file_path: str) -> str:
    try:
        import pymupdf
    except ImportError as exc:
        raise ValueError("PyMuPDF is not installed in the backend environment.") from exc

    text = []
    with pymupdf.open(file_path) as doc:
        for page in doc:
            text.append(page.get_text())
    return "\n".join(text).strip()


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9\+\#\.]{2,}", text.lower())


def extract_name(lines: list[str]) -> str:
    for line in lines[:5]:
        stripped = normalize_whitespace(line)
        if not stripped or "@" in stripped or re.search(r"\d", stripped):
            continue
        if len(stripped.split()) > 6:
            continue
        return stripped
    return "Candidate"


def infer_skills(text: str) -> list[str]:
    matched = []
    lower_text = text.lower()
    for skill in KNOWN_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, lower_text):
            matched.append(skill)
    return matched[:20]


def chunk_resume_text(full_text: str) -> list[dict]:
    raw_parts = [
        normalize_whitespace(part)
        for part in re.split(r"\n\s*\n|\r\n\s*\r\n", full_text)
        if normalize_whitespace(part)
    ]

    if not raw_parts:
        raw_parts = [normalize_whitespace(line) for line in full_text.splitlines() if normalize_whitespace(line)]

    chunks = []
    for index, part in enumerate(raw_parts):
        if len(part) < 25:
            continue
        chunks.append(
            {
                "chunk_id": f"chunk_{index}",
                "text": part[:1200],
                "meta": {"section": "resume_text"},
            }
        )

    return chunks[:20]


def flatten_resume_value(value) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        cleaned = normalize_whitespace(value)
        return [cleaned] if cleaned else []

    if isinstance(value, list):
        items = []
        for entry in value:
            items.extend(flatten_resume_value(entry))
        return items

    if isinstance(value, dict):
        items = []
        for entry in value.values():
            items.extend(flatten_resume_value(entry))
        return items

    return [str(value)]


def build_context_from_parsed_resume(resume) -> dict | None:
    resume_data = getattr(resume, "data", None)
    if not resume_data or not resume_data.parsed_resume:
        return None

    parsed_resume = resume_data.parsed_resume or {}
    parsed_data = parsed_resume.get("parsed_data", {}) if isinstance(parsed_resume, dict) else {}
    stored_skills = resume_data.verified_skills or resume_data.extracted_skills or []

    full_text_parts = flatten_resume_value(parsed_data)
    full_text = "\n".join(part for part in full_text_parts if part)
    if not full_text.strip() and stored_skills:
        full_text = "Skills: " + ", ".join(stored_skills)

    if not full_text.strip():
        return None

    contact = parsed_data.get("contact", {}) if isinstance(parsed_data, dict) else {}
    social_links = contact.get("social_links", {}) if isinstance(contact, dict) else {}
    inferred_name = None
    if isinstance(social_links, dict):
        for candidate in social_links.values():
            if isinstance(candidate, str) and candidate.strip():
                inferred_name = candidate.strip().split("/")[-1].replace("-", " ").title()
                break

    name = parsed_data.get("name") if isinstance(parsed_data, dict) else None
    lines = [line for line in full_text.splitlines() if normalize_whitespace(line)]

    return {
        "resume_id": resume.id,
        "name": name or inferred_name or extract_name(lines),
        "skills": [skill for skill in stored_skills if isinstance(skill, str)] or infer_skills(full_text),
        "full_text": full_text,
        "chunks": chunk_resume_text(full_text),
        "source": "parsed_resume",
    }


def load_latest_resume_context(user_id: Any) -> dict:
    resume = Resume.objects.filter(user_id=user_id).order_by("-uploaded_at").first()
    if not resume:
        raise ValueError("No uploaded resume found for this user.")

    file_path = getattr(resume.file, "path", "")
    if file_path and Path(file_path).exists():
        try:
            full_text = extract_text_from_pdf(file_path)
            lines = [line for line in full_text.splitlines() if normalize_whitespace(line)]

            return {
                "resume_id": resume.id,
                "name": extract_name(lines),
                "skills": infer_skills(full_text),
                "full_text": full_text,
                "chunks": chunk_resume_text(full_text),
                "source": "pdf_file",
            }
        except Exception as exc:
            logger.warning("Falling back to stored parsed resume for hover context: %s", exc)

    stored_context = build_context_from_parsed_resume(resume)
    if stored_context is not None:
        return stored_context

    if not file_path or not Path(file_path).exists():
        raise ValueError("Uploaded resume file is missing on the server.")

    raise ValueError("Unable to extract resume content for hover insights.")


def score_chunk(chunk_text: str, job: dict) -> float:
    job_terms = set(tokenize(job.get("title", "")))
    job_terms.update(tokenize(job.get("description", "")))
    for tag in job.get("tags", []):
        job_terms.update(tokenize(tag))

    if not job_terms:
        return 0.0

    chunk_terms = set(tokenize(chunk_text))
    overlap = len(job_terms & chunk_terms)

    score = float(overlap)
    title_terms = set(tokenize(job.get("title", "")))
    if chunk_terms & title_terms:
        score += 2.0

    return score


def retrieve_relevant_chunks(resume_context: dict, job: dict, top_k: int = 4) -> list[dict]:
    scored = []
    for chunk in resume_context["chunks"]:
        score = score_chunk(chunk["text"], job)
        if score <= 0:
            continue
        scored.append({**chunk, "score": score})

    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:top_k]


def build_fallback_insights(resume_context: dict, job: dict) -> dict:
    resume_skills = {skill.lower() for skill in resume_context.get("skills", [])}
    job_tags = [tag for tag in job.get("tags", []) if isinstance(tag, str)]
    normalized_job_tags = [tag.lower() for tag in job_tags]

    matched = [tag for tag in job_tags if tag.lower() in resume_skills]
    missing = [tag for tag in job_tags if tag.lower() not in resume_skills]

    denominator = max(len(job_tags), 1)
    match_score = round((len(matched) / denominator) * 100)
    biggest_gap = missing[0] if missing else "Show measurable impact"

    project_focus = missing[0] if missing else (matched[0] if matched else job.get("title", "the role"))
    framing_focus = matched[0] if matched else "your strongest relevant project"

    return {
        "match_score": match_score,
        "gap": biggest_gap[:60],
        "suggestions": [
            {
                "type": "skill",
                "action": f"Highlight or build evidence for {biggest_gap}",
                "why": "Closes the clearest requirement gap",
            },
            {
                "type": "project",
                "action": f"Show a project tied to {project_focus}",
                "why": "Makes your fit easier to trust",
            },
            {
                "type": "framing",
                "action": f"Rewrite bullets around outcomes using {framing_focus}",
                "why": "Improves recruiter signal quickly",
            },
        ],
        "resume_meta": {
            "name": resume_context.get("name", "Candidate"),
            "skills": resume_context.get("skills", []),
            "matched_tags": matched,
            "missing_tags": missing or normalized_job_tags[:3],
        },
    }


def call_openrouter(system_prompt: str, user_prompt: str) -> dict:
    client = get_llm_client()
    if client is None:
        raise ValueError("OPENROUTER_API_KEY is not configured.")

    completion = client.chat.completions.create(
        model=FREE_MODEL,
        max_tokens=600,
        temperature=0.3,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = completion.choices[0].message.content or ""
    clean = raw.replace("```json", "").replace("```", "").strip()
    data = json.loads(clean)
    if "matchScore" in data and "match_score" not in data:
        data["match_score"] = data.pop("matchScore")
    return data


def generate_insights(user_id: Any, job: dict, resume_meta: dict | None = None) -> dict:
    resume_context = load_latest_resume_context(user_id)
    retrieved_chunks = retrieve_relevant_chunks(resume_context, job)
    fallback = build_fallback_insights(resume_context, job)

    context = "\n".join(f"[{index + 1}] {chunk['text']}" for index, chunk in enumerate(retrieved_chunks))
    if not context:
        context = resume_context["full_text"][:2500]

    effective_resume_meta = {
        "name": (resume_meta or {}).get("name") or resume_context["name"],
        "skills": (resume_meta or {}).get("skills") or resume_context["skills"],
    }

    system_prompt = (
        "You are a precise career coach AI. "
        "Use the resume excerpts and job details to return only valid JSON with match_score, gap, and suggestions."
    )

    user_prompt = f"""
Resume excerpts:
{context}

Candidate:
Name: {effective_resume_meta.get('name', 'Candidate')}
Skills: {', '.join(effective_resume_meta.get('skills', []))}

Target job:
Title: {job.get('title')}
Company: {job.get('company')}
Description: {job.get('description', '')}
Tags: {', '.join(job.get('tags', []))}

Return JSON only:
{{
  "match_score": <integer 0-100>,
  "gap": "<main missing gap>",
  "suggestions": [
    {{"type": "skill", "action": "<one action>", "why": "<short why>"}},
    {{"type": "project", "action": "<one action>", "why": "<short why>"}},
    {{"type": "framing", "action": "<one action>", "why": "<short why>"}}
  ]
}}
"""

    try:
        llm_output = call_openrouter(system_prompt, user_prompt)
        llm_output.setdefault("resume_meta", fallback["resume_meta"])
        return llm_output
    except Exception as exc:
        logger.warning("Falling back to deterministic hover insights: %s", exc)
        return fallback


def index_resume(user_id: Any, resume: dict | None = None) -> dict:
    """
    Kept for API compatibility. The feature now extracts from the stored resume file on demand,
    so this endpoint only validates availability of a resume and returns chunk counts.
    """
    resume_context = load_latest_resume_context(user_id)
    return {"chunks_indexed": len(resume_context["chunks"]), "mode": "on_demand"}
