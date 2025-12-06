from django.conf import settings
from django.db import models
from django.db.models import Q


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


class FacultyProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='faculty_profile')
    faculty_id = models.CharField(max_length=32, unique=True, null=True, blank=True)
    name = models.CharField(max_length=120, blank=True)
    gender = models.CharField(max_length=16, blank=True)
    department = models.CharField(max_length=120, blank=True)
    position = models.CharField(max_length=120, blank=True)
    title_level = models.CharField(max_length=120, blank=True)
    title = models.CharField(max_length=120, blank=True)
    staff_type = models.CharField(max_length=120, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    is_external = models.BooleanField(default=False)
    is_main_lecturer = models.BooleanField(default=False)

    def __str__(self):
        return f"FacultyProfile({self.faculty_id or self.user.username})"


class AccountMeta(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='account_meta')
    must_change_password = models.BooleanField(default=False)
    staff_number = models.CharField(max_length=64, blank=True)

    def __str__(self):
        return f"AccountMeta({self.user.username}, must_change_password={self.must_change_password})"


class SecurityPreference(models.Model):
    force_students_change_default = models.BooleanField(default=False)
    force_staff_change_default = models.BooleanField(default=False)
    force_faculty_change_default = models.BooleanField(default=False)
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
    teacher_id = models.CharField(max_length=32, blank=True)  # For seeding, before linking to FacultyProfile
    location = models.CharField(max_length=255, blank=True)
    term = models.CharField(max_length=64, blank=True)
    term_start_date = models.DateField(help_text="The Monday date of week 1 for the course term")
    weekday = models.SmallIntegerField(default=-1, help_text="-1 = unscheduled, 1 = Monday, 7 = Sunday")
    periods = models.JSONField(default=list, blank=True, help_text="List of period numbers (1-13) when this course meets")
    weeks = models.JSONField(default=list, blank=True, help_text="List of week numbers when this course meets")
    credits = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    department_name = models.CharField(max_length=120, blank=True)
    category = models.CharField(max_length=120, blank=True)
    nature = models.CharField(max_length=64, blank=True)
    teaching_mode = models.CharField(max_length=64, blank=True)
    exam_type = models.CharField(max_length=64, blank=True)
    grading_method = models.CharField(max_length=64, blank=True)
    hours_per_week = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    total_course_hours = models.IntegerField(default=0)
    enrolled_students = models.IntegerField(default=0)
    class_students = models.IntegerField(default=0)
    capacity = models.IntegerField(default=0, help_text="Maximum number of students that can enroll in this course")
    campus_name = models.CharField(max_length=120, blank=True)
    majors = models.CharField(max_length=255, blank=True)
    grades = models.CharField(max_length=64, blank=True)
    audience = models.CharField(max_length=255, blank=True)
    course_type_detail = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['term', 'code', 'title']

    def __str__(self):
        return f"Course({self.code or self.title})"


class CourseEnrollment(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='course_enrollments')
    external_course_code = models.CharField(max_length=64, null=True, blank=True)
    external_student_id = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['course', 'student'], name='unique_course_student'),
            models.UniqueConstraint(
                fields=['external_course_code', 'external_student_id'],
                name='unique_external_course_student',
                condition=Q(external_course_code__isnull=False, external_student_id__isnull=False)
            ),
        ]

    def __str__(self):
        return (
            f"CourseEnrollment(course={self.external_course_code or self.course_id}, "
            f"student={self.external_student_id or self.student_id})"
        )


class AcademicTerm(models.Model):
    """Academic term configuration with the official week 1 Monday date."""
    term = models.CharField(max_length=64, unique=True, help_text="Term identifier (e.g., '2025-2026-1', '2024-2025-2')")
    academic_year = models.CharField(max_length=64, help_text="Academic year (e.g., '2024-2025')")
    semester = models.PositiveIntegerField(help_text="Semester number (1 or 2)")
    first_week_monday = models.DateField(help_text="The official Monday date of week 1 for this term")
    is_active = models.BooleanField(default=True, help_text="Whether this term configuration is active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year', '-semester']
        verbose_name = "Academic Term"
        verbose_name_plural = "Academic Terms"

    def __str__(self):
        return f"AcademicTerm({self.term}: {self.first_week_monday})"

    def save(self, *args, **kwargs):
        """Auto-populate academic_year and semester from term if not set."""
        if not self.academic_year or not self.semester:
            # Parse term like "2025-2026-1" -> academic_year="2025-2026", semester=1
            parts = self.term.split('-')
            if len(parts) >= 3:
                self.academic_year = f"{parts[0]}-{parts[1]}"
                try:
                    self.semester = int(parts[2])
                except (ValueError, IndexError):
                    pass
        super().save(*args, **kwargs)
