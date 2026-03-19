from celery import Celery
from app.config import settings


broker_url = settings.CELERY_BROKER_URL or settings.REDIS_URL
result_backend = settings.CELERY_RESULT_BACKEND or settings.REDIS_URL
celery_app = Celery("cropgear", broker=broker_url, backend=result_backend)
celery_app.conf.update(task_serializer="json", accept_content=["json"], result_serializer="json", timezone="UTC", enable_utc=True)
celery_app.autodiscover_tasks(["app.tasks"])
