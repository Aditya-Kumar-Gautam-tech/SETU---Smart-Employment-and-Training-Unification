import os

import requests
from django.conf import settings

import job_scraper


class JobScraperConfigurationError(ValueError):
    """Raised when the scraper is configured incorrectly."""


def get_setting(name: str, fallback: str = ""):
    if settings.configured:
        return getattr(settings, name, fallback)

    return os.getenv(name, fallback)


def normalize_skills(user_skills):
    normalized = []
    seen = set()

    for skill in user_skills:
        if not isinstance(skill, str):
            continue

        cleaned = skill.strip()
        if not cleaned:
            continue

        lowered = cleaned.lower()
        if lowered in seen:
            continue

        seen.add(lowered)
        normalized.append(cleaned)

    return normalized


def build_search_queries(normalized_skills, explicit_query=None):
    if explicit_query:
        return [explicit_query]

    if not normalized_skills:
        fallback = getattr(job_scraper, "SEARCH_KEYWORDS", "AI Developer intern")
        return [fallback]

    queries = []
    seen = set()

    for skill in normalized_skills[:6]:
        lowered = skill.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        queries.append(skill)

    combined_query = " ".join(normalized_skills[:2]).strip()
    if combined_query and combined_query.lower() not in seen:
        queries.append(combined_query)

    return queries


def search_jobs(user_skills, search_keywords=None, location=None, results_to_fetch=None):
    normalized_skills = normalize_skills(user_skills)
    app_id = get_setting("ADZUNA_APP_ID", "")
    app_key = get_setting("ADZUNA_APP_KEY", "")
    effective_location = location or get_setting("ADZUNA_COUNTRY", getattr(job_scraper, "LOCATION", "in"))
    effective_results_to_fetch = results_to_fetch or int(
        get_setting("ADZUNA_RESULTS_TO_FETCH", str(getattr(job_scraper, "RESULTS_TO_FETCH", 20)))
    )

    if not app_id or not app_key:
        raise JobScraperConfigurationError("Adzuna credentials are not configured on the backend.")

    url = f"https://api.adzuna.com/v1/api/jobs/{effective_location}/search/1"
    effective_queries = build_search_queries(normalized_skills, search_keywords)
    jobs_by_link = {}

    for query in effective_queries:
        params = {
            "app_id": app_id,
            "app_key": app_key,
            "results_per_page": effective_results_to_fetch,
            "what": query,
            "content-type": "application/json",
        }

        response = requests.get(url, params=params, timeout=15)
        if response.status_code in {401, 403}:
            raise JobScraperConfigurationError("Adzuna credentials were rejected by the upstream API.")
        response.raise_for_status()

        data = response.json()
        for job in data.get("results", []):
            link = job.get("redirect_url") or f"{job.get('title')}::{job.get('company', {}).get('display_name')}"
            jobs_by_link[link] = job

    jobs_found = list(jobs_by_link.values())
    ranked_jobs = []

    for job in jobs_found:
        if not job_scraper.is_entry_level(job):
            continue

        score, matched = job_scraper.calculate_match_score(job, normalized_skills)
        if score <= 0:
            continue

        ranked_jobs.append(
            {
                "title": job.get("title"),
                "company": job.get("company", {}).get("display_name"),
                "location": job.get("location", {}).get("display_name"),
                "description": job.get("description"),
                "score": score,
                "matched_skills": matched,
                "link": job.get("redirect_url"),
            }
        )

    ranked_jobs.sort(key=lambda item: item["score"], reverse=True)

    return {
        "query": " OR ".join(effective_queries),
        "jobs": ranked_jobs[:10],
    }
