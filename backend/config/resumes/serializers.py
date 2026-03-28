from rest_framework import serializers
from .models import Resume, ResumeData

class ResumeUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ['file']


class ResumeSkillsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeData
        fields = ['extracted_skills', 'verified_skills', 'parsed_resume', 'parser_source']
