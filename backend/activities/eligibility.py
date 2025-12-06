from datetime import timedelta
from typing import Dict, List

from django.utils import timezone

from accounts.models import StudentProfile
from .models import Activity, Participation
from .course_events import student_has_time_conflict


def check_time_conflict(student: StudentProfile, activity: Activity) -> bool:
    # Any course event overlapping activity time
    return student_has_time_conflict(student, activity.start_datetime, activity.end_datetime)


def check_major_college(student: StudentProfile, activity: Activity) -> bool:
    # Handle college_required: can be list, "all", or empty
    if activity.college_required:
        if isinstance(activity.college_required, str):
            if activity.college_required == "all":
                pass  # Allow all colleges
            elif activity.college_required != student.college:
                return False
        elif isinstance(activity.college_required, list):
            if student.college not in activity.college_required:
                return False
    
    # Handle countries: can be list, "all", or empty
    # Note: StudentProfile doesn't have country field yet, so skip for now
    # if activity.countries:
    #     if isinstance(activity.countries, str):
    #         if activity.countries == "all":
    #             pass  # Allow all countries
    #         elif activity.countries != student.country:
    #             return False
    #     elif isinstance(activity.countries, list):
    #         if student.country not in activity.countries:
    #             return False
    
    if activity.major_required and activity.major_required != student.major:
        return False
    return True


def check_chinese_level(student: StudentProfile, activity: Activity) -> bool:
    # Very simple gate: ensure student.chinese_level >= required lexicographically if same prefix like HSK
    if not activity.chinese_level_min:
        return True
    if not student.chinese_level:
        return False
    # Parse activity requirement
    req_level = activity.chinese_level_min.strip().upper()
    if req_level.startswith('HSK'):
        try:
            req_num = int(req_level[3:])
        except (ValueError, IndexError):
            return False
    elif req_level == 'CET6':
        req_num = 6
    elif req_level == 'CET4':
        req_num = 4
    elif req_level == '全英文班':
        req_num = 6
    else:
        return False  # Unknown format
    # student.chinese_level is now an integer
    return student.chinese_level >= req_num


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
