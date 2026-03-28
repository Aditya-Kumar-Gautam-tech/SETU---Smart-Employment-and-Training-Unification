from unittest.mock import patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthServiceTests(APITestCase):
    def test_login_returns_jwt_pair_for_password_user(self):
        User.objects.create_user(
            email="user@example.com",
            name="Example User",
            password="secret123",
        )

        response = self.client.post(
            "/auth/login/",
            {"email": "user@example.com", "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    @override_settings(GOOGLE_OAUTH_CLIENT_IDS=["google-client-id"])
    @patch("auth_service.views.verify_google_id_token")
    def test_google_oauth_login_creates_user_and_returns_jwt(
        self,
        mock_verify_google_id_token,
    ):
        mock_verify_google_id_token.return_value = {
            "aud": "google-client-id",
            "email": "oauth@example.com",
            "email_verified": "true",
            "name": "OAuth User",
        }

        response = self.client.post(
            "/auth/oauth/google/",
            {"id_token": "google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "oauth@example.com")

        user = User.objects.get(email="oauth@example.com")
        self.assertFalse(user.has_usable_password())

    @override_settings(GOOGLE_OAUTH_CLIENT_IDS=["google-client-id"])
    @patch("auth_service.views.verify_google_id_token")
    def test_google_oauth_login_rejects_wrong_audience(
        self,
        mock_verify_google_id_token,
    ):
        mock_verify_google_id_token.return_value = {
            "aud": "unexpected-client-id",
            "email": "oauth@example.com",
            "email_verified": "true",
        }

        response = self.client.post(
            "/auth/oauth/google/",
            {"id_token": "google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Token audience is not allowed")
