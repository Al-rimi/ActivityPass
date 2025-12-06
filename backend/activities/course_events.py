from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Dict, Iterable, List, Sequence, Tuple

from zoneinfo import ZoneInfo

from django.utils import timezone

from accounts.models import CourseEnrollment, StudentProfile
from common.translation import ensure_en_zh

# Standard course period timetable in 24h clock.
PERIOD_TIME_RANGES: Dict[int, Tuple[time, time]] = {
    1: (time(8, 0), time(8, 40)),
    2: (time(8, 45), time(9, 25)),
    3: (time(9, 40), time(10, 20)),
    4: (time(10, 35), time(11, 15)),
    5: (time(11, 20), time(12, 0)),
    6: (time(14, 0), time(14, 40)),
    7: (time(14, 45), time(15, 25)),
    8: (time(15, 40), time(16, 20)),
    9: (time(16, 30), time(17, 10)),
    10: (time(18, 0), time(18, 40)),
    11: (time(18, 45), time(19, 25)),
    12: (time(19, 40), time(20, 20)),
    13: (time(20, 30), time(21, 10)),
}


CAMPUS_TIME_ZONE = ZoneInfo("Asia/Shanghai")


def _as_int_list(value: Sequence[int] | Sequence[str] | str | None) -> List[int]:
    if value is None:
        return []
    if isinstance(value, str):
        cleaned = value.replace("[", "").replace("]", "")
        parts = [p.strip() for p in cleaned.split(",") if p.strip()]
        ints: List[int] = []
        for part in parts:
            try:
                ints.append(int(part))
            except ValueError:
                continue
        return ints
    ints = []
    for item in value:
        try:
            ints.append(int(item))
        except (TypeError, ValueError):
            continue
    return ints


def _normalise_term_start(raw: object) -> date | None:
    if not raw:
        return None
    if isinstance(raw, date) and not isinstance(raw, datetime):
        return raw
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, str):
        for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
            try:
                return datetime.strptime(raw, fmt).date()
            except ValueError:
                continue
    return None


def _course_occurrences(course) -> Iterable[Tuple[str, datetime, datetime]]:
    term_start = _normalise_term_start(getattr(course, "term_start_date", None))
    weekday = getattr(course, "weekday", None)
    if not term_start or not weekday or weekday < 1:
        return []

    weeks = sorted(set(_as_int_list(getattr(course, "weeks", []))))
    periods = sorted(set(_as_int_list(getattr(course, "periods", []))))
    if not weeks or not periods:
        return []

    start_range = PERIOD_TIME_RANGES.get(periods[0])
    end_range = PERIOD_TIME_RANGES.get(periods[-1])
    if not start_range or not end_range:
        return []

    tz = CAMPUS_TIME_ZONE
    title = getattr(course, "title", None) or getattr(course, "code", None) or "Course"

    for week_number in weeks:
        if week_number < 1:
            continue
        start_date = term_start + timedelta(weeks=week_number - 1, days=weekday - 1)
        # Ensure stored datetimes are aligned with the campus timetable timezone
        start_dt = datetime.combine(start_date, start_range[0])
        end_dt = datetime.combine(start_date, end_range[1])
        yield title, timezone.make_aware(start_dt, tz), timezone.make_aware(end_dt, tz)


_TITLE_CACHE: Dict[str, Dict[str, str]] = {}


def _course_title_i18n(raw_title: str) -> Dict[str, str]:
    title = (raw_title or "").strip()
    if not title:
        return {'en': '', 'zh': ''}
    cached = _TITLE_CACHE.get(title)
    if cached:
        return cached
    translations = ensure_en_zh(title) or {}
    en = translations.get('en') or title
    zh = translations.get('zh') or title
    result = {'en': en, 'zh': zh}
    _TITLE_CACHE[title] = result
    return result


def build_student_course_event_payloads(student: StudentProfile) -> List[Dict[str, object]]:
    """Return lightweight course events for the given student without persisting to the DB."""

    enrollments = CourseEnrollment.objects.select_related("course").filter(student=student)
    payloads: List[Dict[str, object]] = []
    idx = 1

    for enrollment in enrollments:
        course = enrollment.course
        if not course:
            continue
        for title, start_dt, end_dt in _course_occurrences(course):
            title_i18n = _course_title_i18n(title)
            payloads.append(
                {
                    "id": idx,
                    "student": student.id,
                    "title": title_i18n.get('en', title),
                    "title_i18n": dict(title_i18n),
                    "start_datetime": start_dt.isoformat(),
                    "end_datetime": end_dt.isoformat(),
                }
            )
            idx += 1

    return payloads


def build_student_course_payloads(student: StudentProfile) -> List[Dict[str, object]]:
    """Return raw course scheduling metadata so clients can perform their own expansion."""

    enrollments = CourseEnrollment.objects.select_related("course").filter(student=student)
    payloads: List[Dict[str, object]] = []

    for enrollment in enrollments:
        course = enrollment.course
        if not course:
            continue

        term_start = _normalise_term_start(getattr(course, "term_start_date", None))
        periods = sorted(set(_as_int_list(getattr(course, "periods", []))))
        weeks = sorted(set(_as_int_list(getattr(course, "weeks", []))))

        title = getattr(course, "title", None) or getattr(course, "code", None) or "Course"
        title_i18n = _course_title_i18n(title)

        payloads.append(
            {
                "enrollment_id": enrollment.id,
                "course_id": course.id,
                "student": student.id,
                "title": title_i18n.get('en', title),
                "title_i18n": dict(title_i18n),
                "code": getattr(course, "code", ""),
                "location": getattr(course, "location", ""),
                "weekday": getattr(course, "weekday", -1),
                "periods": periods,
                "weeks": weeks,
                "term_start_date": term_start.isoformat() if term_start else None,
                "term": getattr(course, "term", ""),
                "teacher_id": getattr(course, "teacher_id", ""),
                "campus_name": getattr(course, "campus_name", ""),
            }
        )

    return payloads


def student_has_time_conflict(student: StudentProfile, start: datetime, end: datetime) -> bool:
    for event in build_student_course_event_payloads(student):
        event_start = datetime.fromisoformat(str(event["start_datetime"]))
        event_end = datetime.fromisoformat(str(event["end_datetime"]))
        if event_start < end and event_end > start:
            return True
    return False