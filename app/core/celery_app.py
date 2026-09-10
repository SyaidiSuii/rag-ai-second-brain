from celery import Celery
from app.core.config import settings

# 1. URL broker dan backend daripada tetapan (menyokong Docker & lokal)
celery_app = Celery(
    "ai_second_brain_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# 2. Kemas kini konfigurasi tambahan
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kuala_Lumpur",
    enable_utc=True,
    imports=["app.tasks.ingestion_tasks"],
    
    # PAKSA PEMANDU REDIS PYTHON MENGGUNAKAN PROTOKOL RESP2 (Redis 5.0)
    broker_transport_options={
        "redis_client_kwargs": {
            "protocol": 2
        }
    },
    result_backend_transport_options={
        "redis_client_kwargs": {
            "protocol": 2
        }
    }
)