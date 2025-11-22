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
    chinese_level = models.IntegerField(default=0, help_text="Chinese proficiency level 0-6")
    year = models.PositiveIntegerField(default=1)
    class_name = models.CharField(max_length=120, blank=True)
    gender = models.CharField(max_length=16, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    country = models.CharField(max_length=120, blank=True)

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


class SecurityPreference(models.Model):
    force_students_change_default = models.BooleanField(default=False)
    force_staff_change_default = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "SecurityPreference()"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Course(models.Model):
    code = models.CharField(max_length=64, blank=True)
    title = models.CharField(max_length=255)
    course_type = models.CharField(max_length=64, blank=True)
    teacher = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    term = models.CharField(max_length=64, blank=True)
    first_week_monday = models.DateField(help_text="The Monday date of week 1 for the course term")
    day_of_week = models.PositiveSmallIntegerField(help_text="1 = Monday, 7 = Sunday")
    periods = models.JSONField(default=list, blank=True, help_text="List of period numbers (1-13) when this course meets")
    week_pattern = models.JSONField(default=list, blank=True, help_text="List of week numbers when this course meets")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['term', 'code', 'title']

    def __str__(self):
        return f"Course({self.code or self.title})"


class CourseEnrollment(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='course_enrollments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'student')

    def __str__(self):
        return f"CourseEnrollment(course={self.course_id}, student={self.student_id})"
