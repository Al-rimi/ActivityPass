#!/usr/bin/env python
import os
import django
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ActivityPass.settings')
django.setup()

from accounts.models import StudentProfile, FacultyProfile

# Check for faculty users with StudentProfile
faculty_with_student = StudentProfile.objects.filter(user__faculty_profile__isnull=False)
print(f'Faculty users with StudentProfile: {faculty_with_student.count()}')
print("Sample faculty users with StudentProfile:")
for sp in faculty_with_student[:5]:
    print(f'User {sp.user.username}: StudentProfile.student_id={sp.student_id}, FacultyProfile.faculty_id={sp.user.faculty_profile.faculty_id}')

# Check if the IDs match
print("\nChecking if student_id matches faculty_id:")
for sp in faculty_with_student[:5]:
    student_id = str(sp.student_id) if sp.student_id else 'None'
    faculty_id = str(sp.user.faculty_profile.faculty_id) if sp.user.faculty_profile.faculty_id else 'None'
    match = student_id == faculty_id
    print(f'User {sp.user.username}: student_id={student_id}, faculty_id={faculty_id}, match={match}')