from rest_framework import serializers
from django.utils.translation import get_language

from accounts.serializers import StudentProfileSerializer
from .models import Activity, Participation, StudentCourseEvent


class ActivitySerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Activity
        fields = [
            'id', 'title', 'description', 'title_i18n', 'description_i18n',
            'college_required', 'major_required', 'chinese_level_min',
            'start_datetime', 'end_datetime', 'capacity', 'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_at', 'created_by_username']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # derive language code: default to 'en' or 'zh'
        lang = 'en'
        if request:
            # Accept-Language like 'zh-CN,zh;q=0.9'
            accept = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
            if 'zh' in accept.lower():
                lang = 'zh'
            elif 'en' in accept.lower():
                lang = 'en'
            # query param override
            qp = request.query_params.get('lang')
            if qp:
                lang = 'zh' if qp.lower().startswith('zh') else 'en'
        # replace title/description with translated values if present
        i18n_title = (instance.title_i18n or {})
        i18n_desc = (instance.description_i18n or {})
        data['title'] = i18n_title.get(lang) or data.get('title')
        data['description'] = i18n_desc.get(lang) or data.get('description')
        return data


class StudentCourseEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentCourseEvent
        fields = ['id', 'student', 'title', 'title_i18n', 'start_datetime', 'end_datetime']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        lang = 'en'
        if request:
            accept = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
            if 'zh' in accept.lower():
                lang = 'zh'
            elif 'en' in accept.lower():
                lang = 'en'
            qp = request.query_params.get('lang')
            if qp:
                lang = 'zh' if qp.lower().startswith('zh') else 'en'
        data['title'] = (instance.title_i18n or {}).get(lang) or data.get('title')
        return data


class ParticipationSerializer(serializers.ModelSerializer):
    student = StudentProfileSerializer(read_only=True)

    class Meta:
        model = Participation
        fields = ['id', 'student', 'activity', 'status', 'applied_at']
        read_only_fields = ['applied_at']
