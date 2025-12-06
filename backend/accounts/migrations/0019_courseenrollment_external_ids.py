from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0018_securitypreference_force_faculty_change_default'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseenrollment',
            name='external_course_code',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='courseenrollment',
            name='external_student_id',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AlterUniqueTogether(
            name='courseenrollment',
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name='courseenrollment',
            constraint=models.UniqueConstraint(fields=('course', 'student'), name='unique_course_student'),
        ),
        migrations.AddConstraint(
            model_name='courseenrollment',
            constraint=models.UniqueConstraint(
                fields=('external_course_code', 'external_student_id'),
                name='unique_external_course_student',
                condition=Q(external_course_code__isnull=False, external_student_id__isnull=False),
            ),
        ),
    ]
