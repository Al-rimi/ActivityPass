from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import StudentProfile


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "last_name", "email", "role"]

    def get_role(self, obj):
        if obj.is_staff:
            return "staff"
        return "student" if hasattr(obj, 'student_profile') else "user"


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["id", "user", "major", "college", "class_name", "gender", "phone", "chinese_level", "year", "activities_participated", "remaining_activity_slots"]
        read_only_fields = ["activities_participated", "remaining_activity_slots"]
