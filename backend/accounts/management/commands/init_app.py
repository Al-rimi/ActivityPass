from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Run migrations and seed initial student, faculty, and course data"

    def handle(self, *args, **options):
        call_command('migrate')
        try:
            call_command('seed_users')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_users failed: {e}'))
        try:
            call_command('seed_faculty')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_faculty failed: {e}'))
        try:
            call_command('seed_students')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_students failed: {e}'))
        # Clean up any faculty users that got StudentProfile objects
        try:
            call_command('clean_faculty_student_profiles')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'clean_faculty_student_profiles failed: {e}'))
        try:
            call_command('seed_courses', skip_existing=True)
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_courses failed: {e}'))
        try:
            call_command('seed_student_courses')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_student_courses failed: {e}'))
        self.stdout.write(self.style.SUCCESS('Initialization complete.'))
