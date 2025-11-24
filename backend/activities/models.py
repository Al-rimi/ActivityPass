from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from common.translation import ensure_en_zh


class Activity(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    # Stored translations for user-generated content
    title_i18n = models.JSONField(default=dict, blank=True)
    description_i18n = models.JSONField(default=dict, blank=True)
    college_required = models.JSONField(default=list, blank=True)  # Changed to JSONField to store list or "all"
    countries = models.JSONField(default=list, blank=True)  # New field for countries
    major_required = models.CharField(max_length=120, blank=True)
    chinese_level_min = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True)  # New field for location
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=50)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_activities')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Populate translations for title/description
        try:
            if self.title and not self.title_i18n:
                self.title_i18n = {'en': self.title, 'zh': self.title}
            if self.description and not self.description_i18n:
                self.description_i18n = {'en': self.description, 'zh': self.description}
        except Exception:
            # On any error, fall back to duplicating original text
            if self.title and not self.title_i18n:
                self.title_i18n = {'en': self.title, 'zh': self.title}
            if self.description and not self.description_i18n:
                self.description_i18n = {'en': self.description, 'zh': self.description}
        super().save(*args, **kwargs)


class StudentCourseEvent(models.Model):
    student = models.ForeignKey('accounts.StudentProfile', on_delete=models.CASCADE, related_name='course_events')
    title = models.CharField(max_length=200)
    title_i18n = models.JSONField(default=dict, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    def __str__(self):
        return f"{self.student.user.username} - {self.title}"

    def save(self, *args, **kwargs):
        try:
            if self.title and not self.title_i18n:
                self.title_i18n = {'en': self.title, 'zh': self.title}
        except Exception:
            if self.title and not self.title_i18n:
                self.title_i18n = {'en': self.title, 'zh': self.title}
        super().save(*args, **kwargs)


class Participation(models.Model):
    STATUS_CHOICES = (
        ('applied', 'Applied'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    student = models.ForeignKey('accounts.StudentProfile', on_delete=models.CASCADE, related_name='participations')
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='participations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='applied')
    applied_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('student', 'activity')

    def __str__(self):
        return f"{self.student.user.username} -> {self.activity.title} ({self.status})"
