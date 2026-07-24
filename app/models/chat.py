import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Menghubungkan sesi sembang dengan projek tertentu
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False, default="Sembang Baru")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Hubungan dengan projek
    project = relationship("Project")
    
    # Hubungan One-to-Many dengan table Message
    # cascade="all, delete-orphan" bermaksud jika sesi sembang dipadam, semua mesej di dalamnya turut terpadam
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Menghubungkan mesej dengan sesi sembang induknya
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    
    # Peranan mesej: 'user' (pengguna), 'assistant' (jawapan AI), atau 'system' (prompt arahan)
    role = Column(String, nullable=False)
    
    # Isi kandungan mesej sembang
    content = Column(Text, nullable=False)
    
    # Pengiraan token yang digunakan (untuk analisis kos/prestasi)
    tokens_used = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Hubungan balik dengan ChatSession
    session = relationship("ChatSession", back_populates="messages")