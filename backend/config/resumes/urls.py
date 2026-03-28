from django.urls import path
from .views import (
    ResumeUploadView,
    ResumeSkillsView,
    VerifySkillsView
)

urlpatterns = [
    path('upload/', ResumeUploadView.as_view()),
    path('skills/', ResumeSkillsView.as_view()),
    path('verify-skills/', VerifySkillsView.as_view()),
]
