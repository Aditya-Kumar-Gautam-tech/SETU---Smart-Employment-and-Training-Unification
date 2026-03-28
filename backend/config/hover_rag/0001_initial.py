"""
rag/migrations/0001_initial.py
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ResumeChunk",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user_id",    models.CharField(db_index=True, max_length=255)),
                ("chunk_id",   models.CharField(max_length=64)),
                ("content",    models.TextField()),
                ("meta",       models.JSONField(default=dict)),
                ("embedding",  models.JSONField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering"  : ["chunk_id"],
                "app_label" : "rag",
            },
        ),
        migrations.AddIndex(
            model_name="resumechunk",
            index=models.Index(fields=["user_id"], name="rag_resumec_user_id_idx"),
        ),
    ]
