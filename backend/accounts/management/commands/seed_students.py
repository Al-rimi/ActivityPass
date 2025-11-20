import csv
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import StudentProfile


class Command(BaseCommand):
    help = "Seed students from data/cst.csv. Default password '000000' for all."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='CSV file path (defaults to ../../data/cst.csv)')

    def handle(self, *args, **options):
        proj_root = Path(__file__).resolve().parents[4]
        default_csv = proj_root / 'data' / 'cst.csv'
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
                phone = row.get('手机号码') or row.get('phone') or ''
                if not sid:
                    continue
                user_model = get_user_model()
                user, was_created = user_model.objects.get_or_create(username=str(sid))
                try:
                    year = int(str(sid)[:4])
                except Exception:
                    year = 1
                if was_created:
                    user.set_password('000000')
                    user.first_name = name
                    user.save()
                    StudentProfile.objects.get_or_create(user=user, defaults={
                        'year': year,
                        'class_name': class_name,
                        'gender': gender,
                        'phone': phone,
                    })
                    created += 1
                else:
                    # Skip password reset for existing users (avoid slow hashing)
                    sp, _ = StudentProfile.objects.get_or_create(user=user, defaults={
                        'year': year,
                        'class_name': class_name,
                        'gender': gender,
                        'phone': phone,
                    })
                    # Update profile fields only if empty
                    changed = False
                    if not sp.year:
                        sp.year = year
                        changed = True
                    if not sp.class_name and class_name:
                        sp.class_name = class_name
                        changed = True
                    if not sp.gender and gender:
                        sp.gender = gender
                        changed = True
                    if not sp.phone and phone:
                        sp.phone = phone
                        changed = True
                    if changed:
                        sp.save()
                    if not user.first_name and name:
                        user.first_name = name
                        user.save()
                    updated += 1
        self.stdout.write(self.style.SUCCESS(f'Seeding done. created={created}, updated={updated}'))
