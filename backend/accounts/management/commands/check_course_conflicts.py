import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

from django.core.management.base import BaseCommand

from accounts.models import CourseEnrollment


class Command(BaseCommand):
    help = "Inspect student-course enrollments for duplicate course codes and schedule conflicts."

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='conflict_report.json',
            help='Optional path where the JSON report should be saved (default: conflict_report.json in the project root).',
        )

    def handle(self, *args, **options):
        report = self.build_conflict_report()
        issues = sum(len(student_info['issues']) for student_info in report['students'].values())
        duplicates = report['aggregates']['duplicate_pairs']
        conflicts = report['aggregates']['conflict_pairs']

        self.stdout.write(self.style.SUCCESS(
            f"Checked {report['aggregates']['student_count']} students, "
            f"found {duplicates} duplicate course assignments and {conflicts} schedule conflicts."
        ))

        if issues:
            self.stdout.write(self.style.WARNING('Detailed issues were found. See JSON report for specifics.'))

        output_path = self.resolve_output_path(options['output'])
        with output_path.open('w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        self.stdout.write(self.style.SUCCESS(f'Report saved to {output_path}'))

    def resolve_output_path(self, output: str) -> Path:
        path = Path(output)
        if path.is_absolute():
            return path
        return Path.cwd() / path

    def build_conflict_report(self) -> Dict:
        students: Dict[str, Dict] = {}
        duplicate_pairs = 0
        conflict_pairs = 0

        enrollments = (
            CourseEnrollment.objects
            .select_related('student__user', 'course')
            .order_by('student__student_id', 'course__code')
        )

        for enrollment in enrollments:
            student = enrollment.student
            course = enrollment.course
            student_key = student.student_id or str(student.pk)

            student_bucket = students.setdefault(student_key, {
                'student_id': student.student_id,
                'student_pk': student.pk,
                'issues': [],
                'courses': [],
            })

            student_bucket['courses'].append(self.serialize_course(course))

        for student_data in students.values():
            issues = self.scan_student_courses(student_data['courses'])
            student_data['issues'] = issues
            for issue in issues:
                if issue['type'] == 'duplicate_course_code':
                    duplicate_pairs += 1
                if issue['type'] == 'schedule_conflict':
                    conflict_pairs += 1

        return {
            'students': students,
            'aggregates': {
                'student_count': len(students),
                'duplicate_pairs': duplicate_pairs,
                'conflict_pairs': conflict_pairs,
            }
        }

    def scan_student_courses(self, courses: List[Dict]) -> List[Dict]:
        issues: List[Dict] = []
        seen_codes: Dict[str, List[Dict]] = defaultdict(list)
        scheduled_courses: List[Dict] = []

        for course in courses:
            code = course.get('code')
            if code:
                seen_codes[code].append(course)
            if course['weekday'] not in (-1, None) and course['periods'] and course['weeks']:
                scheduled_courses.append(course)

        for code, items in seen_codes.items():
            if len(items) > 1:
                issues.append({
                    'type': 'duplicate_course_code',
                    'code': code,
                    'course_ids': [item['id'] for item in items],
                    'titles': list({item['title'] for item in items}),
                })

        conflicts = self.detect_schedule_conflicts(scheduled_courses)
        issues.extend(conflicts)
        return issues

    def detect_schedule_conflicts(self, courses: List[Dict]) -> List[Dict]:
        conflicts: List[Dict] = []
        for idx, left in enumerate(courses):
            for right in courses[idx + 1:]:
                if left['weekday'] != right['weekday']:
                    continue
                if not set(left['weeks']).intersection(right['weeks']):
                    continue
                if not set(left['periods']).intersection(right['periods']):
                    continue
                conflicts.append({
                    'type': 'schedule_conflict',
                    'course_ids': [left['id'], right['id']],
                    'codes': [left.get('code'), right.get('code')],
                    'titles': [left.get('title'), right.get('title')],
                    'weekday': left['weekday'],
                    'overlap_periods': sorted(set(left['periods']).intersection(right['periods'])),
                    'overlap_weeks': sorted(set(left['weeks']).intersection(right['weeks'])),
                })
        return conflicts

    def serialize_course(self, course) -> Dict:
        return {
            'id': course.id,
            'code': course.code,
            'title': course.title,
            'weekday': course.weekday,
            'periods': list(course.periods or []),
            'weeks': list(course.weeks or []),
        }
