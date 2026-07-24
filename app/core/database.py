from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# 1. Cipta engine database (Penyambung Utama)
# Ia menggunakan url daripada fail .env untuk bersambung ke Postgres
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Memeriksa kesihatan sambungan sebelum digunakan
    pool_size=10,        # Jumlah maksimum sambungan serentak yang disimpan
    max_overflow=20
)

# 2. Cipta SessionLocal (Kilang Sesi Sambungan)
# Setiap kali kita mahu baca/tulis data, kita akan cipta 'session' dari sini
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Base Class untuk Model
# Semua jadual/table database kita nanti akan inherit daripada Base ini
Base = declarative_base()

# 4. Fungsi get_db()
# Digunakan oleh FastAPI untuk buka sambungan database bila ada request API,
# dan tutup sambungan secara automatik setelah selesai (untuk jimat memori).
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()