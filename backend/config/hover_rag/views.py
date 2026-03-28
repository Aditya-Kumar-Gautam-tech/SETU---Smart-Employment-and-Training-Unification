import logging
import os

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from hover_rag.engine import generate_insights, index_resume
from hover_rag.serializers import (
    IndexResumeSerializer,
    InsightsRequestSerializer,
    InsightsResponseSerializer,
)

logger = logging.getLogger(__name__)


class IndexResumeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = IndexResumeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = index_resume(request.user.id, serializer.validated_data.get("resume"))
            return Response({"ok": True, **result}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Failed to prepare hover resume context for user %s", request.user.id)
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InsightsRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        job = serializer.validated_data["job"]
        resume_meta = serializer.validated_data.get("resume_meta")

        try:
            insights = generate_insights(request.user.id, job, resume_meta)
            response_serializer = InsightsResponseSerializer(data=insights)
            if response_serializer.is_valid():
                return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
            return Response(insights, status=status.HTTP_200_OK)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Insights generation failed for user %s", request.user.id)
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HealthView(APIView):
    permission_classes = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "llm_model": os.environ.get("OR_MODEL", "mistralai/mistral-7b-instruct:free"),
                "resume_source": "latest uploaded resume file",
                "retrieval_mode": "local keyword chunk scoring",
                "paid_embeddings": False,
                "llm_fallback_mode": "deterministic",
            }
        )
