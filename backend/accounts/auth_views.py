from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import transaction

from .models import StudentProfile
from .serializers import UserSerializer, StudentProfileSerializer
from .utils import to_key, gender_key

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """Register a new user as staff or student.
    Expected JSON: {username, password, role: 'staff'|'student', email?, profile?:{major,college,chinese_level,year}}
    """
    data = request.data
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    if not username or not password or role not in ('staff','student'):
        return Response({'detail': 'username, password, role required'}, status=400)
    if get_user_model().objects.filter(username=username).exists():
        return Response({'detail': 'Username already exists'}, status=400)
    user = get_user_model().objects.create_user(username=username, password=password, email=data.get('email',''))
    if role == 'staff':
        user.is_staff = True
        user.save()
    else:
        profile_data = data.get('profile', {}) or {}
        defaults = {
            'student_id': username,
            'major': to_key(profile_data.get('major_key') or profile_data.get('major') or ''),
            'college': to_key(profile_data.get('college_key') or profile_data.get('college') or ''),
            'class_name': to_key(profile_data.get('class_name_key') or profile_data.get('class_name') or ''),
            'gender': gender_key(profile_data.get('gender')),
            'chinese_level': profile_data.get('chinese_level', ''),
            'year': profile_data.get('year', 1),
            'phone': profile_data.get('phone', ''),
        }
        StudentProfile.objects.update_or_create(user=user, defaults=defaults)
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }
    }, status=201)

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    user = request.user
    if request.method == 'PATCH':
        # Allow updating basic fields (first_name, last_name, email) and student_profile basics
        user_changed = False
        for field in ['first_name', 'last_name', 'email']:
            if field in request.data:
                setattr(user, field, request.data.get(field) or '')
                user_changed = True
        if user_changed:
            user.save()
        sp = getattr(user, 'student_profile', None)
        if sp:
            sp_changed = False
            for field in ['major', 'college', 'class_name', 'gender', 'phone', 'chinese_level']:
                if field in request.data:
                    setattr(sp, field, request.data.get(field) or '')
                    sp_changed = True
            if sp_changed:
                sp.save()
    data = UserSerializer(user).data
    if hasattr(user, 'student_profile'):
        data['student_profile'] = StudentProfileSerializer(user.student_profile).data
    return Response(data)


def _valid_student_id(s: str) -> bool:
    return s.isdigit() and len(s) == 12 and 2000 <= int(s[:4]) <= 2099


class TokenObtainOrCreateStudentView(TokenObtainPairView):
    """
    Custom token obtain:
    - If user exists -> normal behavior
    - If user does not exist AND username matches valid student ID AND password == '000000'
      -> create user + StudentProfile with derived year, then return tokens.
    """
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        username = request.data.get('username') or request.data.get('student_id')
        password = request.data.get('password')
        if username and password and not get_user_model().objects.filter(username=username).exists():
            if _valid_student_id(username) and password == '000000':
                # Provision new student
                user = get_user_model().objects.create_user(username=username, password=password)
                try:
                    year = int(username[:4])
                except Exception:
                    year = 1
                StudentProfile.objects.create(user=user, student_id=username, year=year)
        # Fallback to standard token obtain
        return super().post(request, *args, **kwargs)
