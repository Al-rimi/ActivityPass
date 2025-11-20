from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
import random
import string

from .serializers import UserSerializer
from .models import AccountMeta


def _rand_digits(n: int = 8) -> str:
    return ''.join(random.choices(string.digits, k=n))


def _ensure_meta(user):
    meta, _ = AccountMeta.objects.get_or_create(user=user)
    return meta


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view=None):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


@api_view(['POST'])
@permission_classes([IsAdmin])
@transaction.atomic
def create_staff(request):
    """Create a new staff account with a random 8-digit password.
    Body: {"username": str, "email"?: str}
    Returns: {user, password}
    """
    username = (request.data.get('username') or '').strip()
    email = (request.data.get('email') or '').strip()
    if not username:
        return Response({'detail': 'username required'}, status=400)
    User = get_user_model()
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'username already exists'}, status=400)
    pwd = _rand_digits(8)
    user = User.objects.create_user(username=username, email=email or '', password=pwd)
    user.is_staff = True
    user.save()
    _ensure_meta(user)
    return Response({'user': UserSerializer(user).data, 'password': pwd}, status=201)


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
            new_pw = _rand_digits(8)
        else:
            new_pw = _rand_digits(10)
    user.set_password(new_pw)
    user.save()
    meta = _ensure_meta(user)
    meta.must_change_password = True
    meta.save()
    return Response({'user': UserSerializer(user).data, 'password': new_pw})


@api_view(['POST'])
@permission_classes([IsAdmin])
@transaction.atomic
def prompt_default_students_change(request):
    """Mark all students still using default '000000' password to must_change_password.
    Returns: {flagged: int}
    """
    User = get_user_model()
    flagged = 0
    for user in User.objects.all().select_related('student_profile'):
        if hasattr(user, 'student_profile') and user.check_password('000000'):
            meta = _ensure_meta(user)
            if not meta.must_change_password:
                meta.must_change_password = True
                meta.save()
                flagged += 1
    return Response({'flagged': flagged})
