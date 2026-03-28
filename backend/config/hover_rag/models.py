"""
rag/models.py
─────────────────────────────────────────────────────────────────────────────
Stores resume chunks + their embedding vectors.

We use a plain JSONField for the embedding so the app works with any
Postgres version out of the box.

Optional pgvector upgrade:
  pip install pgvector
  Then swap the embedding field as shown in the comment below for
  native ANN search on large datasets.
"""

from django.db import models
from django.conf import settings


class ResumeChunk(models.Model):
    """
    One semantic chunk of a user's parsed resume, with its embedding vector.
    """

    # Link to your user — uses string FK so this app stays plug-in friendly.
    # If you have a custom user model, set AUTH_USER_MODEL in settings and
    # replace user_id with a real ForeignKey if you prefer.
    user_id   = models.CharField(max_length=255, db_index=True)

    chunk_id  = models.CharField(max_length=64)    # e.g. "chunk_0"
    content   = models.TextField()                  # the raw text chunk
    meta      = models.JSONField(default=dict)       # {"section": "skills", ...}

    # ── Embedding stored as a JSON list of 1536 floats ───────────────────────
    # Works with any Postgres / SQLite version, no extension needed.
    #
    # TO USE pgvector INSTEAD (recommended for >10k users):
    #   pip install pgvector django-pgvector
    #   Add 'pgvector.django' to INSTALLED_APPS
    #   Replace the field below with:
    #     from pgvector.django import VectorField
    #     embedding = VectorField(dimensions=1536)
    #   Then update retrieve_relevant_chunks() in engine.py to use:
    #     from pgvector.django import CosineDistance
    #     chunks = ResumeChunk.objects.filter(user_id=...) \
    #                .annotate(score=1 - CosineDistance("embedding", query_vec)) \
    #                .order_by("-score")[:top_k]
    # ────────────────────────────────────────────────────────────────────────
    embedding = models.JSONField()                   # list[float] length 1536

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "rag"
        indexes   = [models.Index(fields=["user_id"])]
        ordering  = ["chunk_id"]

    def __str__(self):
        return f"[{self.user_id}] {self.chunk_id} — {self.content[:60]}"
