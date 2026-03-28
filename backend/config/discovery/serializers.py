from rest_framework import serializers


class ResumeRecommendationRequestSerializer(serializers.Serializer):
    target_role = serializers.CharField(max_length=100)
    job_description = serializers.CharField(required=False, allow_blank=True)
