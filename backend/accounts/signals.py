from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StudentProfile


def _looks_like_student(username: str) -> bool:
    return username.isdigit() and len(username) >= 8


@receiver(post_save, sender=get_user_model())
def create_student_profile(sender, instance, created, **kwargs):
    if not created:
        return
    username = instance.username or ''
    if not _looks_like_student(username):
        return
    StudentProfile.objects.get_or_create(user=instance, defaults={'student_id': username})
