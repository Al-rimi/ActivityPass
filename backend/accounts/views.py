from rest_framework import viewsets, permissions

from .models import StudentProfile
from .serializers import StudentProfileSerializer


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.select_related('user').all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            return qs
        profile = getattr(self.request.user, 'student_profile', None)
        if profile:
            return qs.filter(pk=profile.pk)
        return qs.none()
