from celery import Celery

# 1. Kekalkan URL asal (tanpa parameter di hujung)
celery_app = Celery(
    "ai_second_brain_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
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