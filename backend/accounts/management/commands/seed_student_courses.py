import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Course, StudentProfile, CourseEnrollment


class Command(BaseCommand):
    help = "Seed student-course enrollments from backend/accounts/seed_data/student_courses.json"

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='JSON file path (defaults to backend/accounts/seed_data/student_courses.json)')
        parser.add_argument('--clear-existing', action='store_true', help='Clear existing enrollments before seeding')

    def handle(self, *args, **options):
        seed_dir = Path(__file__).resolve().parents[2] / 'seed_data'
        default_json = seed_dir / 'student_courses.json'
        json_path = Path(options['file']) if options['file'] else default_json

        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'JSON not found: {json_path}'))
            return

        with json_path.open('r', encoding='utf-8') as f:
            student_course_data = json.load(f)

        if options['clear_existing']:
            self.stdout.write('Clearing existing course enrollments...')
            CourseEnrollment.objects.all().delete()

        total_enrollments = 0
        processed_students = 0

        with transaction.atomic():
            for student_data in student_course_data:
                student_id = student_data.get('student_id')
                course_codes = student_data.get('courses', [])

                if not student_id or not course_codes:
                    self.stderr.write(self.style.WARNING(f'Skipping invalid entry: {student_data}'))
                    continue

                try:
                    student = StudentProfile.objects.get(student_id=student_id)
                except StudentProfile.DoesNotExist:
                    self.stderr.write(self.style.WARNING(f'Student not found: {student_id}'))
                    continue

                enrolled_count = 0
                for course_code in course_codes:
                    try:
                        # Get all courses with this code (may have multiple terms)
                        courses = Course.objects.filter(code=course_code)
                        if not courses.exists():
                            self.stderr.write(self.style.WARNING(f'Course not found: {course_code} for student {student_id}'))
                            continue
                        
                        # For now, enroll in the first course found with this code
                        # In the future, we might want to filter by active term
                        course = courses.first()
                        
                        # Check if course has reached capacity
                        current_enrollments = CourseEnrollment.objects.filter(course=course).count()
                        if course.capacity > 0 and current_enrollments >= course.capacity:
                            self.stderr.write(self.style.WARNING(f'Course {course_code} is at capacity ({current_enrollments}/{course.capacity}) for student {student_id}'))
                            continue
                        
                        enrollment, created = CourseEnrollment.objects.get_or_create(
                            course=course,
                            student=student
                        )
                        if created:
                            enrolled_count += 1
                            total_enrollments += 1
                    except Exception as e:
                        self.stderr.write(self.style.WARNING(f'Error enrolling student {student_id} in course {course_code}: {e}'))
                        continue

                if enrolled_count > 0:
                    processed_students += 1
                    self.stdout.write(f'Enrolled student {student_id} in {enrolled_count} courses')

        self.stdout.write(self.style.SUCCESS(
            f'Seeding student-course enrollments done. '
            f'Processed {processed_students} students, created {total_enrollments} enrollments.'
        ))