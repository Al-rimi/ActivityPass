from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
import random
import string

from .serializers import UserSerializer, CourseSerializer, CourseEnrollmentSerializer
from rest_framework.decorators import api_view, permission_classes

# ...existing code...

# Place import_courses after IsAdmin and all class definitions

# ...existing code...

# At the end of the file, before toggle_default_password_enforcement


# ...existing code...

# Place import_courses at the end of the file, after all class and function definitions

@api_view(['POST'])
@transaction.atomic
def import_courses(request):
    """Batch import courses. Body: {"courses": [CourseInput, ...]} Returns: {created: int, errors: [{index, error, data}]}"""
    items = request.data.get('courses')
    if not isinstance(items, list):
        return Response({'detail': 'courses must be a list'}, status=400)
    created = 0
    errors = []
    for idx, data in enumerate(items):
        serializer = CourseSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            created += 1
        else:
            errors.append({'index': idx, 'error': serializer.errors, 'data': data})
    return Response({'created': created, 'errors': errors}, status=201 if created else 400)
from .models import AccountMeta, StudentProfile, SecurityPreference, Course, CourseEnrollment


SPECIAL_CHARS = '!@#$%^&*'


def _rand_digits(n: int = 8) -> str:
    return ''.join(random.choices(string.digits, k=n))


def _rand_password(length: int = 8, include_symbols: bool = True) -> str:
    alphabet = string.ascii_letters + string.digits
    if include_symbols:
        alphabet += SPECIAL_CHARS
    return ''.join(random.choice(alphabet) for _ in range(length))


def _ensure_meta(user):
    meta, _ = AccountMeta.objects.get_or_create(user=user)
    return meta


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view=None):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class AdminStudentProfileSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(read_only=True)
    class_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    major = serializers.CharField(required=False, allow_blank=True)
    college = serializers.CharField(required=False, allow_blank=True)
    chinese_level = serializers.CharField(required=False, allow_blank=True)
    year = serializers.IntegerField(required=False)

    class Meta:
        model = StudentProfile
        fields = [
            'student_id',
            'major',
            'college',
            'class_name',
            'gender',
            'phone', 'chinese_level', 'year'
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    student_profile = AdminStudentProfileSerializer(required=False, allow_null=True)
    role = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()
    staff_number = serializers.CharField(source='account_meta.staff_number', required=False, allow_blank=True)

    class Meta:
        model = get_user_model()
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role',
            'must_change_password', 'student_profile', 'staff_number'
        ]
        read_only_fields = ['id', 'username', 'role', 'must_change_password']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'admin'
        if obj.is_staff:
            return 'staff'
        return 'student' if hasattr(obj, 'student_profile') else 'user'

    def get_must_change_password(self, obj):
        meta = getattr(obj, 'account_meta', None)
        return bool(meta and meta.must_change_password)

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('student_profile', None)
        meta_data = validated_data.pop('account_meta', None)
        for field in ['first_name', 'last_name', 'email']:
            if field in validated_data:
                setattr(instance, field, validated_data.get(field) or '')
        instance.save()
        if profile_data is not None:
            profile = getattr(instance, 'student_profile', None)
            if profile:
                for field, value in profile_data.items():
                    setattr(profile, field, value)
                profile.save()
            else:
                StudentProfile.objects.create(user=instance, **profile_data)
        if meta_data is not None:
            meta = _ensure_meta(instance)
            for field, value in meta_data.items():
                setattr(meta, field, value or '')
            meta.save()
        return instance


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        User = get_user_model()
        qs = User.objects.all().select_related('student_profile', 'account_meta')
        role = self.request.query_params.get('role')
        if role == 'student':
            qs = qs.filter(student_profile__isnull=False)
        elif role == 'staff':
            qs = qs.filter(is_staff=True, is_superuser=False)
        elif role == 'admin':
            qs = qs.filter(is_superuser=True)
        q = (self.request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(username__icontains=q) |
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q) |
                Q(email__icontains=q)
            )
        return qs.order_by('-is_superuser', '-is_staff', 'username')

    def get_object(self):
        obj = super().get_object()
        return obj


class AdminCourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = Course.objects.all()
        term = (self.request.query_params.get('term') or '').strip()
        if term:
            qs = qs.filter(term__iexact=term)
        day = self.request.query_params.get('day')
        if day:
            try:
                qs = qs.filter(day_of_week=int(day))
            except (TypeError, ValueError):
                pass
        q = (self.request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(code__icontains=q) |
                Q(teacher__icontains=q) |
                Q(location__icontains=q)
            )
        return qs.order_by('term', 'day_of_week', 'periods', 'title')


class AdminCourseEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = CourseEnrollment.objects.select_related('course', 'student__user')
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs.order_by('-created_at')


@api_view(['POST'])
@permission_classes([IsAdmin])
@transaction.atomic
def create_staff(request):
    """Create a new staff account with a random 8-digit password.
    Body: {"username": str, "email"?: str, "full_name"?: str, "staff_number"?: str}
    Returns: {user, password}
    """
    username = (request.data.get('username') or '').strip()
    email = (request.data.get('email') or '').strip()
    full_name = (request.data.get('full_name') or '').strip()
    staff_number = (request.data.get('staff_number') or '').strip()
    if not username:
        return Response({'detail': 'username required'}, status=400)
    User = get_user_model()
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'username already exists'}, status=400)
    pwd = _rand_password(8)
    user = User.objects.create_user(username=username, email=email or '', password=pwd)
    if full_name:
        user.first_name = full_name
    user.is_staff = True
    user.save()
    meta = _ensure_meta(user)
    if staff_number:
        meta.staff_number = staff_number
        meta.save()
    return Response({'user': UserSerializer(user).data, 'password': pwd}, status=201)


@api_view(['POST'])
@permission_classes([IsAdmin])
@transaction.atomic
def create_student(request):
    """Create a new student account (password defaults to 000000)."""
    student_id = (request.data.get('student_id') or '').strip()
    full_name = (request.data.get('full_name') or '').strip()
    email = (request.data.get('email') or '').strip()
    phone = (request.data.get('phone') or '').strip()
    major = (request.data.get('major') or '').strip()
    college = (request.data.get('college') or '').strip()
    class_name = (request.data.get('class_name') or '').strip()
    gender = (request.data.get('gender') or '').strip()
    chinese_level = (request.data.get('chinese_level') or '').strip()
    year = request.data.get('year')
    if not student_id:
        return Response({'detail': 'student_id required'}, status=400)
    username = (request.data.get('username') or student_id).strip()
    User = get_user_model()
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'username already exists'}, status=400)
    if StudentProfile.objects.filter(student_id=student_id).exists():
        return Response({'detail': 'student_id already exists'}, status=400)
    user = User.objects.create_user(username=username, email=email, password='000000')
    user.first_name = full_name or student_id
    user.save()
    profile_data = {
        'student_id': student_id,
        'phone': phone,
        'major': major,
        'college': college,
        'class_name': class_name,
        'gender': gender,
        'chinese_level': chinese_level,
    }
    if year not in (None, ''):
        try:
            profile_data['year'] = int(year)
        except (TypeError, ValueError):
            return Response({'detail': 'invalid year'}, status=400)
    StudentProfile.objects.create(user=user, **profile_data)
    meta = _ensure_meta(user)
    meta.must_change_password = True
    meta.save()
    return Response({'user': UserSerializer(user).data, 'password': '000000'}, status=201)


@api_view(['POST'])
@permission_classes([IsAdmin])
@transaction.atomic
def reset_password(request):
    """Reset password for a user.
    Body: {"username"?: str, "user_id"?: int, "new_password"?: str}
    Logic: if target is student and no new_password -> set to '000000'.
           if target is staff and no new_password -> generate 8-digit numeric.
           Superusers cannot be reset via this endpoint (safety).
    Returns: {user, password}
    """
    User = get_user_model()
    user = None
    if 'user_id' in request.data:
        try:
            user = User.objects.get(pk=int(request.data['user_id']))
        except Exception:
            return Response({'detail': 'invalid user_id'}, status=400)
    elif 'username' in request.data:
        try:
            user = User.objects.get(username=request.data['username'])
        except User.DoesNotExist:
            return Response({'detail': 'username not found'}, status=404)
    else:
        return Response({'detail': 'username or user_id required'}, status=400)

    if user.is_superuser:
        return Response({'detail': 'cannot reset password for admin via this endpoint'}, status=403)

    new_pw = request.data.get('new_password')
    if not new_pw:
        if hasattr(user, 'student_profile'):
            new_pw = '000000'
        elif user.is_staff:
            new_pw = _rand_password(8)
        else:
            new_pw = _rand_password(10)
    user.set_password(new_pw)
    user.save()
    meta = _ensure_meta(user)
    meta.must_change_password = True
    meta.save()
    return Response({'user': UserSerializer(user).data, 'password': new_pw})


def _toggle_default_flag(role: str, enabled: bool) -> int:
    """Flag accounts of given role to change password when toggled on."""
    User = get_user_model()
    flagged = 0
    if enabled:
        qs = User.objects.all().select_related('student_profile')
        if role == 'student':
            qs = qs.filter(student_profile__isnull=False)
        elif role == 'staff':
            qs = qs.filter(is_staff=True, is_superuser=False)
        for user in qs:
            meta = _ensure_meta(user)
            if not meta.must_change_password:
                meta.must_change_password = True
                meta.save()
                flagged += 1
    return flagged


@api_view(['POST'])
@permission_classes([IsAdmin])
@transaction.atomic
def toggle_default_password_enforcement(request):
    """Toggle forced password change for students or staff.
    Body: {"role": "student"|"staff", "enabled": bool}
    Returns: {"role": role, "enabled": bool, "flagged": int}
    """
    role = request.data.get('role')
    if role not in ('student', 'staff'):
        return Response({'detail': 'invalid role'}, status=400)
    enabled = bool(request.data.get('enabled'))
    prefs = SecurityPreference.get_solo()
    if role == 'student':
        prefs.force_students_change_default = enabled
    else:
        prefs.force_staff_change_default = enabled
    prefs.save()
    flagged = _toggle_default_flag(role, enabled)
    return Response({'role': role, 'enabled': enabled, 'flagged': flagged})


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_security_preferences(request):
    prefs = SecurityPreference.get_solo()
    return Response({
        'force_students_change_default': prefs.force_students_change_default,
        'force_staff_change_default': prefs.force_staff_change_default,
    })
