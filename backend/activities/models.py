from django.conf import settings
from django.db import models
from django.utils import timezone


class Activity(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    college_required = models.CharField(max_length=120, blank=True)
    major_required = models.CharField(max_length=120, blank=True)
    chinese_level_min = models.CharField(max_length=20, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=50)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_activities')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


class StudentCourseEvent(models.Model):
    student = models.ForeignKey('accounts.StudentProfile', on_delete=models.CASCADE, related_name='course_events')
    title = models.CharField(max_length=200)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    def __str__(self):
        return f"{self.student.user.username} - {self.title}"


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
