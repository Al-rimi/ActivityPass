from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Run migrations and seed initial student data from backend/accounts/seed_data/students.csv"

    def handle(self, *args, **options):
        call_command('migrate')
        try:
            call_command('seed_students')
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'seed_students failed: {e}'))
        # Ensure superuser 'admin' with default password exists (dev convenience)
        try:
            User = get_user_model()
            if not User.objects.filter(username='admin').exists():
                User.objects.create_superuser('admin', email='', password='000000')
                self.stdout.write(self.style.SUCCESS("Created admin user 'admin' with password 000000"))
        except Exception as e:
            self.stderr.write(self.style.WARNING(f'Could not ensure admin user: {e}'))
        self.stdout.write(self.style.SUCCESS('Initialization complete.'))
