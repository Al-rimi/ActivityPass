from django.core.management.base import BaseCommand
from accounts.models import StudentProfile, FacultyProfile


class Command(BaseCommand):
    help = "Remove StudentProfile objects from users who have FacultyProfile"

    def handle(self, *args, **options):
        # Find users with both StudentProfile and FacultyProfile
        faculty_with_student = StudentProfile.objects.filter(user__faculty_profile__isnull=False)
        
        count = faculty_with_student.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No faculty users with StudentProfile found.'))
            return
        
        self.stdout.write(f'Found {count} faculty users with StudentProfile objects.')
        
        # Delete the StudentProfile objects
        deleted_count = faculty_with_student.delete()[0]
        
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {deleted_count} StudentProfile objects from faculty users.'))