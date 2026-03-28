from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL

class Resume(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="resumes"
    )
    file = models.FileField(upload_to="resumes/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Resume {self.id} - {self.user}"

class ResumeData(models.Model):
    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        related_name="data"
    )
    extracted_skills = models.JSONField(
        help_text="Raw skills extracted by ML parser"
    )
    verified_skills = models.JSONField(
        blank=True,
        null=True,
        help_text="User-confirmed skills"
    )
    parsed_resume = models.JSONField(
        blank=True,
        null=True,
        help_text="Full parsed resume payload stored for later downstream features"
    )
    parser_source = models.CharField(
        max_length=20,
        default="unknown",
        help_text="Indicates whether the real parser or dummy parser produced the stored result"
    )
    parsed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ResumeData for resume {self.resume.id}"
