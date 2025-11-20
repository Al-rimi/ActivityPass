from django.db import migrations


def normalize_studentprofile_keys(apps, schema_editor):
    from django.utils.text import slugify

    StudentProfile = apps.get_model('accounts', 'StudentProfile')
    for profile in StudentProfile.objects.select_related('user'):
        changed_fields = set()

        # Ensure student_id fallback to username before dropping helper data.
        if not profile.student_id and profile.user_id:
            username = getattr(profile.user, 'username', '')
            if username:
                profile.student_id = username
                changed_fields.add('student_id')

        def normalize(field_name: str, json_field: str):
            raw_value = getattr(profile, field_name) or ''
            if not raw_value:
                payload = getattr(profile, json_field, {}) or {}
                raw_value = payload.get('en') or payload.get('zh') or ''
            slug = slugify(raw_value or '').replace('-', '_')
            if getattr(profile, field_name) != slug:
                setattr(profile, field_name, slug)
                changed_fields.add(field_name)

        normalize('major', 'major_i18n')
        normalize('college', 'college_i18n')
        normalize('class_name', 'class_name_i18n')
        normalize('gender', 'gender_i18n')

        if changed_fields:
            profile.save(update_fields=sorted(changed_fields))


def noop_reverse(apps, schema_editor):
    # Dropped fields cannot be restored once removed.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_populate_studentprofile_i18n'),
    ]

    operations = [
        migrations.RunPython(normalize_studentprofile_keys, noop_reverse),
        migrations.RemoveField(
            model_name='studentprofile',
            name='class_name_i18n',
        ),
        migrations.RemoveField(
            model_name='studentprofile',
            name='college_i18n',
        ),
        migrations.RemoveField(
            model_name='studentprofile',
            name='gender_i18n',
        ),
        migrations.RemoveField(
            model_name='studentprofile',
            name='major_i18n',
        ),
    ]
