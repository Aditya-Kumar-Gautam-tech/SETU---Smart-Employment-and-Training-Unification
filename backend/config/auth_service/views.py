import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import GoogleOAuthSerializer, SignupSerializer
from .models import User


def build_token_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def verify_google_id_token(id_token):
    query = urlencode({"id_token": id_token})
    url = f"https://oauth2.googleapis.com/tokeninfo?{query}"

    with urlopen(url, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return payload


class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created"}, status=201)
        return Response(serializer.errors, status=400)

class LoginView(APIView):
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = User.objects.filter(email=email).first()
        if user and user.check_password(password):
            return Response(build_token_response(user))
        return Response({"error": "Invalid credentials"}, status=401)


class GoogleOAuthLoginView(APIView):
    def post(self, request):
        serializer = GoogleOAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = verify_google_id_token(serializer.validated_data["id_token"])
        except (HTTPError, URLError, TimeoutError, ValueError):
            return Response(
                {"error": "Unable to verify Google token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        audience = payload.get("aud")
        if settings.GOOGLE_OAUTH_CLIENT_IDS and audience not in settings.GOOGLE_OAUTH_CLIENT_IDS:
            return Response(
                {"error": "Token audience is not allowed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payload.get("email_verified") != "true":
            return Response(
                {"error": "Google account email is not verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = payload.get("email")
        name = payload.get("name") or payload.get("given_name") or email

        if not email:
            return Response(
                {"error": "Google account email is missing"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"name": name},
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
        elif not user.name and name:
            user.name = name
            user.save(update_fields=["name"])

        token_response = build_token_response(user)
        token_response["user"] = {
            "email": user.email,
            "name": user.name,
            "role": user.role,
        }
        return Response(token_response, status=status.HTTP_200_OK)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "email": user.email,
            "name": user.name,
            "role": user.role
        })
