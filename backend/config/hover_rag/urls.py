from django.urls import path

from hover_rag.views import HealthView, IndexResumeView, InsightsView

urlpatterns = [
    path("index/", IndexResumeView.as_view(), name="hover-rag-index"),
    path("insights/", InsightsView.as_view(), name="hover-rag-insights"),
    path("health/", HealthView.as_view(), name="hover-rag-health"),
]
