import fitz  # PyMuPDF
import re
from pathlib import Path

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_PATH = Path(__file__).resolve().parent / "model"
model = None


# --- 2. Enhanced Target Roles ---
# Expanded list to cover Tech, Data, Product, Design, Marketing, and Business
TARGET_ROLES = [
    # Software & Tech
    "Software Engineer (Backend)",
    "Frontend Developer (React/Vue/Angular)",
    "Full Stack Developer",
    "Mobile Developer (iOS/Android/Flutter)",
    "DevOps Engineer (AWS/Azure/GCP)",
    "Cybersecurity Analyst",
    "Systems Administrator",
    "QA Automation Engineer",
    "Cloud Architect",
    "Solutions Architect",
    # Data & AI
    "Data Scientist (Python/R/ML)",
    "Data Analyst (SQL/Tableau/PowerBI)",
    "Machine Learning Engineer",
    "Data Engineer (Spark/Hadoop)",
    "Business Intelligence Analyst",
    "AI/ML Research Engineer",
    # Product & Design
    "Product Manager",
    "Project Manager (Agile/Scrum)",
    "UX/UI Designer",
    "Graphic Designer",
    "Product Owner",
    "Technical Product Manager",
    "Scrum Master",
    # Business & Marketing
    "Digital Marketing Specialist",
    "Content Strategist",
    "Sales Representative",
    "Business Analyst",
    "Human Resources Specialist",
    "Financial Analyst",
    "Growth Hacker",
    # Cloud & Infrastructure
    "Cloud Engineer",
    "Infrastructure Engineer",
    "Platform Engineer",
]

ROLE_EMBEDDINGS = None


def get_semantic_model():
    global model, ROLE_EMBEDDINGS

    if model is not None and ROLE_EMBEDDINGS is not None:
        return model, ROLE_EMBEDDINGS

    if not MODEL_PATH.exists():
        return None, None

    model = SentenceTransformer(str(MODEL_PATH))
    ROLE_EMBEDDINGS = model.encode(TARGET_ROLES)
    return model, ROLE_EMBEDDINGS


def extract_text_from_pdf(pdf_contents: bytes) -> str:
    """Extracts all text from a PDF's byte content."""
    text = ""
    with fitz.open(stream=pdf_contents, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text() + "\n"
    return text


def extract_social_links(text: str) -> dict:
    """Extracts social media and profile links from resume text."""
    social_links = {}

    linkedin = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/([\w-]+)", text, re.IGNORECASE)
    if linkedin:
        social_links["linkedin"] = f"linkedin.com/in/{linkedin.group(1)}"

    github = re.search(r"(?:https?://)?(?:www\.)?github\.com/([\w-]+)", text, re.IGNORECASE)
    if github:
        social_links["github"] = f"github.com/{github.group(1)}"

    return social_links


def parse_resume(pdf_contents: bytes) -> dict:
    """
    Main function to parse a resume PDF.
    Extracts Contact, Education, Location, and suggests Roles.
    """
    full_text = extract_text_from_pdf(pdf_contents)

    email = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", full_text)
    phone = re.search(r"(\(?\d{3}\)?[\s\.-]?\d{3}[\s\.-]?\d{4})", full_text)
    social_links = extract_social_links(full_text)

    location_match = re.search(
        r"([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s?([A-Z]{2}|[A-Z][a-z]+)",
        full_text[:1000],
    )
    location = location_match.group(0) if location_match else "Location not found"

    education = []
    education_keywords = ["University", "College", "Institute", "School of", "Academy"]
    lines = full_text.split("\n")

    for line in lines:
        if any(keyword in line for keyword in education_keywords) and len(line) < 100:
            clean_line = line.strip()
            if len(clean_line) > 10 and "Education" not in clean_line:
                education.append(clean_line)

    skills_match = re.search(
        r"(Skills|Technical Skills|Core Competencies)[\s:]([\s\S]+?)(Education|Experience|Projects|\Z)",
        full_text,
        re.IGNORECASE,
    )
    skills = []
    if skills_match:
        skills_raw = skills_match.group(2).strip()
        skills = [s.strip() for s in re.split(r"[\n,\u2022]", skills_raw) if s.strip()]

    parsed_data = {
        "contact": {
            "email": email.group(0) if email else None,
            "phone": phone.group(0) if phone else None,
            "social_links": social_links if social_links else None,
        },
        "location": location,
        "education": education[:2],
        "skills": skills[:15],
    }

    semantic_model, role_embeddings = get_semantic_model()
    suggested_roles = []

    if semantic_model is not None and role_embeddings is not None:
        resume_embedding = semantic_model.encode(full_text)
        similarities = cosine_similarity([resume_embedding], role_embeddings)[0]

        top_indices = similarities.argsort()[-3:][::-1]
        suggested_roles = [TARGET_ROLES[i] for i in top_indices]

    output = {
        "parsed_data": parsed_data,
        "suggested_roles": suggested_roles,
    }

    return output
