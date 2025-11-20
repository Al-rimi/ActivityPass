"""
URL configuration for ActivityPass project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.http import HttpResponse
from pathlib import Path
from ActivityPass.health import health
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from activities.views import ActivityViewSet, ParticipationViewSet, StudentCourseEventViewSet, eligibility_check
from accounts.views import StudentProfileViewSet
from accounts.auth_views import register, me, TokenObtainOrCreateStudentView
from accounts import admin_views as accounts_admin

router = DefaultRouter()
router.register(r'activities', ActivityViewSet)
router.register(r'participations', ParticipationViewSet)
router.register(r'course-events', StudentCourseEventViewSet)
router.register(r'student-profile', StudentProfileViewSet, basename='student-profile')
router.register(r'admin/users', accounts_admin.AdminUserViewSet, basename='admin-users')

FRONTEND_INDEX = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'build' / 'index.html'

def _frontend_view():
    if FRONTEND_INDEX.exists():
        return TemplateView.as_view(template_name='index.html')
    return lambda request: HttpResponse('Frontend build not found. Run: python manage.py build_frontend or use runfullstack for dev.', status=503)

spa_view = _frontend_view()

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/eligibility/<int:activity_id>/', eligibility_check, name='eligibility-check'),
    # Auth (JWT)
    path('api/token/', TokenObtainOrCreateStudentView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Unified auth
    path('api/auth/register/', register, name='auth_register'),
    path('api/auth/me/', me, name='auth_me'),
    # Admin management
    path('api/admin/create-staff/', accounts_admin.create_staff, name='admin_create_staff'),
    path('api/admin/create-student/', accounts_admin.create_student, name='admin_create_student'),
    path('api/admin/reset-password/', accounts_admin.reset_password, name='admin_reset_password'),
    path('api/admin/prompt-default-students-change/', accounts_admin.prompt_default_students_change, name='admin_prompt_default_students_change'),
    # Serve React build (if built) for all remaining GET routes.
    re_path(r'^(?!api/|health/).*$', spa_view, name='react-app'),
    path('health/', health, name='health'),
]
