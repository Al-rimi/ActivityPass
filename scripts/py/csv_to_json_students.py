"""CSV to JSON students converter for database seeding

Automatically processes CSVs in the csv folder and appends unique students to
backend/accounts/seed_data/students.json
"""

import os
import sys
import csv
import json
import glob


# Country translations from Chinese to English
COUNTRY_TRANSLATIONS = {
    "加蓬": "Gabon",
    "几内亚": "Guinea",
    "喀麦隆": "Cameroon",
    "也门": "Yemen",
    "摩洛哥": "Morocco",
    "坦桑尼亚": "Tanzania",
    "利比里亚": "Liberia",
    "赤道几内亚": "Equatorial Guinea",
    "刚果(金)": "Democratic Republic of the Congo",
    "孟加拉国": "Bangladesh",
    "加纳": "Ghana",
    "叙利亚": "Syria",
    "土库曼斯坦": "Turkmenistan",
    "尼日利亚": "Nigeria",
    "南非": "South Africa",
    "阿尔及利亚": "Algeria",
    "捷克": "Czech Republic",
    "埃及": "Egypt",
    "布隆迪": "Burundi",
    "津巴布韦": "Zimbabwe",
    "马来西亚": "Malaysia",
    "索马里": "Somalia",
    "巴布亚新几内亚": "Papua New Guinea",
    "苏丹": "Sudan",
    "巴基斯坦": "Pakistan",
    "科摩罗": "Comoros",
    "委内瑞拉": "Venezuela",
    "埃塞俄比亚": "Ethiopia",
    "印度尼西亚": "Indonesia",
    "刚果(布)": "Republic of the Congo",
    "多米尼克": "Dominica",
    "俄罗斯": "Russia",
    "吉尔吉斯斯坦": "Kyrgyzstan",
    "塔吉克斯坦": "Tajikistan",
    "多哥": "Togo",
    "印度": "India",
    "乌兹别克斯坦": "Uzbekistan",
    "阿塞拜疆": "Azerbaijan",
    "毛里塔尼亚": "Mauritania",
    "伊拉克": "Iraq",
    "利比亚": "Libya",
    "蒙古": "Mongolia",
    "科特迪瓦": "Ivory Coast",
    "泰国": "Thailand",
    "约旦": "Jordan",
}

COLLEGE_MAPPING = {
    '软件工程': '计算机科学与技术学院',
    '计算机科学与技术': '计算机科学与技术学院',
    '国际经济与贸易': '国际经济与贸易学院',
    # Add more mappings as needed
}

COLLEGE_TRANSLATION = {
    '计算机科学与技术学院': 'School of Computer Science and Technology',
    '国际经济与贸易学院': 'School of International Economics and Trade',
    '初阳学院': 'Chu Yang College',
    '经管学院': 'School of Economics and Management',
    '法学院': 'Law School',
    '马克思学院': 'Marxism College',
    '教育学院': 'School of Education',
    '联合教育学院': 'Joint School of Education',
    '心理学院': 'School of Psychology',
    '儿童教育学院': 'School of Early Childhood Education',
    '体育学院': 'School of Physical Education',
    '人文学院': 'School of Humanities',
    '外语学院': 'School of Foreign Languages',
    '艺术学院': 'School of Arts',
    '设计学院': 'School of Design',
    '数学学院': 'School of Mathematics',
    '计算机学院': 'School of Computer Science',
    '数理医学院': 'School of Mathematics, Physics and Medicine',
    '物电学院': 'School of Physics and Electronics',
    '化材学院': 'School of Chemistry and Materials Science',
    '生命科学学院': 'School of Life Sciences',
    '地环学院': 'School of Earth and Environmental Sciences',
    '工学院': 'School of Engineering',
    '国社学院': 'School of National Society',
    '非洲学院': 'School of Africa Studies',
    '终身学院': 'Lifelong Education College',
    '杭州自动化学院': 'Hangzhou Automation College',
}

CHINESE_LEVEL_MAPPING = {
    '全英文班': 6,
    'HSK6': 6,
    'HSK5': 5,
    'HSK4': 4,
    'HSK3': 3,
    'HSK2': 2,
    'HSK1': 1,
    'CET6': 6,
    'CET4': 4,
    # Add more as needed
}

MAJOR_TRANSLATION = {
    '软件工程': 'Software Engineering',
    '计算机科学与技术': 'Computer Science and Technology',
    '国际经济与贸易': 'International Economics and Trade',
    # Add more as needed
}


def main() -> None:
    # Paths
    script_dir = os.path.dirname(__file__)
    csv_folder = os.path.join(script_dir, "..", "..", "reference", "csv")
    seed_file = os.path.join(script_dir, "..", "..", "backend", "accounts", "seed_data", "students.json")
    
    # Load existing students into a dict by ID
    existing_students = {}
    if os.path.exists(seed_file):
        with open(seed_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                for student in json.loads(content):
                    existing_students[student["id"]] = student
    
    # Find CSVs
    csv_files = glob.glob(os.path.join(csv_folder, "*.csv"))
    if not csv_files:
        print(f"No CSV files found in {csv_folder}")
        return
    
    # Collect all new students from CSVs
    new_students = {}
    for csv_path in csv_files:
        print(f"Processing: {csv_path}")
        try:
            with open(csv_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Map to student dict
                    class_full = row.get("班级", "").strip()
                    # Extract major and class number
                    # Assume class number is the last 4 digits
                    if class_full and class_full[-4:].isdigit():
                        major_raw = class_full[:-4].strip()
                        class_num = class_full[-4:]
                    else:
                        major_raw = class_full.strip()
                        class_num = ""
                    
                    # Parse major_raw into major, chinese_level
                    if '（' in major_raw:
                        major_part = major_raw.split('（')[0]
                        chinese_level_part = major_raw.split('（')[1].rstrip('）')
                    else:
                        major_part = major_raw
                        chinese_level_part = ''
                    
                    major = major_part.strip()
                    major = MAJOR_TRANSLATION.get(major, major)
                    chinese_level = CHINESE_LEVEL_MAPPING.get(chinese_level_part.strip(), 0)
                    college = COLLEGE_MAPPING.get(major_part, '')
                    college = COLLEGE_TRANSLATION.get(college, college)
                    
                    gender_raw = row.get("性别", "").strip()
                    # Translate gender
                    if gender_raw == "男":
                        gender = "male"
                    elif gender_raw == "女":
                        gender = "female"
                    else:
                        gender = gender_raw  # Keep as is if English or other
                    
                    student = {
                        "id": row.get("学号", "").strip(),
                        "name": row.get("姓名", "").strip(),
                        "gender": gender,
                        "major": major,
                        "chinese_level": chinese_level,
                        "college": college,
                        "class": class_num,
                        "phone": row.get("手机号码", "").strip(),
                        "country": COUNTRY_TRANSLATIONS.get(row.get("国籍", "").strip(), row.get("国籍", "").strip()),
                    }
                    # Skip if required fields are empty
                    if not student["id"] or not student["name"]:
                        continue
                    
                    id = student["id"]
                    if id in new_students:
                        # Merge with existing new
                        for key in student:
                            if not new_students[id].get(key) and student[key]:
                                new_students[id][key] = student[key]
                    else:
                        new_students[id] = student.copy()
        except Exception as e:
            print(f"Error processing {csv_path}: {e}")
            continue
    
    # Now merge new_students into existing_students
    total_new = 0
    total_merged = 0
    merged_ids = []
    for id, student in new_students.items():
        if id in existing_students:
            # Merge
            merged = False
            for key in student:
                if not existing_students[id].get(key) and student[key]:
                    existing_students[id][key] = student[key]
                    merged = True
            if merged:
                total_merged += 1
                merged_ids.append(id)
        else:
            existing_students[id] = student
            total_new += 1
    
    # Save updated students
    os.makedirs(os.path.dirname(seed_file), exist_ok=True)
    students_list = list(existing_students.values())
    students_list.sort(key=lambda s: int(s["id"]))
    with open(seed_file, "w", encoding="utf-8") as f:
        json.dump(students_list, f, ensure_ascii=False, indent=2)
    
    # Compute completeness stats
    total_students = len(students_list)
    complete_count = sum(1 for s in students_list if all(s.get(k) for k in ['id', 'name', 'gender', 'major', 'chinese_level', 'college', 'class', 'phone', 'country']))
    field_counts = {}
    for field in ['id', 'name', 'gender', 'major', 'chinese_level', 'college', 'class', 'phone', 'country']:
        field_counts[field] = sum(1 for s in students_list if s.get(field))
    
    print(f"Updated {seed_file} with {total_new} new students, merged {total_merged} existing.")
    if merged_ids:
        print(f"Merged IDs: {', '.join(merged_ids)}")
    print(f"Total students: {total_students}")
    print(f"Data completeness:")
    print(f"  Complete records (all fields): {complete_count}/{total_students}")
    for field, count in field_counts.items():
        print(f"  {field}: {count}/{total_students}")


if __name__ == "__main__":
    main()