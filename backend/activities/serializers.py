from rest_framework import serializers

from accounts.serializers import StudentProfileSerializer
from .models import Activity, Participation, StudentCourseEvent


class ActivitySerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Activity
        fields = [
            'id', 'title', 'description', 'college_required', 'major_required', 'chinese_level_min',
            'start_datetime', 'end_datetime', 'capacity', 'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_at', 'created_by_username']


class StudentCourseEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentCourseEvent
        fields = ['id', 'student', 'title', 'start_datetime', 'end_datetime']


class ParticipationSerializer(serializers.ModelSerializer):
    student = StudentProfileSerializer(read_only=True)

    class Meta:
        model = Participation
        fields = ['id', 'student', 'activity', 'status', 'applied_at']
        read_only_fields = ['applied_at']
