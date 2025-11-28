import os
import sys
import csv
import json
import glob
import re


def parse_class_time(class_time_str):
    """Parse class time string to extract day_of_week, periods, week_pattern"""
    if not class_time_str.strip():
        return 0, [], []
    
    # Split by ; for multiple slots
    slots = class_time_str.split(';')
    all_periods = set()
    all_weeks = set()
    day_of_week = 0
    
    day_map = {
        '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7
    }
    
    for slot in slots:
        slot = slot.strip()
        if not slot:
            continue
        
        # Match like 星期三第6-9节{2-8周,10-12周,14-16周}
        match = re.match(r'星期([一二三四五六日])第(\d+)-(\d+)节\{([^}]+)\}', slot)
        if match:
            day_ch = match.group(1)
            start_period = int(match.group(2))
            end_period = int(match.group(3))
            weeks_str = match.group(4)
            
            day_of_week = day_map.get(f'星期{day_ch}', 0)
            periods = list(range(start_period, end_period + 1))
            all_periods.update(periods)
            
            # Parse weeks: 2-8周,10-12周,14-16周
            week_parts = weeks_str.split(',')
            for part in week_parts:
                part = part.strip()
                # Remove (双) or (单)
                part = re.sub(r'\(.\)', '', part).strip()
                if '-' in part:
                    start, end = part.split('-')
                    start = int(start.strip())
                    end = int(end.strip().rstrip('周'))
                    all_weeks.update(range(start, end + 1))
                else:
                    wk = int(part.strip().rstrip('周'))
                    all_weeks.add(wk)
    
    if day_of_week == 0:
        day_of_week = -1
    
    return day_of_week, sorted(list(all_periods)), sorted(list(all_weeks))


def main() -> None:
    # Paths
    script_dir = os.path.dirname(__file__)
    csv_folder = os.path.join(script_dir, "..", "..", "reference", "csv")
    seed_file = os.path.join(script_dir, "..", "..", "backend", "accounts", "seed_data", "courses.json")
    
    # Find CSVs - look for faculty CSV which contains course data
    csv_files = glob.glob(os.path.join(csv_folder, "faculty-and-staff-information-form.csv"))
    if not csv_files:
        print(f"No faculty CSV files found in {csv_folder}")
        return
    
    # Collect courses
    courses = {}
    for csv_path in csv_files:
        print(f"Processing: {csv_path}")
        try:
            with open(csv_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    course_code = row.get("课程代码", "").strip()
                    if not course_code:
                        continue
                    
                    title = row.get("课程名称", "").strip()
                    if not title:
                        continue
                    
                    faculty_id = row.get("教工号", "").strip()
                    if not faculty_id:
                        continue
                    
                    # Extract course-specific information from this row
                    term = f"{row.get('学年', '').strip()}-{row.get('学期', '').strip()}"
                    location = row.get("教学地点", "").strip()
                    course_category = row.get("课程类别", "").strip()
                    course_nature = row.get("课程性质", "").strip()
                    teaching_mode = row.get("上课方式", "").strip()
                    exam_type = row.get("考试形式", "").strip()
                    grading_method = row.get("考核方式", "").strip()
                    credits = row.get("学分", "").strip()
                    department_name = row.get("开课学院", "").strip()
                    campus_name = row.get("校区", "").strip()
                    hours_per_week = row.get("周学时", "").strip()
                    total_course_hours = row.get("课程总学时", "").strip()
                    enrolled_students = row.get("选课人数", "").strip()
                    class_students = row.get("教学班人数", "").strip()
                    capacity = row.get("教学班容量", "").strip()
                    majors = row.get("专业组成", "").strip()
                    grades = row.get("年级组成", "").strip()
                    audience = row.get("面向对象", "").strip()
                    course_type_detail = row.get("课程类型", "").strip()
                    
                    class_time = row.get("上课时间", "").strip()
                    day_of_week, periods, week_pattern = parse_class_time(class_time)
                    
                    # Handle online courses without specific location
                    if not periods and not week_pattern and not location:
                        location = "qq群号：1039827290"
                        day_of_week = -1
                    
                    first_week_monday = "2025-09-08"  # TODO: calculate based on academic year
                    
                    # Handle multiple faculty IDs (comma-separated)
                    faculty_ids = [fid.strip() for fid in faculty_id.split(',') if fid.strip()]
                    
                    for fid in faculty_ids:
                        course_key = f"{course_code}-{fid}"
                        
                        if course_key not in courses:
                            courses[course_key] = {
                                "code": course_code,
                                "title": title,
                                "teacher_id": fid,
                                "weekday": day_of_week,
                                "periods": periods,
                                "weeks": week_pattern,
                                "location": location,
                                "term": term,
                                "term_start_date": first_week_monday,
                                "credits": credits,
                                "department_name": department_name,
                                "category": course_category,
                                "nature": course_nature,
                                "teaching_mode": teaching_mode,
                                "exam_type": exam_type,
                                "grading_method": grading_method,
                                "hours_per_week": hours_per_week,
                                "total_course_hours": total_course_hours,
                                "enrolled_students": enrolled_students,
                                "class_students": class_students,
                                "capacity": capacity,
                                "campus_name": campus_name,
                                "majors": majors,
                                "grades": grades,
                                "audience": audience,
                                "course_type_detail": course_type_detail,
                            }
        except Exception as e:
            print(f"Error processing {csv_path}: {e}")
            continue
    
    # Save courses
    os.makedirs(os.path.dirname(seed_file), exist_ok=True)
    course_list = list(courses.values())
    course_list.sort(key=lambda c: c["code"])
    content = json.dumps(course_list, ensure_ascii=False, indent=2, separators=(',', ':'))
    # Make arrays compact on one line
    content = re.sub(r'\[\s*(\d+(?:,\s*\d+)*)\s*\]', lambda m: '[' + re.sub(r'\s+', '', m.group(1)) + ']', content)
    with open(seed_file, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"Generated {seed_file} with {len(course_list)} courses.")


if __name__ == "__main__":
    main()