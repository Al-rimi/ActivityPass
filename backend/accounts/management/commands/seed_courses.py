import json
import os
import random
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Course, StudentProfile, CourseEnrollment


class Command(BaseCommand):
    help = "Seed courses from backend/accounts/seed_data/courses.json and enroll students."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='JSON file path (defaults to backend/accounts/seed_data/courses.json)')
        parser.add_argument('--random-min', type=int, default=5, help='Min random courses for students without specific courses')
        parser.add_argument('--random-max', type=int, default=10, help='Max random courses for students without specific courses')

    def handle(self, *args, **options):
        seed_dir = Path(__file__).resolve().parents[2] / 'seed_data'
        default_json = seed_dir / 'courses.json'
        json_path = Path(options['file']) if options['file'] else default_json
        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'JSON not found: {json_path}'))
            return
        random_min = options['random_min']
        random_max = options['random_max']

        with json_path.open('r', encoding='utf-8') as f:
            courses_data = json.load(f)

        # Group courses by student_id
        courses_by_student = {}
        all_courses = []
        for course_data in courses_data:
            student_id = course_data.get('student_id')
            if student_id:
                if student_id not in courses_by_student:
                    courses_by_student[student_id] = []
                courses_by_student[student_id].append(course_data)
            # Also collect all unique courses
            course_key = (
                course_data.get('title', ''),
                course_data.get('teacher', ''),
                course_data.get('location', ''),
                course_data.get('term', ''),
                tuple(sorted(course_data.get('week_pattern', []))),
                course_data.get('day_of_week', 1),
                tuple(sorted(course_data.get('periods', []))),
                course_data.get('course_type', ''),
                course_data.get('first_week_monday', ''),
            )
            if course_key not in [c[0] for c in all_courses]:
                all_courses.append((course_key, course_data))

        # Create courses
        course_objects = {}
        for course_key, course_data in all_courses:
            if course_data.get('day_of_week') is None:
                continue  # Skip courses without day_of_week
            periods = course_data.get('periods', [])
            course, created = Course.objects.get_or_create(
                title=course_data.get('title', ''),
                teacher=course_data.get('teacher', ''),
                location=course_data.get('location', ''),
                term=course_data.get('term', ''),
                first_week_monday=course_data.get('first_week_monday', ''),
                day_of_week=course_data.get('day_of_week', 1),
                defaults={
                    'course_type': course_data.get('course_type', ''),
                    'week_pattern': course_data.get('week_pattern', []),
                    'periods': periods,
                }
            )
            course_objects[course_key] = course
            if created:
                self.stdout.write(f'Created course: {course}')

        # Enroll students
        students = StudentProfile.objects.all()
        enrolled_students = set()
        for student in students:
            sid = student.student_id
            if sid in courses_by_student:
                # Enroll in their specific courses
                for course_data in courses_by_student[sid]:
                    course_key = (
                        course_data.get('title', ''),
                        course_data.get('teacher', ''),
                        course_data.get('location', ''),
                        course_data.get('term', ''),
                        tuple(sorted(course_data.get('week_pattern', []))),
                        course_data.get('day_of_week', 1),
                        tuple(sorted(course_data.get('periods', []))),
                        course_data.get('course_type', ''),
                        course_data.get('first_week_monday', ''),
                    )
                    course = course_objects.get(course_key)
                    if course:
                        CourseEnrollment.objects.get_or_create(course=course, student=student)
                enrolled_students.add(sid)
            else:
                # Assign random courses
                num_courses = random.randint(random_min, random_max)
                available_courses = list(course_objects.values())
                if available_courses:
                    selected_courses = random.sample(available_courses, min(num_courses, len(available_courses)))
                    for course in selected_courses:
                        CourseEnrollment.objects.get_or_create(course=course, student=student)

        self.stdout.write(self.style.SUCCESS(f'Seeding courses done. Created {len(course_objects)} courses, enrolled students.'))