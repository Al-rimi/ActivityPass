from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_studentprofile_drop_i18n_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='accountmeta',
            name='staff_number',
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
