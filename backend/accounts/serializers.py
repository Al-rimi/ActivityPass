from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import StudentProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "last_name", "email"]


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["id", "user", "major", "college", "chinese_level", "year", "activities_participated", "remaining_activity_slots"]
        read_only_fields = ["activities_participated", "remaining_activity_slots"]
