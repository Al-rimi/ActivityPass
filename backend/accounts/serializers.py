from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import StudentProfile, AccountMeta, Course, CourseEnrollment


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


class CourseSerializer(serializers.ModelSerializer):

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "title",
            "course_type",
            "teacher",
            "location",
            "term",
            "first_week_monday",
            "day_of_week",
            "periods",
            "week_pattern",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_week_pattern(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("week_pattern must be a list of weeks")
        cleaned = []
        for item in value:
            try:
                week = int(item)
            except (TypeError, ValueError):
                raise serializers.ValidationError("Week entries must be integers")
            if week < 1:
                raise serializers.ValidationError("Week numbers must be >= 1")
            cleaned.append(week)
        return sorted(set(cleaned))

    def validate_periods(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("periods must be a list of period numbers")
        cleaned = []
        for item in value:
            try:
                period = int(item)
            except (TypeError, ValueError):
                raise serializers.ValidationError("Period entries must be integers")
            if not 1 <= period <= 13:
                raise serializers.ValidationError("Period numbers must be between 1 and 13")
            cleaned.append(period)
        return sorted(set(cleaned))

    def validate(self, attrs):
        day = attrs.get('day_of_week') or getattr(self.instance, 'day_of_week', None)
        if day and not 1 <= day <= 7:
            raise serializers.ValidationError({'day_of_week': 'Day of week must be between 1 (Mon) and 7 (Sun).'})
        return attrs


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.first_name', read_only=True)
    student_username = serializers.CharField(source='student.user.username', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = [
            'id',
            'course',
            'course_title',
            'student',
            'student_name',
            'student_username',
            'created_at',
        ]
        read_only_fields = ['created_at', 'course_title', 'student_name', 'student_username']
