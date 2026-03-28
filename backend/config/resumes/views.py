from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Resume, ResumeData
from .serializers import ResumeUploadSerializer, ResumeSkillsSerializer
from .dummy_parser import DummyResumeParser


def parse_resume_file(resume):
    try:
        from parsing.parser import parse_resume

        with open(resume.file.path, "rb") as resume_file:
            parsed_output = parse_resume(resume_file.read())

        parsed_data = parsed_output.get("parsed_data", {})
        extracted_skills = parsed_data.get("skills") or parsed_output.get("skills") or []
        return {
            "skills": extracted_skills,
            "parsed_resume": parsed_output,
            "parser_source": "real",
        }
    except Exception as error:
        print(f"Falling back to DummyResumeParser due to parser error: {error}")
        parser = DummyResumeParser()
        dummy_output = parser.parse(resume.file.path)
        return {
            "skills": dummy_output.get("skills", []),
            "parsed_resume": {
                "parsed_data": {
                    "skills": dummy_output.get("skills", []),
                },
                "suggested_roles": [],
            },
            "parser_source": "dummy",
        }


class ResumeUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ResumeUploadSerializer(data=request.data)

        if serializer.is_valid():
            resume = serializer.save(user=request.user)

            parsed_output = parse_resume_file(resume)

            ResumeData.objects.create(
                resume=resume,
                extracted_skills=parsed_output.get("skills", []),
                parsed_resume=parsed_output.get("parsed_resume"),
                parser_source=parsed_output.get("parser_source", "unknown"),
            )

            return Response(
                {
                    "message": "Resume uploaded and parsed successfully",
                    "resume_id": resume.id,
                    "extracted_skills": parsed_output.get("skills", []),
                    "parser_source": parsed_output.get("parser_source", "unknown"),
                },
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResumeSkillsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resume = Resume.objects.filter(user=request.user).order_by("-uploaded_at").first()
        if not resume or not hasattr(resume, "data"):
            return Response(
                {"error": "No parsed resume found for this user."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ResumeSkillsSerializer(resume.data)
        return Response(serializer.data)


class VerifySkillsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skills = request.data.get("verified_skills")

        if not isinstance(skills, list):
            return Response(
                {"error": "verified_skills must be a list"},
                status=status.HTTP_400_BAD_REQUEST
            )

        resume = Resume.objects.filter(user=request.user).order_by("-uploaded_at").first()
        if not resume or not hasattr(resume, "data"):
            return Response(
                {"error": "No parsed resume found for this user."},
                status=status.HTTP_404_NOT_FOUND
            )

        resume.data.verified_skills = skills
        resume.data.save()

        return Response({
            "message": "Skills verified successfully",
            "verified_skills": skills
        })

# Create your views here.
