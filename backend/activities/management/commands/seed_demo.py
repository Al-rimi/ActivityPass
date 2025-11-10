from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from activities.models import Activity


class Command(BaseCommand):
    help = "Create demo staff user and sample activities"

    def handle(self, *args, **options):
        User = get_user_model()
        staff_username = 'staff'
        staff_email = 'staff@example.com'
        if not User.objects.filter(username=staff_username).exists():
            user = User.objects.create_user(staff_username, staff_email, 'StaffPass123!')
            user.is_staff = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created staff user: {staff_username}/StaffPass123!"))
        else:
            self.stdout.write(self.style.NOTICE("Staff user already exists"))

        now = timezone.now()
        samples = [
            {
                'title': 'Campus Tour Volunteers',
                'description': 'Help welcome new students.',
                'start': now.replace(hour=9, minute=0),
                'end': now.replace(hour=11, minute=0),
            },
            {
                'title': 'Tech Talk: AI in Education',
                'description': 'Join the talk and assist with Q&A.',
                'start': now.replace(hour=14, minute=0),
                'end': now.replace(hour=16, minute=0),
            },
        ]

        staff = User.objects.filter(username=staff_username).first()
        created_count = 0
        for s in samples:
            obj, created = Activity.objects.get_or_create(
                title=s['title'],
                defaults=dict(
                    description=s['description'],
                    start_datetime=s['start'],
                    end_datetime=s['end'],
                    created_by=staff,
                )
            )
            created_count += int(created)
        self.stdout.write(self.style.SUCCESS(f"Seeded {created_count} activities"))
