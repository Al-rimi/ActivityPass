import json
import os
import random
from pathlib import Path
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Course, StudentProfile, CourseEnrollment, AcademicTerm


class Command(BaseCommand):
    help = "Seed courses from backend/accounts/seed_data/courses.json, create academic terms from course data, and enroll students."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='JSON file path (defaults to backend/accounts/seed_data/courses.json)')
        parser.add_argument('--random-min', type=int, default=5, help='Min random courses for students without specific courses')
        parser.add_argument('--random-max', type=int, default=10, help='Max random courses for students without specific courses')
        parser.add_argument('--skip-existing', action='store_true', default=True, help='Skip students who already have course enrollments (default: True)')

    def handle(self, *args, **options):
        seed_dir = Path(__file__).resolve().parents[2] / 'seed_data'
        default_json = seed_dir / 'courses.json'
        json_path = Path(options['file']) if options['file'] else default_json
        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'JSON not found: {json_path}'))
            return
        random_min = options['random_min']
        random_max = options['random_max']
        skip_existing = options['skip_existing']

        with json_path.open('r', encoding='utf-8') as f:
            courses_data = json.load(f)

        # Extract and create academic terms from course data
        academic_terms_data = {}
        
        for course_data in courses_data:
            term = course_data.get('term', '').strip()
            term_start_date_str = course_data.get('term_start_date', '').strip()
            
            if term and term_start_date_str:
                # Parse term format: "2024-2025-1" -> academic_year="2024-2025", semester=1
                if '-' in term:
                    parts = term.split('-')
                    if len(parts) >= 3:
                        try:
                            academic_year = f"{parts[0]}-{parts[1]}"
                            semester = int(parts[2])
                            
                            # Convert term_start_date string to date
                            term_start_date = datetime.strptime(term_start_date_str, '%Y-%m-%d').date()
                            
                            # Use term as key to avoid duplicates
                            academic_terms_data[term] = {
                                'term': term,
                                'academic_year': academic_year,
                                'semester': semester,
                                'first_week_monday': term_start_date,
                                'is_active': True,
                            }
                            
                        except (ValueError, IndexError):
                            self.stderr.write(self.style.WARNING(f'Invalid term format: {term} or date: {term_start_date_str}'))

        # Create academic terms
        created_terms_count = 0
        for term_data in academic_terms_data.values():
            term_obj, created = AcademicTerm.objects.get_or_create(
                term=term_data['term'],
                defaults=term_data
            )
            
            if created:
                self.stdout.write(f'Created academic term: {term_obj}')
                created_terms_count += 1
            else:
                # Update if first_week_monday has changed
                if term_obj.first_week_monday != term_data['first_week_monday']:
                    term_obj.first_week_monday = term_data['first_week_monday']
                    term_obj.save()
                    self.stdout.write(f'Updated academic term: {term_obj}')

        if created_terms_count > 0:
            self.stdout.write(self.style.SUCCESS(f'Created {created_terms_count} academic terms from course data'))

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
                course_data.get('code', ''),
                course_data.get('title', ''),
                course_data.get('teacher_id', ''),
                course_data.get('location', ''),
                course_data.get('term', ''),
                tuple(sorted(course_data.get('weeks', []))),
                course_data.get('weekday', -1),
                tuple(sorted(course_data.get('periods', []))),
                course_data.get('term_start_date', ''),
            )
            if course_key not in [c[0] for c in all_courses]:
                all_courses.append((course_key, course_data))

        # Create courses
        course_objects = {}
        for course_key, course_data in all_courses:
            periods = course_data.get('periods', [])
            course, created = Course.objects.get_or_create(
                code=course_data.get('code', ''),
                title=course_data.get('title', ''),
                teacher_id=course_data.get('teacher_id', ''),
                location=course_data.get('location', ''),
                term=course_data.get('term', ''),
                term_start_date=course_data.get('term_start_date', ''),
                weekday=course_data.get('weekday', -1),
                defaults={
                    'weeks': course_data.get('weeks', []),
                    'periods': periods,
                    'credits': course_data.get('credits', ''),
                    'department_name': course_data.get('department_name', ''),
                    'category': course_data.get('category', ''),
                    'nature': course_data.get('nature', ''),
                    'teaching_mode': course_data.get('teaching_mode', ''),
                    'exam_type': course_data.get('exam_type', ''),
                    'grading_method': course_data.get('grading_method', ''),
                    'hours_per_week': course_data.get('hours_per_week', ''),
                    'total_course_hours': course_data.get('total_course_hours', ''),
                    'enrolled_students': course_data.get('enrolled_students', ''),
                    'class_students': course_data.get('class_students', ''),
                    'capacity': course_data.get('capacity', 0),
                    'campus_name': course_data.get('campus_name', ''),
                    'majors': course_data.get('majors', ''),
                    'grades': course_data.get('grades', ''),
                    'audience': course_data.get('audience', ''),
                    'course_type_detail': course_data.get('course_type_detail', ''),
                }
            )
            course_objects[course_key] = course
            if created:
                self.stdout.write(f'Created course: {course}')

        # Enroll students
        students = StudentProfile.objects.all()
        enrolled_students = set()
        random_assignments = 0
        
        for student in students:
            sid = student.student_id
            if sid in courses_by_student:
                # Enroll in their specific courses
                for course_data in courses_by_student[sid]:
                    course_key = (
                        course_data.get('code', ''),
                        course_data.get('title', ''),
                        course_data.get('teacher_id', ''),
                        course_data.get('location', ''),
                        course_data.get('term', ''),
                        tuple(sorted(course_data.get('weeks', []))),
                        course_data.get('weekday', -1),
                        tuple(sorted(course_data.get('periods', []))),
                        course_data.get('term_start_date', ''),
                    )
                    course = course_objects.get(course_key)
                    if course:
                        CourseEnrollment.objects.get_or_create(course=course, student=student)
                enrolled_students.add(sid)
            else:
                # Check if student already has enrollments
                if skip_existing and student.course_enrollments.exists():
                    self.stdout.write(f'Skipping {student} - already has {student.course_enrollments.count()} course enrollments')
                    continue
                
                # Assign random courses (5-10)
                num_courses = random.randint(random_min, random_max)
                available_courses = list(course_objects.values())
                if available_courses:
                    selected_courses = random.sample(available_courses, min(num_courses, len(available_courses)))
                    for course in selected_courses:
                        CourseEnrollment.objects.get_or_create(course=course, student=student)
                    random_assignments += 1
                    self.stdout.write(f'Assigned {len(selected_courses)} random courses to {student}')

        self.stdout.write(self.style.SUCCESS(f'Seeding courses done. Created {len(course_objects)} courses, enrolled {len(enrolled_students)} students with specific courses, assigned random courses to {random_assignments} students.'))