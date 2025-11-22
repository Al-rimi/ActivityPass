import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

DEFAULT_PASSWORD = os.getenv('DEFAULT_USER_PASSWORD', '000000')
DEFAULT_PASSWORD_HASH = make_password(DEFAULT_PASSWORD)


class Command(BaseCommand):
    help = "Seed default users: admin (superuser) and staff."

    def handle(self, *args, **options):
        User = get_user_model()

        # Create admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'password': DEFAULT_PASSWORD_HASH,
                'is_superuser': True,
                'is_staff': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created admin user 'admin' with password 000000"))
        else:
            self.stdout.write("Admin user 'admin' already exists")

        # Create staff user
        staff_user, created = User.objects.get_or_create(
            username='staff',
            defaults={
                'password': DEFAULT_PASSWORD_HASH,
                'is_staff': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created staff user 'staff' with password 000000"))
        else:
            self.stdout.write("Staff user 'staff' already exists")