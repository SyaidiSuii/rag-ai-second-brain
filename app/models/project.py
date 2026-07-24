import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func 
from sqlalchemy.dialects.postgresql import UUID 
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String, nullable=False)

    create_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User")

    llm_config = relationship("LLMConfig", back_populates="project", uselist=False, cascade="all, delete-orphan")

class LLMConfig(Base):

    __tablename__ = "llm_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)

    provider_type = Column(String, nullable=False, default="openai")

    base_url = Column(String, nullable=False, default="https://api.openai.com/v1")

    api_key = Column(String, nullable=True)

    model_name = Column(String, nullable=False, default="gpt-4o")

    project = relationship("Project", back_populates="llm_config")
