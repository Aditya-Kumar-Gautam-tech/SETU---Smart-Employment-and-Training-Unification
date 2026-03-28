import fitz  # PyMuPDF
import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import os

# --- 1. Load Model ONCE ---
MODEL_PATH = './model'
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run download_model.py first.")
    
print("Loading semantic model...")
model = SentenceTransformer(MODEL_PATH)
print("Model loaded successfully.")


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
    "Platform Engineer"
]

# Pre-compute embeddings
ROLE_EMBEDDINGS = model.encode(TARGET_ROLES)


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
    
    # LinkedIn
    linkedin = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/([\w-]+)', text, re.IGNORECASE)
    if linkedin:
        social_links["linkedin"] = f"linkedin.com/in/{linkedin.group(1)}"
    
    # GitHub
    github = re.search(r'(?:https?://)?(?:www\.)?github\.com/([\w-]+)', text, re.IGNORECASE)
    if github:
        social_links["github"] = f"github.com/{github.group(1)}"
    
    # # Twitter/X
    # twitter = re.search(r'(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/(@?[\w]+)', text, re.IGNORECASE)
    # if twitter:
    #     social_links["twitter"] = f"twitter.com/{twitter.group(1)}"
    
    # # Portfolio/Website
    # portfolio = re.search(r'(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+\.[a-z]{2,})', text[:1000])
    # if portfolio and 'linkedin' not in portfolio.group(1) and 'github' not in portfolio.group(1):
    #     social_links["portfolio"] = portfolio.group(1)
    
    return social_links

def parse_resume(pdf_contents: bytes) -> dict:
    """
    Main function to parse a resume PDF.
    Extracts Contact, Education, Location, and suggests Roles.
    """
    
    # --- 3. Extract Full Text ---
    full_text = extract_text_from_pdf(pdf_contents)
    
    # --- 4. Information Extraction Logic ---
    
    # A. Contact Info (Email & Phone)
    email = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', full_text)
    phone = re.search(r'(\(?\d{3}\)?[\s\.-]?\d{3}[\s\.-]?\d{4})', full_text)
    social_links = extract_social_links(full_text)
    
    # B. Location Extraction (Heuristic)
    # Looks for "City, State" or "City, Country" patterns in the first 1000 chars (header area)
    # Pattern matches: Word, Word (e.g., "New York, NY" or "London, UK")
    location_match = re.search(r'([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s?([A-Z]{2}|[A-Z][a-z]+)', full_text[:1000])
    location = location_match.group(0) if location_match else "Location not found"

    # C. College/University Extraction
    # We look for lines containing keywords like "University", "College", "Institute"
    education = []
    education_keywords = ["University", "College", "Institute", "School of", "Academy"]
    
    # Split text into lines to analyze line-by-line
    lines = full_text.split('\n')
    
    for line in lines:
        # Check if line contains a university keyword and is not too long (avoiding full paragraphs)
        if any(keyword in line for keyword in education_keywords) and len(line) < 100:
            clean_line = line.strip()
            # simple filter to avoid headers like "Education" being captured as a college
            if len(clean_line) > 10 and "Education" not in clean_line:
                education.append(clean_line)
    
    # D. Skills Extraction
    skills_match = re.search(r'(Skills|Technical Skills|Core Competencies)[\s:]([\s\S]+?)(Education|Experience|Projects|\Z)', full_text, re.IGNORECASE)
    skills = []
    if skills_match:
        skills_raw = skills_match.group(2).strip()
        # Split by common delimiters
        skills = [s.strip() for s in re.split(r'[\n,•]', skills_raw) if s.strip()]


    parsed_data = {
        "contact": {
            "email": email.group(0) if email else None,
            "phone": phone.group(0) if phone else None,
            "social_links": social_links if social_links else None
        },
        "education": education[:2], # Limit to top 2 entries to avoid noise
        "skills": skills[:15],      # Limit to top 15 skills
    }
    
    # --- 5. Generate Role Keywords (Semantic Matching) ---
    resume_embedding = model.encode(full_text)
    similarities = cosine_similarity([resume_embedding], ROLE_EMBEDDINGS)[0]
    
    # Get Top 3 Roles
    top_indices = similarities.argsort()[-3:][::-1]
    suggested_roles = [TARGET_ROLES[i] for i in top_indices]
    
    # --- 6. Format Output ---
    output = {
        "parsed_data": parsed_data,
        "suggested_roles": suggested_roles
    }
    
    return output