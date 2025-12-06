from rest_framework import serializers

from accounts.serializers import StudentProfileSerializer
from .models import Activity, Participation


class ActivitySerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Activity
        fields = [
            'id', 'title', 'description', 'title_i18n', 'description_i18n',
            'college_required', 'countries', 'major_required', 'chinese_level_min', 'location',
            'start_datetime', 'end_datetime', 'capacity', 'created_by_username', 'created_at'
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


class ParticipationSerializer(serializers.ModelSerializer):
    student = StudentProfileSerializer(read_only=True)
    activity_detail = ActivitySerializer(source='activity', read_only=True)

    class Meta:
        model = Participation
        fields = ['id', 'student', 'activity', 'activity_detail', 'status', 'applied_at']
        read_only_fields = ['applied_at']
