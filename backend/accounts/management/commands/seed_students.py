import csv
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

from accounts.models import StudentProfile
from accounts.utils import to_key, gender_key

DEFAULT_PASSWORD = os.getenv('DEFAULT_STUDENT_PASSWORD', '000000')
DEFAULT_PASSWORD_HASH = make_password(DEFAULT_PASSWORD)


def split_major_and_class(raw: str):
    raw = (raw or '').strip()
    if not raw:
        return '', ''
    idx = next((i for i, ch in enumerate(raw) if ch.isdigit()), len(raw))
    major = raw[:idx].strip()
    return major, raw


class Command(BaseCommand):
    help = "Seed students from backend/accounts/seed_data/students.csv. Default password '000000' for all."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='CSV file path (defaults to backend/accounts/seed_data/students.csv)')

    def handle(self, *args, **options):
        seed_dir = Path(__file__).resolve().parents[2] / 'seed_data'
        default_csv = seed_dir / 'students.csv'
        csv_path = Path(options['file']) if options['file'] else default_csv
        if not csv_path.exists():
            self.stderr.write(self.style.ERROR(f'CSV not found: {csv_path}'))
            return
        created = 0
        updated = 0
        with csv_path.open('r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for raw in reader:
                # Normalize keys and values (strip BOM/whitespace)
                row = { (k or '').strip().lstrip('\ufeff'): (v or '').strip() for k, v in raw.items() }
                sid = row.get('学号') or row.get('student_id') or row.get('SID')
                name = row.get('姓名') or row.get('name') or row.get('Name') or ''
                gender = row.get('性别') or row.get('gender') or ''
                class_name = row.get('班级') or row.get('class') or row.get('Class') or ''
                college = row.get('学院') or row.get('college') or row.get('College') or ''
                phone = row.get('手机号码') or row.get('phone') or ''
                if not sid:
                    continue
                major_label, class_label = split_major_and_class(class_name)
                major_key = to_key(major_label)
                class_key = to_key(class_label)
                college_key = to_key(college)
                gender_value = gender_key(gender)
                user_model = get_user_model()
                user, was_created = user_model.objects.get_or_create(username=str(sid))
                try:
                    year = int(str(sid)[:4])
                except Exception:
                    year = 1
                if was_created:
                    user.password = DEFAULT_PASSWORD_HASH
                    user.first_name = name
                    user.save(update_fields=['password', 'first_name'])
                    StudentProfile.objects.get_or_create(user=user, defaults={
                        'student_id': sid,
                        'year': year,
                        'class_name': class_key,
                        'major': major_key,
                        'college': college_key,
                        'gender': gender_value,
                        'phone': phone,
                    })
                    created += 1
                else:
                    # Skip password reset for existing users (avoid slow hashing)
                    sp, _ = StudentProfile.objects.get_or_create(user=user, defaults={
                        'student_id': sid,
                        'year': year,
                    })
                    # Update profile fields based on latest CSV
                    changed = False
                    if sp.student_id != sid:
                        sp.student_id = sid
                        changed = True
                    if sp.year != year:
                        sp.year = year
                        changed = True
                    if class_label and sp.class_name != class_key:
                        sp.class_name = class_key
                        changed = True
                    if major_label and sp.major != major_key:
                        sp.major = major_key
                        changed = True
                    if college_key and sp.college != college_key:
                        sp.college = college_key
                        changed = True
                    if gender and sp.gender != gender_value:
                        sp.gender = gender_value
                        changed = True
                    if phone and sp.phone != phone:
                        sp.phone = phone
                        changed = True
                    if changed:
                        sp.save()
                    if not user.first_name and name:
                        user.first_name = name
                        user.save()
                    updated += 1
        self.stdout.write(self.style.SUCCESS(f'Seeding done. created={created}, updated={updated}'))
