"""CSV to JSON faculty converter for database seeding

Automatically processes faculty-and-staff-information-form.csv and appends unique faculty to
backend/accounts/seed_data/faculty.json
"""

import os
import sys
import csv
import json
import glob


def main() -> None:
    # Paths
    script_dir = os.path.dirname(__file__)
    csv_folder = os.path.join(script_dir, "..", "..", "reference", "csv")
    seed_file = os.path.join(script_dir, "..", "..", "backend", "accounts", "seed_data", "faculty.json")
    
    # Load existing faculty into a dict by ID
    existing_faculty = {}
    if os.path.exists(seed_file):
        with open(seed_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                for faculty in json.loads(content):
                    existing_faculty[faculty["id"]] = faculty
    
    # Find CSVs (assuming the faculty CSV is there)
    csv_files = glob.glob(os.path.join(csv_folder, "faculty-and-staff-information-form.csv"))
    if not csv_files:
        print(f"No faculty CSV files found in {csv_folder}")
        return
    
    # Collect all new faculty from CSVs
    new_faculty = {}
    for csv_path in csv_files:
        print(f"Processing: {csv_path}")
        try:
            with open(csv_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    faculty_id = row.get("教工号", "").strip()
                    if not faculty_id:
                        continue
                    
                    name = row.get("教师名称", "").strip()
                    if not name:
                        continue
                    
                    faculty_ids = [fid.strip() for fid in faculty_id.split(',') if fid.strip()]
                    names = [n.strip() for n in name.split(',') if n.strip()]
                    gender_raw = row.get("教师性别", "").strip()
                    genders_raw = [g.strip() for g in gender_raw.split(',') if g.strip()]
                    departments = [d.strip() for d in row.get("教师部门", "").strip().split(',') if d.strip()]
                    position_categories = [p.strip() for p in row.get("职务类别", "").strip().split(',') if p.strip()]
                    title_levels = [t.strip() for t in row.get("职称级别", "").strip().split(',') if t.strip()]
                    titles = [t.strip() for t in row.get("职称", "").strip().split(',') if t.strip()]
                    staff_categories = [s.strip() for s in row.get("教职工类别", "").strip().split(',') if s.strip()]
                    birth_dates = [b.strip() for b in row.get("教师出生日期", "").strip().split(',') if b.strip()]
                    is_externals = [e.strip() for e in row.get("是否外聘", "").strip().split(',') if e.strip()]
                    is_main_lecturers = [m.strip() for m in row.get("是否主讲", "").strip().split(',') if m.strip()]
                    
                    num = len(faculty_ids)
                    for i in range(num):
                        fid = faculty_ids[i] if i < len(faculty_ids) else ""
                        n = names[i] if i < len(names) else ""
                        g_raw = genders_raw[i] if i < len(genders_raw) else ""
                        g = "male" if g_raw == "男" else "female" if g_raw == "女" else g_raw
                        dep = departments[i] if i < len(departments) else ""
                        pos_cat = position_categories[i] if i < len(position_categories) else ""
                        tit_lev = title_levels[i] if i < len(title_levels) else ""
                        tit = titles[i] if i < len(titles) else ""
                        st_cat = staff_categories[i] if i < len(staff_categories) else ""
                        b_date = birth_dates[i] if i < len(birth_dates) else ""
                        is_ext = is_externals[i] if i < len(is_externals) else ""
                        is_main = is_main_lecturers[i] if i < len(is_main_lecturers) else ""
                        
                        faculty = {
                            "id": fid,
                            "name": n,
                            "department": dep,
                            "title": tit,
                            "gender": g,
                            "birth_date": b_date,
                            "position": pos_cat,
                            "title_level": tit_lev,
                            "staff_type": st_cat,
                            "is_external": is_ext,
                            "is_main_lecturer": is_main,
                        }
                        
                        if fid in new_faculty:
                            # Merge if needed
                            pass
                        else:
                            new_faculty[fid] = faculty
        except Exception as e:
            print(f"Error processing {csv_path}: {e}")
            continue
    
    # Merge new_faculty into existing_faculty
    total_new = 0
    for fid, faculty in new_faculty.items():
        if fid not in existing_faculty:
            existing_faculty[fid] = faculty
            total_new += 1
    
    # Save updated faculty
    os.makedirs(os.path.dirname(seed_file), exist_ok=True)
    faculty_list = list(existing_faculty.values())
    faculty_list.sort(key=lambda f: f["id"])
    with open(seed_file, "w", encoding="utf-8") as f:
        json.dump(faculty_list, f, ensure_ascii=False, indent=2, separators=(',', ':'))
    
    print(f"Updated {seed_file} with {total_new} new faculty.")
    print(f"Total faculty: {len(faculty_list)}")


if __name__ == "__main__":
    main()