from django.urls import path
from .views import GoogleOAuthLoginView, LoginView, MeView, SignupView

urlpatterns = [
    path('signup/', SignupView.as_view()),
    path('login/', LoginView.as_view()),
    path('oauth/google/', GoogleOAuthLoginView.as_view()),
    path('me/', MeView.as_view()),
]
