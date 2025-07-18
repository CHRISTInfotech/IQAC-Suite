# Generated by Django 5.2.3 on 2025-07-19 04:27

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AcademicYear',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.CharField(max_length=10, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='CharacterStrength',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='GraduateAttribute',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='Role',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(choices=[('First Level', 'First Level Worker'), ('High Level', 'High Level Worker'), ('Medium Level', 'Medium Level Worker'), ('Low Level', 'Low Level Worker'), ('Attendee', 'Audience/Attendee')], max_length=50, unique=True)),
                ('factor', models.FloatField()),
            ],
        ),
        migrations.CreateModel(
            name='School',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('date', models.DateField()),
                ('attributes', models.ManyToManyField(to='transcript.graduateattribute')),
            ],
        ),
        migrations.CreateModel(
            name='AttributeStrengthMap',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('weight', models.FloatField()),
                ('character_strength', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='transcript.characterstrength')),
                ('graduate_attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='transcript.graduateattribute')),
            ],
        ),
        migrations.CreateModel(
            name='Course',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='transcript.school')),
            ],
            options={
                'unique_together': {('name', 'school')},
            },
        ),
        migrations.CreateModel(
            name='Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('roll_no', models.CharField(max_length=10, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('photo', models.ImageField(blank=True, null=True, upload_to='student_pics/')),
                ('academic_year', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='transcript.academicyear')),
                ('course', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='transcript.course')),
                ('school', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='transcript.school')),
            ],
        ),
        migrations.CreateModel(
            name='Participation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='transcript.event')),
                ('role', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='transcript.role')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='transcript.student')),
            ],
        ),
    ]
