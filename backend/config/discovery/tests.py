from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from job_scraper_service import JobScraperConfigurationError
from resumes.models import Resume, ResumeData
from skills_rag.services import ResumeRecommendationService


class FakeLLMClient:
    model = "presentation-model"

    def is_configured(self):
        return True

    def generate_json(self, messages):
        return {
            "summary": "The resume is close to the target role but needs stronger core-skill alignment.",
            "ats_keywords": ["backend", "api", "microservices"],
            "recommendations": [
                "Add one project bullet that shows API design and measurable backend impact.",
                "Surface algorithms and data structures explicitly in project descriptions.",
            ],
            "missing_core_skills": ["data structures"],
        }


class ResumeRecommendationServiceTests(TestCase):
    def test_generates_fallback_recommendations_for_sde(self):
        service = ResumeRecommendationService()

        result = service.generate(
            role_name="SDE",
            extracted_skills=["Python", "Django", "SQL"],
            verified_skills=["Git"],
        )

        self.assertEqual(result["role_key"], "sde")
        self.assertIn("python", result["matched_skills"])
        self.assertIn("data structures", result["missing_must_have_skills"])
        self.assertEqual(result["llm"]["generation_mode"], "fallback")
        self.assertTrue(result["recommendations"])

    def test_uses_llm_client_when_available(self):
        service = ResumeRecommendationService(llm_client=FakeLLMClient())

        result = service.generate(
            role_name="SDE",
            extracted_skills=["Python", "Django", "SQL"],
            verified_skills=["Git"],
            job_description="Looking for backend API development and scalable services.",
        )

        self.assertEqual(result["llm"]["generation_mode"], "llm")
        self.assertEqual(result["summary"], "The resume is close to the target role but needs stronger core-skill alignment.")
        self.assertIn("backend", result["ats_keywords"])


class ResumeRecommendationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="test@example.com",
            name="Test User",
            password="secret123",
        )
        self.client.force_authenticate(user=self.user)

    def test_returns_recommendations_for_latest_resume(self):
        resume = Resume.objects.create(user=self.user, file="resumes/test.pdf")
        ResumeData.objects.create(
            resume=resume,
            extracted_skills=["python", "django", "sql"],
            verified_skills=["git"],
        )

        response = self.client.post(
            "/discovery/recommendations/",
            {
                "target_role": "SDE",
                "job_description": "Need a backend engineer with APIs and system design exposure.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role_key"], "sde")
        self.assertIn("missing_must_have_skills", response.data)
        self.assertIn("recommendations", response.data)
        self.assertIn("llm", response.data)

    def test_returns_404_when_resume_is_missing(self):
        response = self.client.post("/discovery/recommendations/", {"target_role": "SDE"}, format="json")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "No parsed resume found for this user.")

    @patch("discovery.views.search_jobs")
    def test_returns_scraped_jobs_for_latest_resume(self, mock_search_jobs):
        resume = Resume.objects.create(user=self.user, file="resumes/test.pdf")
        ResumeData.objects.create(
            resume=resume,
            extracted_skills=["python", "django", "sql"],
            verified_skills=["python", "django"],
        )
        mock_search_jobs.return_value = {
            "query": "python django",
            "jobs": [
                {
                    "title": "Backend Developer",
                    "company": "Example Co",
                    "location": "Remote",
                    "description": "Build APIs with Django",
                    "score": 100,
                    "matched_skills": ["python", "django"],
                    "link": "https://example.com/job",
                }
            ],
        }

        response = self.client.get("/discovery/jobs/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["skills_used"], ["python", "django"])
        self.assertEqual(len(response.data["jobs"]), 1)

    def test_returns_404_for_scraped_jobs_when_resume_is_missing(self):
        response = self.client.get("/discovery/jobs/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "No parsed resume found for this user.")

    def test_returns_400_when_verified_skills_are_missing_for_job_discovery(self):
        resume = Resume.objects.create(user=self.user, file="resumes/test.pdf")
        ResumeData.objects.create(
            resume=resume,
            extracted_skills=["python", "django", "sql"],
            verified_skills=[],
        )

        response = self.client.get("/discovery/jobs/")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "No confirmed skills available for job discovery.")

    @patch("discovery.views.search_jobs")
    def test_returns_503_when_scraper_credentials_are_rejected(self, mock_search_jobs):
        resume = Resume.objects.create(user=self.user, file="resumes/test.pdf")
        ResumeData.objects.create(
            resume=resume,
            extracted_skills=["python", "django", "sql"],
            verified_skills=["python", "django"],
        )
        mock_search_jobs.side_effect = JobScraperConfigurationError(
            "Adzuna credentials were rejected by the upstream API."
        )

        response = self.client.get("/discovery/jobs/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"], "Adzuna credentials were rejected by the upstream API.")


class SearchJobsTests(TestCase):
    @patch("job_scraper_service.requests.get")
    @patch("job_scraper_service.get_setting")
    def test_raises_configuration_error_when_upstream_rejects_credentials(self, mock_get_setting, mock_get):
        settings_map = {
            "ADZUNA_APP_ID": "test-app-id",
            "ADZUNA_APP_KEY": "test-app-key",
            "ADZUNA_COUNTRY": "in",
            "ADZUNA_RESULTS_TO_FETCH": "20",
        }
        mock_get_setting.side_effect = lambda name, fallback="": settings_map.get(name, fallback)

        mock_response = Mock(status_code=401)
        mock_get.return_value = mock_response

        with self.assertRaisesMessage(
            JobScraperConfigurationError,
            "Adzuna credentials were rejected by the upstream API.",
        ):
            from job_scraper_service import search_jobs

            search_jobs(["python", "django"])

    @patch("job_scraper_service.requests.get")
    @patch("job_scraper_service.get_setting")
    def test_returns_jobs_matching_any_confirmed_skill(self, mock_get_setting, mock_get):
        settings_map = {
            "ADZUNA_APP_ID": "test-app-id",
            "ADZUNA_APP_KEY": "test-app-key",
            "ADZUNA_COUNTRY": "in",
            "ADZUNA_RESULTS_TO_FETCH": "20",
        }
        mock_get_setting.side_effect = lambda name, fallback="": settings_map.get(name, fallback)

        python_job = {
            "title": "Python Developer Intern",
            "description": "Looking for python developers.",
            "redirect_url": "https://example.com/python-job",
            "company": {"display_name": "Example Co"},
            "location": {"display_name": "Remote"},
        }
        java_only_job = {
            "title": "Java Developer Intern",
            "description": "Looking for java developers.",
            "redirect_url": "https://example.com/java-job",
            "company": {"display_name": "Other Co"},
            "location": {"display_name": "Remote"},
        }

        python_response = Mock(status_code=200)
        python_response.json.return_value = {"results": [python_job]}
        java_response = Mock(status_code=200)
        java_response.json.return_value = {"results": [java_only_job]}
        mock_get.side_effect = [python_response, java_response, python_response]

        from job_scraper_service import search_jobs

        result = search_jobs(["python", "java"])

        self.assertTrue(any(job["title"] == "Python Developer Intern" for job in result["jobs"]))
        self.assertTrue(any(job["title"] == "Java Developer Intern" for job in result["jobs"]))
