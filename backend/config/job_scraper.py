import requests
import json
import re

# Add your Adzuna credentials here
APP_ID = 'Enter APP ID'
APP_KEY = 'Enter API KEY'

# Your Skills
USER_SKILLS = ['AI', 'web scraping', 'api', 'automation', 'data', 'gen ai']

# Search (focused on entry-level roles)
SEARCH_KEYWORDS = 'AI Developer intern'

LOCATION = 'in'
RESULTS_TO_FETCH = 30

# Entry-Level Keywords
ENTRY_LEVEL_KEYWORDS = [
    'intern', 'internship', 'junior', 'entry', 'fresher', 'graduate', 'trainee'
]


# Check if job is entry-level
def is_entry_level(job):
    title = job.get('title', '').lower()
    description = job.get('description', '').lower()

    return any(word in title or word in description for word in ENTRY_LEVEL_KEYWORDS)


# Smart Match Score
def calculate_match_score(job, user_skills):
    """
    Weighted scoring:
    - Title match = HIGH weight
    - Description match = NORMAL weight
    - Entry-level bonus
    """

    title = job.get('title', '').lower()
    description = job.get('description', '').lower()

    text = title + " " + description
    text_clean = re.sub(r'[^a-z0-9\s]', '', text)

    matched_skills = []
    score = 0

    for skill in user_skills:
        skill_lower = skill.lower()
        pattern = r'\b' + re.escape(skill_lower) + r'\b'

        if re.search(pattern, text_clean):
            matched_skills.append(skill)

            # 🎯 Weight logic
            if skill_lower in title:
                score += 3   # HIGH weight
            else:
                score += 1   # NORMAL weight

    # Entry-level boost
    if any(word in title for word in ENTRY_LEVEL_KEYWORDS):
        score += 2

    # Normalize to %
    max_score = len(user_skills) * 3 + 2
    final_score = (score / max_score) * 100 if max_score > 0 else 0

    return round(final_score, 2), matched_skills


# Main Job Search
def search_jobs():
    print(f"\n🔍 Searching for '{SEARCH_KEYWORDS}' jobs in '{LOCATION}'...\n")

    url = f"https://api.adzuna.com/v1/api/jobs/{LOCATION}/search/1"

    params = {
        'app_id': APP_ID,
        'app_key': APP_KEY,
        'results_per_page': RESULTS_TO_FETCH,
        'what': SEARCH_KEYWORDS,
        'content-type': 'application/json'
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        jobs_found = data.get('results', [])
        print(f"✅ Found {len(jobs_found)} listings. Filtering & ranking...\n")
        print("=" * 70)

        ranked_jobs = []

        for job in jobs_found:
            title = job.get('title')
            company = job.get('company', {}).get('display_name')
            link = job.get('redirect_url')
            description = job.get('description')

            # ✅ Filter only entry-level jobs
            if not is_entry_level(job):
                continue

            # ✅ Calculate score
            score, matched = calculate_match_score(job, USER_SKILLS)

            # ❌ Skip irrelevant jobs
            if score == 0:
                continue

            ranked_jobs.append({
                'title': title,
                'company': company,
                'score': score,
                'matches': matched,
                'link': link
            })

        # 🔥 Sort by best match
        ranked_jobs.sort(key=lambda x: x['score'], reverse=True)

        # 🎯 Show top results only
        TOP_RESULTS = 10
        ranked_jobs = ranked_jobs[:TOP_RESULTS]

        if not ranked_jobs:
            print("❌ No matching entry-level jobs found.")
            return

        # 📊 Display Results
        for i, job in enumerate(ranked_jobs):
            print(f"{i+1}. {job['title']} (at {job['company']})")
            print(f"   🎯 MATCH SCORE: {job['score']}%")
            print(f"   🧠 MATCHED SKILLS: {', '.join(job['matches'])}")
            print(f"   🔗 APPLY HERE: {job['link']}")
            print("-" * 70)

    except requests.exceptions.HTTPError as err:
        print(f"HTTP Error: {err}")
    except Exception as e:
        print(f"Error: {e}")


# Run
if __name__ == "__main__":
    search_jobs()
