from django.conf import settings
from django.db import models


class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    major = models.CharField(max_length=120, blank=True)
    college = models.CharField(max_length=120, blank=True)
    chinese_level = models.CharField(max_length=20, blank=True, help_text="e.g. HSK5, HSK6, CET4")
    year = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"StudentProfile({self.user.username})"

    @property
    def activities_participated(self):
        from activities.models import Participation
        return Participation.objects.filter(student=self, status='approved').count()

    @property
    def remaining_activity_slots(self):
        # limit: 7 total per academic year
        return max(0, 7 - self.activities_participated)
