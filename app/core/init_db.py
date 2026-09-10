import sys
from sqlalchemy import text
from app.core.database import engine
from app.models import Base

def init_db():
    print("Mula memeriksa dan mencipta sambungan database PostgreSQL...")
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
        Base.metadata.create_all(bind=engine)
        print("Tahniah! Semua jadual database & ekstensi pgvector sedia digunakan.")
    except Exception as e:
        print(f"Ralat semasa mencipta jadual: {e}", file=sys.stderr)

if __name__ == "__main__":
    init_db()