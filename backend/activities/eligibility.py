from datetime import timedelta
from typing import Dict, List

from django.utils import timezone

from accounts.models import StudentProfile
from .models import Activity, Participation, StudentCourseEvent


def check_time_conflict(student: StudentProfile, activity: Activity) -> bool:
    # Any course event overlapping activity time
    return StudentCourseEvent.objects.filter(
        student=student,
        start_datetime__lt=activity.end_datetime,
        end_datetime__gt=activity.start_datetime,
    ).exists()


def check_major_college(student: StudentProfile, activity: Activity) -> bool:
    if activity.college_required and activity.college_required != student.college:
        return False
    if activity.major_required and activity.major_required != student.major:
        return False
    return True


def check_chinese_level(student: StudentProfile, activity: Activity) -> bool:
    # Very simple gate: ensure student.chinese_level >= required lexicographically if same prefix like HSK
    if not activity.chinese_level_min:
        return True
    if not student.chinese_level:
        return False
    # naive: HSK6 > HSK5 etc.
    try:
        def parse(level: str):
            if level.upper().startswith('HSK'):
                return ('HSK', int(level[3:]))
            return (level.upper(), 0)

        req_prefix, req_num = parse(activity.chinese_level_min)
        stu_prefix, stu_num = parse(student.chinese_level)
        if req_prefix != stu_prefix:
            return False
        return stu_num >= req_num
    except Exception:
        return False


def check_activity_cap(student: StudentProfile, max_per_year: int = 7) -> bool:
    approved = Participation.objects.filter(student=student, status='approved')
    # Filter within last academic year (simplified: last 365 days)
    one_year_ago = timezone.now() - timedelta(days=365)
    count = approved.filter(applied_at__gte=one_year_ago).count()
    return count < max_per_year


def evaluate_eligibility(student: StudentProfile, activity: Activity) -> Dict:
    reasons: List[str] = []
    ok = True

    if check_time_conflict(student, activity):
        ok = False
        reasons.append('Time conflict with existing classes')

    if not check_major_college(student, activity):
        ok = False
        reasons.append('Major or college requirement not met')

    if not check_chinese_level(student, activity):
        ok = False
        reasons.append('Chinese level requirement not met')

    if not check_activity_cap(student):
        ok = False
        reasons.append('Yearly activity cap reached (7)')

    return {
        'eligible': ok,
        'reasons': reasons,
    }
