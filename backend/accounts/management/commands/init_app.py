from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Run migrations and seed initial student and course data"

    def handle(self, *args, **options):
        call_command('migrate')
        try:
            call_command('seed_users')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_users failed: {e}'))
        try:
            call_command('seed_students')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_students failed: {e}'))
        try:
            call_command('seed_courses')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_courses failed: {e}'))
        self.stdout.write(self.style.SUCCESS('Initialization complete.'))
