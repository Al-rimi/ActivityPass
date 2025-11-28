from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import StudentProfile, AccountMeta, Course, CourseEnrollment, AcademicTerm, FacultyProfile


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


class FacultyProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            "id",
            "user",
            "faculty_id",
            "name",
            "gender",
            "department",
            "position",
            "title_level",
            "title",
            "staff_type",
            "birth_date",
            "is_external",
            "is_main_lecturer",
        ]


class CourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    teacher_faculty_id = serializers.CharField(source='teacher_id', read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "title",
            "course_type_detail",
            "teacher_id",
            "teacher_name",
            "teacher_faculty_id",
            "location",
            "term",
            "term_start_date",
            "weekday",
            "periods",
            "weeks",
            "credits",
            "department_name",
            "category",
            "nature",
            "teaching_mode",
            "exam_type",
            "grading_method",
            "hours_per_week",
            "total_course_hours",
            "enrolled_students",
            "class_students",
            "capacity",
            "campus_name",
            "majors",
            "grades",
            "audience",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_teacher_name(self, obj):
        """Get teacher name by looking up FacultyProfile with matching faculty_id"""
        if obj.teacher_id:
            try:
                faculty = FacultyProfile.objects.get(faculty_id=obj.teacher_id)
                return faculty.name or faculty.user.first_name
            except FacultyProfile.DoesNotExist:
                pass
        return ""

    def validate_weeks(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("weeks must be a list of week numbers")
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
        day = attrs.get('weekday') or getattr(self.instance, 'weekday', None)
        if day and not 1 <= day <= 7:
            raise serializers.ValidationError({'weekday': 'Day of week must be between 1 (Mon) and 7 (Sun).'})
        
        # Validate that term_start_date matches the expected date for the term
        term = attrs.get('term') or getattr(self.instance, 'term', None)
        term_start_date = attrs.get('term_start_date') or getattr(self.instance, 'term_start_date', None)
        
        if term and term_start_date:
            try:
                academic_term = AcademicTerm.objects.get(term=term, is_active=True)
                if academic_term.first_week_monday != term_start_date:
                    raise serializers.ValidationError({
                        'term_start_date': f'Invalid week 1 Monday date for term {term}. Expected: {academic_term.first_week_monday}, got: {term_start_date}'
                    })
            except AcademicTerm.DoesNotExist:
                raise serializers.ValidationError({
                    'term': f'No active academic term configuration found for term: {term}. Please configure the term first.'
                })
        
        return attrs


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.first_name', read_only=True)
    student_username = serializers.CharField(source='student.user.username', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    course = CourseSerializer(read_only=True)  # Include full course data
    student = StudentProfileSerializer(read_only=True)  # Include full student data

    class Meta:
        model = CourseEnrollment
        fields = [
            'id',
            'course',  # Now includes full course data
            'course_title',
            'student',  # Now includes full student data
            'student_name',
            'student_username',
            'created_at',
        ]
        read_only_fields = ['created_at', 'course_title', 'student_name', 'student_username']


class AcademicTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicTerm
        fields = [
            "id",
            "term",
            "academic_year",
            "semester",
            "first_week_monday",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_term(self, value):
        """Validate term format (e.g., '2025-2026-1')"""
        import re
        if not re.match(r'^\d{4}-\d{4}-\d$', value):
            raise serializers.ValidationError("Term must be in format 'YYYY-YYYY-N' (e.g., '2025-2026-1')")
        return value

    def validate(self, attrs):
        term = attrs.get('term')
        first_week_monday = attrs.get('first_week_monday')
        
        if term and first_week_monday:
            # Check for duplicate first_week_monday
            queryset = AcademicTerm.objects.filter(first_week_monday=first_week_monday)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({
                    'first_week_monday': f'This date is already assigned to term: {queryset.first().term}'
                })
        
        return attrs
