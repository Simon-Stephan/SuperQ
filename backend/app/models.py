import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


class Thread(Base):
    __tablename__ = "threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    system_prompt = Column(Text, nullable=True)
    current_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relation (1, n) Thread -> Messages
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("threads.id"))
    role = Column(String)  # user, assistant, system
    content = Column(Text, nullable=False)
    model_name = Column(String, nullable=True)
    rating = Column(Integer, nullable=True, default=None)
    answer_of = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True, default=None)
    created_at = Column(DateTime, default=datetime.utcnow)

    thread = relationship("Thread", back_populates="messages")


class Model(Base):
    __tablename__ = "models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label = Column(String, nullable=False)
    description = Column(String, nullable=True)
    model = Column(String, nullable=False)
    is_free = Column(Boolean, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
