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
from accounts.views import StudentProfileViewSet, FacultyProfileViewSet
from accounts.auth_views import register, me, TokenObtainOrCreateStudentView
from accounts import admin_views as accounts_admin

router = DefaultRouter()
router.register(r'activities', ActivityViewSet)
router.register(r'participations', ParticipationViewSet)
router.register(r'course-events', StudentCourseEventViewSet, basename='course-events')
router.register(r'student-profile', StudentProfileViewSet, basename='student-profile')
router.register(r'faculty-profile', FacultyProfileViewSet, basename='faculty-profile')
router.register(r'admin/users', accounts_admin.AdminUserViewSet, basename='admin-users')
router.register(r'admin/courses', accounts_admin.AdminCourseViewSet, basename='admin-courses')
router.register(r'admin/course-enrollments', accounts_admin.AdminCourseEnrollmentViewSet, basename='admin-course-enrollments')
router.register(r'admin/academic-terms', accounts_admin.AdminAcademicTermViewSet, basename='admin-academic-terms')
router.register(r'admin/activities', accounts_admin.AdminActivityViewSet, basename='admin-activities')

FRONTEND_INDEX = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'build' / 'index.html'

def frontend_view(request):
    if FRONTEND_INDEX.exists():
        return TemplateView.as_view(template_name='index.html')(request)
    return HttpResponse('Frontend build not found. Run: python manage.py build_frontend or use runfullstack for dev.', status=503)

spa_view = frontend_view

# Serve static files in development (before catch-all to avoid conflicts)
from django.conf import settings
from django.conf.urls.static import static
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
    path('api/admin/create-faculty/', accounts_admin.create_faculty, name='admin_create_faculty'),
    path('api/admin/create-student/', accounts_admin.create_student, name='admin_create_student'),
    path('api/admin/reset-password/', accounts_admin.reset_password, name='admin_reset_password'),
    path('api/admin/courses/import/', accounts_admin.import_courses, name='admin_courses_import'),
    path('api/admin/faculty/course-counts/', accounts_admin.get_faculty_course_counts, name='admin_faculty_course_counts'),
    path('api/admin/security/preferences/', accounts_admin.get_security_preferences, name='admin_security_preferences'),
    path('api/admin/security/toggle/', accounts_admin.toggle_default_password_enforcement, name='admin_security_toggle'),
    path('api/admin/counts/', accounts_admin.get_counts, name='admin_counts'),
    path('api/admin/students-with-counts/', accounts_admin.get_students_with_counts, name='admin_students_with_counts'),
    path('api/admin/faculty-with-counts/', accounts_admin.get_faculty_with_counts, name='admin_faculty_with_counts'),
    path('api/admin/staff-list/', accounts_admin.get_staff_with_counts, name='admin_staff_list'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # Also serve frontend build assets directly
    from pathlib import Path
    frontend_build = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'build'
    if frontend_build.exists():
        urlpatterns += static('/assets/', document_root=str(frontend_build / 'assets'))

# Catch-all for React app (must come after static serving)
urlpatterns += [
    re_path(r'^(?!api/|health/).*$', spa_view, name='react-app'),
    path('health/', health, name='health'),
]
