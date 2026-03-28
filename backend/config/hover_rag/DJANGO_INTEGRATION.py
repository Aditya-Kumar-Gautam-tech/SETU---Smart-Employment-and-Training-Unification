"""
─────────────────────────────────────────────────────────────────────────────
  DJANGO INTEGRATION GUIDE
  Add the snippets below to your existing Django project files.
─────────────────────────────────────────────────────────────────────────────
"""


# ══════════════════════════════════════════════════════════════════════════════
#  1.  settings.py  — add / merge these into your existing settings file
# ══════════════════════════════════════════════════════════════════════════════

"""
# ── Required packages ────────────────────────────────────────────────────────
# pip install django djangorestframework openai httpx python-dotenv

# ── INSTALLED_APPS ───────────────────────────────────────────────────────────
INSTALLED_APPS = [
    ...
    "rest_framework",
    "rag",                  # ← add this
]

# ── DATABASES ────────────────────────────────────────────────────────────────
# Works with any Postgres database (SQLite is NOT recommended — JSON cosine
# search is slow without an index. Use Postgres in production.)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME":   os.environ.get("DB_NAME", "talentscan"),
        "USER":   os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST":   os.environ.get("DB_HOST", "localhost"),
        "PORT":   os.environ.get("DB_PORT", "5432"),
    }
}

# ── REST FRAMEWORK ───────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # if using JWT
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# ── CORS (if your React frontend is on a different origin) ───────────────────
# pip install django-cors-headers
INSTALLED_APPS += ["corsheaders"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware"] + MIDDLEWARE
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",
    "https://yourdomain.com",
]
"""


# ══════════════════════════════════════════════════════════════════════════════
#  2.  .env  — environment variables
# ══════════════════════════════════════════════════════════════════════════════

"""
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...
OR_MODEL=mistralai/mistral-7b-instruct:free
APP_URL=https://yourapp.com
DB_NAME=talentscan
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=your-django-secret-key
DEBUG=True
"""


# ══════════════════════════════════════════════════════════════════════════════
#  3.  urls.py (project root)  — mount the rag app
# ══════════════════════════════════════════════════════════════════════════════

"""
# myproject/urls.py
from django.contrib import admin
from django.urls    import path, include

urlpatterns = [
    path("admin/",   admin.site.urls),
    path("api/rag/", include("rag.urls")),      # ← add this line
    # ... your other urls
]
"""


# ══════════════════════════════════════════════════════════════════════════════
#  4.  Run migrations
# ══════════════════════════════════════════════════════════════════════════════

"""
python manage.py migrate
"""


# ══════════════════════════════════════════════════════════════════════════════
#  5.  Call indexResume from your resume parser view
# ══════════════════════════════════════════════════════════════════════════════

"""
# In your existing resume upload view (wherever you parse the resume):

from rag.engine import index_resume

class ResumeUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file      = request.FILES["resume"]
        parsed    = your_existing_parser(file)   # your resume parser here

        # ── Index into vector store after parsing ──
        index_resume(request.user.id, parsed)

        return Response({"ok": True, "resume": parsed})
"""


# ══════════════════════════════════════════════════════════════════════════════
#  6.  Optional: pgvector upgrade for production scale
# ══════════════════════════════════════════════════════════════════════════════

"""
For > 10,000 users, upgrade to native pgvector ANN search:

1.  pip install pgvector django-pgvector

2.  Add to INSTALLED_APPS:
        "pgvector.django",

3.  In rag/models.py, replace the embedding field:
        from pgvector.django import VectorField
        embedding = VectorField(dimensions=1536)

4.  Create a new migration:
        python manage.py makemigrations rag
        python manage.py migrate

5.  In rag/engine.py, replace retrieve_relevant_chunks() with:

        from pgvector.django import CosineDistance

        def retrieve_relevant_chunks(user_id, job, top_k=TOP_K):
            query_embedding = embed_text(
                f"{job['title']} at {job['company']}. "
                f"{job.get('description','')} "
                f"Required: {', '.join(job.get('tags', []))}"
            )
            chunks = (
                ResumeChunk.objects
                .filter(user_id=str(user_id))
                .annotate(score=1 - CosineDistance("embedding", query_embedding))
                .order_by("-score")[:top_k]
            )
            return [{"text": c.content, "meta": c.meta, "score": float(c.score)} for c in chunks]
"""
