from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import StudentProfile, AccountMeta


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "last_name", "email", "role", "must_change_password"]

    def get_role(self, obj):
        if obj.is_superuser:
            return "admin"
        if obj.is_staff:
            return "staff"
        return "student" if hasattr(obj, 'student_profile') else "user"

    def get_must_change_password(self, obj):
        meta = getattr(obj, 'account_meta', None)
        return bool(meta and meta.must_change_password)


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "user",
            "student_id",
            "major",
            "college",
            "class_name",
            "gender",
            "phone",
            "chinese_level",
            "year",
            "activities_participated",
            "remaining_activity_slots",
        ]
        read_only_fields = ["activities_participated", "remaining_activity_slots"]
