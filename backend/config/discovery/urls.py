from django.urls import path

from .views import ResumeRecommendationView, ScrapedJobsView


urlpatterns = [
    path("recommendations/", ResumeRecommendationView.as_view()),
    path("jobs/", ScrapedJobsView.as_view()),
]
