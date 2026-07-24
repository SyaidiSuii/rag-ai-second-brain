import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    # Kita guna UUID sebagai Primary Key untuk keselamatan berbanding ID nombor biasa
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # E-mel pengguna (wajib unik dan di-index untuk carian laju)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # Kata laluan yang telah di-hash (jangan sesekali simpan password teks biasa!)
    password_hash = Column(String, nullable=False)
    
    # Waktu pendaftaran pengguna
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)