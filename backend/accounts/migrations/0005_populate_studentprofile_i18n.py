from django.db import migrations


def _blank_payload(value: str):
    value = value or ''
    return {'zh': value, 'en': value}


def populate_profile_data(apps, schema_editor):
    StudentProfile = apps.get_model('accounts', 'StudentProfile')
    for profile in StudentProfile.objects.select_related('user'):
        changed = False
        username = getattr(profile.user, 'username', '') if profile.user_id else ''
        if not profile.student_id and username:
            profile.student_id = username
            changed = True

        mapping = (
            ('major_i18n', profile.major),
            ('college_i18n', profile.college),
            ('class_name_i18n', profile.class_name),
            ('gender_i18n', profile.gender),
        )
        for field, raw_value in mapping:
            payload = getattr(profile, field, None) or {}
            if not (payload.get('zh') or payload.get('en')) and raw_value:
                setattr(profile, field, _blank_payload(raw_value))
                changed = True
        if changed:
            profile.save(update_fields=['student_id', 'major_i18n', 'college_i18n', 'class_name_i18n', 'gender_i18n'])


def reverse_populate(apps, schema_editor):
    # No-op; preserving enriched data is harmless on rollback.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_studentprofile_class_name_i18n_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_profile_data, reverse_populate),
    ]
