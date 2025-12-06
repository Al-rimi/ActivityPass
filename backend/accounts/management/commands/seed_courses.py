import json
import os
import random
from pathlib import Path
from datetime import datetime
from typing import Iterable

from django.core.management.base import BaseCommand

from accounts.models import Course, StudentProfile, CourseEnrollment, AcademicTerm


class Command(BaseCommand):
    help = "Seed courses from backend/accounts/seed_data/courses.json, create academic terms from course data, and enroll students."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='JSON file path (defaults to backend/accounts/seed_data/courses.json)')
        parser.add_argument('--random-min', type=int, default=5, help='Min random courses for students without specific courses')
        parser.add_argument('--random-max', type=int, default=10, help='Max random courses for students without specific courses')
        parser.add_argument('--skip-existing', action='store_true', default=True, help='Skip students who already have course enrollments (default: True)')
        parser.add_argument('--clear-enrollments', action='store_true', help='Delete all existing course enrollments before seeding')

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
        clear_enrollments = options['clear_enrollments']

        if clear_enrollments:
            deleted = CourseEnrollment.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Cleared existing course enrollments (deleted {deleted[0]} records)'))

        with json_path.open('r', encoding='utf-8') as f:
            courses_data = json.load(f)

        manual_assignments_path = seed_dir / 'student_courses.json'
        manual_course_codes: dict[str, list[str]] = {}
        if manual_assignments_path.exists():
            try:
                with manual_assignments_path.open('r', encoding='utf-8') as f:
                    manual_data = json.load(f)
                for entry in manual_data:
                    student_id = entry.get('student_id')
                    codes = entry.get('courses', [])
                    if student_id and codes:
                        filtered_codes = [code.strip() for code in codes if isinstance(code, str) and code.strip()]
                        if filtered_codes:
                            manual_course_codes[student_id] = filtered_codes
            except json.JSONDecodeError as exc:
                self.stderr.write(self.style.WARNING(f'Failed to parse manual assignment file {manual_assignments_path}: {exc}'))

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
        courses_by_code: dict[str, list[Course]] = {}
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
            if course.code:
                courses_by_code.setdefault(course.code, []).append(course)
            if created:
                self.stdout.write(f'Created course: {course}')

        def has_schedule_conflict(existing_courses: Iterable[Course], candidate: Course) -> bool:
            """Return True when the candidate course overlaps with an existing course."""

            # Flexible or unscheduled courses cannot conflict because they have no fixed slot.
            if candidate.weekday in (-1, None):
                return False

            candidate_weeks = set(candidate.weeks or [])
            candidate_periods = set(candidate.periods or [])
            if not candidate_weeks or not candidate_periods:
                return False

            for existing in existing_courses:
                if existing.weekday in (-1, None):
                    continue

                if existing.weekday != candidate.weekday:
                    continue

                existing_weeks = set(existing.weeks or [])
                existing_periods = set(existing.periods or [])

                if not existing_weeks or not existing_periods:
                    continue

                # Conflict only if weeks overlap *and* periods overlap.
                if candidate_weeks.intersection(existing_weeks) and candidate_periods.intersection(existing_periods):
                    return True

            return False

        def enroll_student_in_course(student: StudentProfile, course: Course) -> None:
            CourseEnrollment.objects.update_or_create(
                course=course,
                student=student,
                defaults={
                    'external_course_code': course.code or None,
                    'external_student_id': student.student_id or None,
                }
            )

        # Enroll students
        students = StudentProfile.objects.all()
        enrolled_students = set()
        random_assignments = 0
        manual_assignments = 0

        for student in students:
            sid = student.student_id
            existing_enrollments = list(student.course_enrollments.select_related('course'))
            existing_courses = [enrollment.course for enrollment in existing_enrollments]
            existing_course_ids = {course.id for course in existing_courses}
            existing_course_codes = {course.code for course in existing_courses if course.code}

            assigned_specific = False

            if sid in courses_by_student:
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
                    if not course:
                        continue
                    if course.id in existing_course_ids:
                        continue
                    if course.code and course.code in existing_course_codes:
                        continue
                    if has_schedule_conflict(existing_courses, course):
                        continue

                    enroll_student_in_course(student, course)
                    existing_courses.append(course)
                    existing_course_ids.add(course.id)
                    if course.code:
                        existing_course_codes.add(course.code)
                    assigned_specific = True

            manual_codes = manual_course_codes.get(sid, [])
            for code in manual_codes:
                candidates = courses_by_code.get(code, [])
                if not candidates:
                    self.stderr.write(self.style.WARNING(f'Manual assignment: course code {code} not found for student {sid}'))
                    continue

                assigned = False
                for course in candidates:
                    if course.id in existing_course_ids:
                        assigned = True
                        break
                    if has_schedule_conflict(existing_courses, course):
                        continue
                    enroll_student_in_course(student, course)
                    existing_courses.append(course)
                    existing_course_ids.add(course.id)
                    if course.code:
                        existing_course_codes.add(course.code)
                    manual_assignments += 1
                    assigned_specific = True
                    assigned = True
                    break

                if not assigned:
                    self.stderr.write(self.style.WARNING(
                        f'Manual assignment: unable to assign course {code} to student {sid} due to conflicts or pre-existing enrollment'
                    ))

            if assigned_specific:
                enrolled_students.add(sid)
                continue

            if skip_existing and existing_enrollments:
                self.stdout.write(f'Skipping {student} - already has {len(existing_enrollments)} course enrollments')
                continue

            num_courses = random.randint(random_min, random_max)
            available_courses = list(course_objects.values())

            if not available_courses:
                continue

            random.shuffle(available_courses)
            selected_courses: list[Course] = []
            selected_codes: set[str] = set()

            for course in available_courses:
                if len(selected_courses) >= num_courses:
                    break
                if course.code:
                    if course.code in existing_course_codes or course.code in selected_codes:
                        continue
                if has_schedule_conflict(existing_courses, course) or has_schedule_conflict(selected_courses, course):
                    continue
                selected_courses.append(course)
                existing_courses.append(course)
                if course.code:
                    selected_codes.add(course.code)
                    existing_course_codes.add(course.code)

            if selected_courses:
                for course in selected_courses:
                    enroll_student_in_course(student, course)
                random_assignments += 1
                self.stdout.write(
                    f'Assigned {len(selected_courses)} random non-conflicting courses to {student}'
                )

        self.stdout.write(self.style.SUCCESS(
            'Seeding courses done. Created {course_count} courses, enrolled {specific_count} students with specific courses/manual codes '
            '({manual_count} manual assignments applied), assigned random courses to {random_count} students.'
            .format(
                course_count=len(course_objects),
                specific_count=len(enrolled_students),
                manual_count=manual_assignments,
                random_count=random_assignments,
            )
        ))