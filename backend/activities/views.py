from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from accounts.models import StudentProfile
from .models import Activity, Participation, StudentCourseEvent
from .serializers import (
    ActivitySerializer,
    ParticipationSerializer,
    StudentCourseEventSerializer,
)
from .eligibility import evaluate_eligibility


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all().order_by('-created_at')
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def apply(self, request, pk=None):
        activity = self.get_object()
        student_profile = getattr(request.user, 'student_profile', None)
        if not student_profile:
            return Response({'detail': 'No student profile found.'}, status=400)
        eligibility = evaluate_eligibility(student_profile, activity)
        if not eligibility['eligible']:
            return Response({'detail': 'Not eligible', 'reasons': eligibility['reasons']}, status=400)
        participation, created = Participation.objects.get_or_create(student=student_profile, activity=activity)
        if not created:
            return Response({'detail': 'Already applied.'}, status=400)
        return Response(ParticipationSerializer(participation).data, status=201)


class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.select_related('student', 'activity').all().order_by('-applied_at')
    serializer_class = ParticipationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            return qs
        student_profile = getattr(self.request.user, 'student_profile', None)
        if student_profile:
            return qs.filter(student=student_profile)
        return qs.none()


class StudentCourseEventViewSet(viewsets.ModelViewSet):
    queryset = StudentCourseEvent.objects.all().order_by('start_datetime')
    serializer_class = StudentCourseEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        student_profile = getattr(self.request.user, 'student_profile', None)
        if student_profile and not self.request.user.is_staff:
            return qs.filter(student=student_profile)
        return qs

    def perform_create(self, serializer):
        student_profile = getattr(self.request.user, 'student_profile', None)
        if student_profile:
            serializer.save(student=student_profile)
        else:
            serializer.save()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def eligibility_check(request, activity_id: int):
    try:
        activity = Activity.objects.get(pk=activity_id)
    except Activity.DoesNotExist:
        return Response({'detail': 'Activity not found'}, status=404)
    student_profile = getattr(request.user, 'student_profile', None)
    if not student_profile:
        return Response({'detail': 'No student profile'}, status=400)
    return Response(evaluate_eligibility(student_profile, activity))
