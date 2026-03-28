import requests
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from job_scraper_service import JobScraperConfigurationError, search_jobs
from resumes.models import Resume
from skills_rag.services import ResumeRecommendationService

from .serializers import ResumeRecommendationRequestSerializer


class ResumeRecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ResumeRecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resume = Resume.objects.filter(user=request.user).order_by("-uploaded_at").first()
        if not resume or not hasattr(resume, "data"):
            return Response(
                {"error": "No parsed resume found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        service = ResumeRecommendationService()
        recommendations = service.generate(
            role_name=serializer.validated_data["target_role"],
            extracted_skills=resume.data.extracted_skills,
            verified_skills=resume.data.verified_skills,
            job_description=serializer.validated_data.get("job_description", ""),
        )

        return Response(
            {
                "resume_id": resume.id,
                "target_role": serializer.validated_data["target_role"],
                **recommendations,
            },
            status=status.HTTP_200_OK,
        )


class ScrapedJobsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resume = Resume.objects.filter(user=request.user).order_by("-uploaded_at").first()
        if not resume or not hasattr(resume, "data"):
            return Response(
                {"error": "No parsed resume found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        skills = resume.data.verified_skills or []
        if not skills:
            return Response(
                {"error": "No confirmed skills available for job discovery."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            jobs_payload = search_jobs(user_skills=skills)
        except JobScraperConfigurationError as error:
            return Response({"error": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as error:
            return Response({"error": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except requests.RequestException:
            return Response(
                {"error": "Unable to fetch jobs from the scraper right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "resume_id": resume.id,
                "skills_used": skills,
                **jobs_payload,
            },
            status=status.HTTP_200_OK,
        )
