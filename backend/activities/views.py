from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from accounts.models import StudentProfile
from .models import Activity, Participation
from .serializers import (
    ActivitySerializer,
    ParticipationSerializer,
)
from .eligibility import evaluate_eligibility
from .course_events import build_student_course_event_payloads, build_student_course_payloads


class IsStaffOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all().order_by('-created_at')
    serializer_class = ActivitySerializer
    permission_classes = [IsStaffOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='eligible')
    def eligible(self, request):
        student_profile = getattr(request.user, 'student_profile', None)
        if not student_profile:
            return Response([])

        qs = self.filter_queryset(self.get_queryset()).filter(end_datetime__gte=timezone.now()).order_by('start_datetime')
        limit_param = request.query_params.get('limit')
        limit = None
        if limit_param and limit_param.isdigit():
            try:
                limit = max(int(limit_param), 0)
            except ValueError:
                limit = None

        results = []
        for activity in qs:
            evaluation = evaluate_eligibility(student_profile, activity)
            if not evaluation.get('eligible'):
                continue
            serializer = self.get_serializer(activity, context=self.get_serializer_context())
            data = serializer.data
            data['eligibility'] = evaluation
            results.append(data)
            if limit is not None and len(results) >= limit:
                break

        return Response(results)

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
        if self.request.user.is_staff or self.request.user.is_superuser:
            # Allow admin users to filter by student
            student_id = self.request.query_params.get('student')
            if student_id:
                qs = qs.filter(student_id=student_id)
            return qs
        student_profile = getattr(self.request.user, 'student_profile', None)
        if student_profile:
            return qs.filter(student=student_profile)
        return qs.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class StudentCourseEventViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def list(self, request):
        student_profile = getattr(request.user, 'student_profile', None)
        target_student = student_profile

        if request.user.is_staff or request.user.is_superuser:
            student_id = request.query_params.get('student')
            if student_id:
                try:
                    target_student = StudentProfile.objects.get(pk=student_id)
                except StudentProfile.DoesNotExist:
                    target_student = None

        if not target_student:
            return Response([])

        payloads = build_student_course_payloads(target_student)

        lang = 'en'
        accept = request.META.get('HTTP_ACCEPT_LANGUAGE', '') if request else ''
        if 'zh' in accept.lower():
            lang = 'zh'
        elif 'en' in accept.lower():
            lang = 'en'
        qp = request.query_params.get('lang') if request else None
        if qp:
            lang = 'zh' if qp.lower().startswith('zh') else 'en'

        for item in payloads:
            title_i18n = item.get('title_i18n') or {}
            item['title'] = title_i18n.get(lang, item.get('title'))

        return Response(payloads)


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
