from django.conf import settings
from django.db import models


def default_i18n():
    """Legacy helper kept for older migrations that import it."""
    return {'zh': '', 'en': ''}


class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=32, unique=True, null=True, blank=True)
    major = models.CharField(max_length=120, blank=True)
    college = models.CharField(max_length=120, blank=True)
    chinese_level = models.CharField(max_length=20, blank=True, help_text="e.g. HSK5, HSK6, CET4")
    year = models.PositiveIntegerField(default=1)
    class_name = models.CharField(max_length=120, blank=True)
    gender = models.CharField(max_length=16, blank=True)
    phone = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return f"StudentProfile({self.student_id or self.user.username})"

    @property
    def activities_participated(self):
        from activities.models import Participation
        return Participation.objects.filter(student=self, status='approved').count()

    @property
    def remaining_activity_slots(self):
        # limit: 7 total per academic year
        return max(0, 7 - self.activities_participated)


class AccountMeta(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='account_meta')
    must_change_password = models.BooleanField(default=False)
    staff_number = models.CharField(max_length=64, blank=True)

    def __str__(self):
        return f"AccountMeta({self.user.username}, must_change_password={self.must_change_password})"
