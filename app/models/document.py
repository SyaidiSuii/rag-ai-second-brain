import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Menghubungkan dokumen dengan projek
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # Cth: 'pdf', 'md', 'docx', 'zip'
    
    # Lokasi simpanan fail fizikal pada pelayan (VPS)
    storage_path = Column(String, nullable=False)
    
    # Status pemprosesan (RAG Ingestion): 'pending', 'processing', 'processed', 'failed'
    status = Column(String, nullable=False, default="pending")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Hubungan dengan projek
    project = relationship("Project")
    
    # Hubungan One-to-Many dengan serpihan embedding vektor
    embeddings = relationship("Embedding", back_populates="document", cascade="all, delete-orphan")


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Menghubungkan pecahan teks dengan dokumen asal
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    # Kandungan teks bagi pecahan kecil (chunk) tersebut
    chunk_content = Column(Text, nullable=False)
    
    # Ruang menyimpan data Vektor
    # 1536 ialah dimensi lalai bagi model benaman OpenAI (text-embedding-3-small / text-embedding-ada-002)
    # Jika anda guna model Ollama (cth: all-minilm bernilai 384 dimensi), anda boleh ubah nilai ini.
    vector = Column(Vector(1536), nullable=False)
    
    # Menyimpan maklumat tambahan (cth: nombor baris kod, nama fail asal)
    extra_metadata = Column(JSON, nullable=True)

    # Hubungan balik dengan Document
    document = relationship("Document", back_populates="embeddings")