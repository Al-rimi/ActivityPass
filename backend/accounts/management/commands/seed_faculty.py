import json
import os
from pathlib import Path
from datetime import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

from accounts.models import FacultyProfile
from accounts.utils import to_key, gender_key

DEFAULT_PASSWORD = os.getenv('DEFAULT_FACULTY_PASSWORD', '000000')
DEFAULT_PASSWORD_HASH = make_password(DEFAULT_PASSWORD)


class Command(BaseCommand):
    help = "Seed faculty from backend/accounts/seed_data/faculty.json. Default password '000000' for all."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='JSON file path (defaults to backend/accounts/seed_data/faculty.json)')

    def handle(self, *args, **options):
        seed_dir = Path(__file__).resolve().parents[2] / 'seed_data'
        default_json = seed_dir / 'faculty.json'
        json_path = Path(options['file']) if options['file'] else default_json
        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'JSON not found: {json_path}'))
            return
        created = 0
        updated = 0
        with json_path.open('r', encoding='utf-8') as f:
            faculty_list = json.load(f)
        for faculty in faculty_list:
            fid = faculty.get('id')
            name = faculty.get('name', '')
            gender = faculty.get('gender', '')
            department = faculty.get('department', '')
            position = faculty.get('position', '')
            title_level = faculty.get('title_level', '')
            title = faculty.get('title', '')
            staff_type = faculty.get('staff_type', '')
            birth_date = faculty.get('birth_date', '')
            # Parse birth_date or set to None if invalid
            parsed_birth_date = None
            if birth_date and birth_date != '无':
                try:
                    parsed_birth_date = datetime.strptime(birth_date, '%Y-%m-%d').date()
                except ValueError:
                    parsed_birth_date = None
            is_external = faculty.get('is_external', '')
            is_main_lecturer = faculty.get('is_main_lecturer', '')
            if not fid:
                continue
            gender_value = gender_key(gender)
            user_model = get_user_model()
            user, was_created = user_model.objects.get_or_create(username=str(fid))
            if was_created:
                user.password = DEFAULT_PASSWORD_HASH
                user.first_name = name
                user.save(update_fields=['password', 'first_name'])
                profile, profile_created = FacultyProfile.objects.get_or_create(user=user, defaults={
                    'faculty_id': fid,
                    'name': name,
                    'gender': gender_value,
                    'department': department,
                    'position': position,
                    'title_level': title_level,
                    'title': title,
                    'staff_type': staff_type,
                    'birth_date': parsed_birth_date,
                    'is_external': is_external.lower() in ('是', 'yes', 'true'),
                    'is_main_lecturer': is_main_lecturer.lower() in ('主讲', 'yes', 'true'),
                })
                if not profile_created:
                    # Update existing profile
                    profile.faculty_id = fid
                    profile.name = name
                    profile.gender = gender_value
                    profile.department = department
                    profile.position = position
                    profile.title_level = title_level
                    profile.title = title
                    profile.staff_type = staff_type
                    profile.birth_date = parsed_birth_date
                    profile.is_external = is_external.lower() in ('是', 'yes', 'true')
                    profile.is_main_lecturer = is_main_lecturer.lower() in ('主讲', 'yes', 'true')
                    profile.save()
                created += 1
                self.stdout.write(f"Created faculty: {fid} - {name} (department: {department}, title: {title})")
            else:
                # Skip password reset for existing users (avoid slow hashing)
                fp, _ = FacultyProfile.objects.get_or_create(user=user, defaults={
                    'faculty_id': fid,
                })
                # Update profile fields based on latest JSON
                changed = False
                if fp.faculty_id != fid:
                    fp.faculty_id = fid
                    changed = True
                if name and fp.name != name:
                    fp.name = name
                    changed = True
                if gender and fp.gender != gender_value:
                    fp.gender = gender_value
                    changed = True
                if department and fp.department != department:
                    fp.department = department
                    changed = True
                if position and fp.position != position:
                    fp.position = position
                    changed = True
                if title_level and fp.title_level != title_level:
                    fp.title_level = title_level
                    changed = True
                if title and fp.title != title:
                    fp.title = title
                    changed = True
                if staff_type and fp.staff_type != staff_type:
                    fp.staff_type = staff_type
                    changed = True
                if parsed_birth_date != fp.birth_date:
                    fp.birth_date = parsed_birth_date
                    changed = True
                if fp.is_external != (is_external.lower() in ('是', 'yes', 'true')):
                    fp.is_external = is_external.lower() in ('是', 'yes', 'true')
                    changed = True
                if fp.is_main_lecturer != (is_main_lecturer.lower() in ('主讲', 'yes', 'true')):
                    fp.is_main_lecturer = is_main_lecturer.lower() in ('主讲', 'yes', 'true')
                    changed = True
                if changed:
                    fp.save()
                    updated += 1
                    self.stdout.write(f"Updated faculty: {fid} - {name}")
                if not user.first_name and name:
                    user.first_name = name
                    user.save()
                    updated += 1
                    self.stdout.write(f"Updated faculty name: {fid} - {name}")

        self.stdout.write(self.style.SUCCESS(f'Seeding faculty done. Created: {created}, Updated: {updated}'))
