from rest_framework import viewsets, permissions

from .models import StudentProfile, FacultyProfile
from .serializers import StudentProfileSerializer, FacultyProfileSerializer


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.select_related('user').all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff or self.request.user.is_superuser:
            return qs
        profile = getattr(self.request.user, 'student_profile', None)
        if profile:
            return qs.filter(pk=profile.pk)
        return qs.none()


class FacultyProfileViewSet(viewsets.ModelViewSet):
    queryset = FacultyProfile.objects.select_related('user').all()
    serializer_class = FacultyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff or self.request.user.is_superuser:
            return qs
        profile = getattr(self.request.user, 'faculty_profile', None)
        if profile:
            return qs.filter(pk=profile.pk)
        return qs.none()
