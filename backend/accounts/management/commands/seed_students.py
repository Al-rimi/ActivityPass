import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

from accounts.models import StudentProfile
from accounts.utils import to_key, gender_key

DEFAULT_PASSWORD = os.getenv('DEFAULT_STUDENT_PASSWORD', '000000')
DEFAULT_PASSWORD_HASH = make_password(DEFAULT_PASSWORD)


class Command(BaseCommand):
    help = "Seed students from backend/accounts/seed_data/students.json. Default password '000000' for all."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default=None, help='JSON file path (defaults to backend/accounts/seed_data/students.json)')

    def handle(self, *args, **options):
        seed_dir = Path(__file__).resolve().parents[2] / 'seed_data'
        default_json = seed_dir / 'students.json'
        json_path = Path(options['file']) if options['file'] else default_json
        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'JSON not found: {json_path}'))
            return
        created = 0
        updated = 0
        with json_path.open('r', encoding='utf-8') as f:
            students = json.load(f)
        for student in students:
            sid = student.get('id')
            name = student.get('name', '')
            gender = student.get('gender', '')
            major = student.get('major', '')
            chinese_level = student.get('chinese_level', 0)
            college = student.get('college', '')
            class_name = student.get('class', '')
            phone = student.get('phone', '')
            country = student.get('country', '')
            if not sid:
                continue
            class_key = to_key(class_name)
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
                profile, profile_created = StudentProfile.objects.get_or_create(user=user, defaults={
                    'student_id': sid,
                    'year': year,
                    'class_name': class_key,
                    'major': major,
                    'college': college,
                    'chinese_level': chinese_level,
                    'gender': gender_value,
                    'phone': phone,
                    'country': country,
                })
                if not profile_created:
                    # Update existing profile
                    profile.student_id = sid
                    profile.year = year
                    profile.class_name = class_key
                    profile.major = major
                    profile.college = college
                    profile.chinese_level = chinese_level
                    profile.gender = gender_value
                    profile.phone = phone
                    profile.country = country
                    profile.save()
                created += 1
                self.stdout.write(f"Created student: {sid} - {name} (major: {major}, college: {college}, chinese_level: {chinese_level}, class: {class_name}, gender: {gender}, phone: {phone}, country: {country})")
            else:
                # Skip password reset for existing users (avoid slow hashing)
                sp, _ = StudentProfile.objects.get_or_create(user=user, defaults={
                    'student_id': sid,
                    'year': year,
                })
                # Update profile fields based on latest JSON
                changed = False
                if sp.student_id != sid:
                    sp.student_id = sid
                    changed = True
                if sp.year != year:
                    sp.year = year
                    changed = True
                if class_name and sp.class_name != class_key:
                    sp.class_name = class_key
                    changed = True
                if major and sp.major != major:
                    sp.major = major
                    changed = True
                if college and sp.college != college:
                    sp.college = college
                    changed = True
                if sp.chinese_level != chinese_level:
                    sp.chinese_level = chinese_level
                    changed = True
                if gender and sp.gender != gender_value:
                    sp.gender = gender_value
                    changed = True
                if phone and sp.phone != phone:
                    sp.phone = phone
                    changed = True
                if country != sp.country:
                    sp.country = country
                    changed = True
                if changed:
                    sp.save()
                    updated += 1
                    self.stdout.write(f"Updated student: {sid} - {name}")
                if not user.first_name and name:
                    user.first_name = name
                    user.save()
                    updated += 1
                    self.stdout.write(f"Updated student name: {sid} - {name}")

        self.stdout.write(self.style.SUCCESS(f'Seeding students done. Created: {created}, Updated: {updated}'))
