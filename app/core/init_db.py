import sys
from app.core.database import engine
from app.models import Base

def init_db():
    print("Mula mencipta jadual di database PostgreSQL...")
    try:
        # Arahan ini akan membaca metadata dari Base dan membina 
        # semua jadual yang kita daftar di app/models/__init__.py
        Base.metadata.create_all(bind=engine)
        print("Tahniah! Semua jadual database berjaya dicipta.")
    except Exception as e:
        print(f"Ralat semasa mencipta jadual: {e}", file=sys.stderr)

if __name__ == "__main__":
    init_db()