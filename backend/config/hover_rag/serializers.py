"""
rag/serializers.py
─────────────────────────────────────────────────────────────────────────────
Request / response serializers for the RAG API endpoints.
"""

from rest_framework import serializers


# ── Request serializers ───────────────────────────────────────────────────────

class ExperienceSerializer(serializers.Serializer):
    role     = serializers.CharField()
    company  = serializers.CharField()
    duration = serializers.CharField(required=False, default="")
    bullets  = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class ProjectSerializer(serializers.Serializer):
    name        = serializers.CharField()
    description = serializers.CharField(required=False, default="")
    stack       = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class EducationSerializer(serializers.Serializer):
    degree      = serializers.CharField()
    institution = serializers.CharField()
    year        = serializers.CharField(required=False, default="")


class ResumeSerializer(serializers.Serializer):
    name       = serializers.CharField()
    skills     = serializers.ListField(child=serializers.CharField())
    experience = ExperienceSerializer(many=True, required=False, default=list)
    projects   = ProjectSerializer(many=True,   required=False, default=list)
    education  = EducationSerializer(many=True, required=False, default=list)
    summary    = serializers.CharField(required=False, default="")


class IndexResumeSerializer(serializers.Serializer):
    resume = ResumeSerializer()


class JobSerializer(serializers.Serializer):
    id          = serializers.CharField()
    title       = serializers.CharField()
    company     = serializers.CharField()
    description = serializers.CharField(required=False, default="")
    tags        = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class ResumeMetaSerializer(serializers.Serializer):
    name   = serializers.CharField(required=False, allow_blank=True, default="")
    skills = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class InsightsRequestSerializer(serializers.Serializer):
    job         = JobSerializer()
    resume_meta = ResumeMetaSerializer(required=False)


# ── Response serializers ──────────────────────────────────────────────────────

class SuggestionSerializer(serializers.Serializer):
    type   = serializers.CharField()
    action = serializers.CharField()
    why    = serializers.CharField()


class InsightsResponseSerializer(serializers.Serializer):
    match_score = serializers.IntegerField()
    gap         = serializers.CharField()
    suggestions = SuggestionSerializer(many=True)
